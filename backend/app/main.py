"""API Brightline com PostgreSQL local; arquivos binários também ficam no banco."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac, sha256
import hmac
import os
import sys
import re
import secrets
import logging
import time
from uuid import uuid4
from pathlib import Path
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from fastapi import File, Form, UploadFile, Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
from pypdf import PdfReader
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from . import report_analysis
from .reclassification import worker as reclassification_worker, WorkerBusy

logger = logging.getLogger("uvicorn.error")

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from extract import extract_one  # noqa: E402 - reuses Brightline's validated extraction pipeline
from .institutions import INSTITUTIONS, INSTITUTION_IDS, INSTITUTION_NAMES, link_user_institutions
from .models import (AcknowledgeInput, ActionInput, ActiveInstitutionInput, ImportInput,
                     InstitutionSelection, LoginInput, RefreshInput, ReportRecordInput, SignupInput, Status, Urgency)


def db():
    return psycopg.connect(get_settings().database_url, row_factory=dict_row,
                          connect_timeout=5, options="-c statement_timeout=10000 -c lock_timeout=3000")


def token_hash(value):
    return sha256(value.encode()).hexdigest()


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password, encoded):
    try:
        salt, _ = encoded.split("$", 1)
        return hmac.compare_digest(password_hash(password, bytes.fromhex(salt)), encoded)
    except (ValueError, TypeError):
        return False


def issue_session(conn, user, institution_id):
    access, refresh = secrets.token_urlsafe(40), secrets.token_urlsafe(48)
    conn.execute("INSERT INTO sessions(user_id, access_hash, refresh_hash, expires_at, active_institution_id) VALUES (%s,%s,%s,%s,%s)",
                 (user["id"], token_hash(access), token_hash(refresh), datetime.now(timezone.utc)+timedelta(hours=1), institution_id))
    institutions = user.get("institutions") or []
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "expires_in": 3600,
            "user": {"id": str(user["id"]), "email": user["email"], "name": user["name"],
                     "institutions": institutions, "active_institution_id": institution_id,
                     "active_institution_name": INSTITUTION_NAMES.get(institution_id),
                     "view_all_reports": bool(user.get("view_all_reports"))}}


bearer = HTTPBearer(auto_error=False)


def authenticated(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Informe um access_token válido.", headers={
                            "WWW-Authenticate": "Bearer"})
    with db() as conn:
        row = conn.execute("""SELECT u.id,u.email,u.name,u.institutions,u.view_all_reports,s.access_hash,s.active_institution_id FROM sessions s JOIN users u ON u.id=s.user_id
            WHERE s.access_hash=%s AND s.expires_at>now()""", (token_hash(credentials.credentials),)).fetchone()
    if not row:
        raise HTTPException(401, "Sessão inválida ou expirada.")
    return {"token": credentials.credentials, "user": {"id": str(row["id"]), "email": row["email"], "name": row["name"],
            "institutions": row["institutions"] or [], "active_institution_id": row["active_institution_id"],
            "active_institution_name": INSTITUTION_NAMES.get(row["active_institution_id"]),
            "view_all_reports": bool(row["view_all_reports"])}}


Session = Annotated[dict, Depends(authenticated)]


def active_institution(session):
    institution_id = session["user"].get("active_institution_id")
    if not institution_id:
        raise HTTPException(409, "Escolha uma instituição vinculada para acessar os dados.")
    if institution_id not in session["user"].get("institutions", []):
        raise HTTPException(403, "Sua sessão não possui vínculo com a instituição ativa.")
    return institution_id


def sees_every_report(session):
    return bool(session["user"].get("view_all_reports"))


@asynccontextmanager
async def lifespan(app):
    settings = get_settings()
    # O init.sql é executado pelo container Postgres; aqui apenas validamos conexão.
    with psycopg.connect(settings.database_url) as conn:
        conn.execute("SELECT 1")
    yield


app = FastAPI(title="Brightline API", version="1.0.0",
              description="API local com PostgreSQL e armazenamento privado de arquivos no banco.", lifespan=lifespan)
try:
    origins = get_settings().cors_origins
except ValueError:
    origins = ("http://localhost:5173", "http://127.0.0.1:5173")
app.add_middleware(CORSMiddleware, allow_origins=list(origins), allow_credentials=False,
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"])


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]})


@app.exception_handler(psycopg.Error)
async def database_error(request, exc):
    logger.error("[RECLASSIFY] stage=database_failed exception=%s elapsed=%.3f", type(exc).__name__,
                 time.monotonic() - getattr(request.state, "started", time.monotonic()))
    detail = ("Banco desatualizado: aplique as migrações do backend."
              if isinstance(exc, psycopg.errors.InvalidColumnReference)
              else "Banco temporariamente indisponível. Tente novamente.")
    return JSONResponse(status_code=503, content={"detail": detail})


@app.middleware("http")
async def no_store_auth(request: Request, call_next):
    request.state.started = time.monotonic()
    response = await call_next(request)
    if request.url.path.endswith("/reclassify"):
        logger.info("[RECLASSIFY] stage=response_sent status=%d elapsed=%.3f",
                    response.status_code, time.monotonic() - request.state.started)
    if request.url.path.startswith("/auth") or request.headers.get("authorization"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "provider": "local-postgres"}


@app.get("/ready")
async def ready(session: Session):
    institution = active_institution(session)
    with db() as conn:
        conn.execute("SELECT 1 FROM sim_state WHERE owner_id=%s AND institution_id=%s",
                     (session["user"]["id"], institution)).fetchone()
    return {"status": "ok", "database": "postgresql"}


def _valid_dataset_filename(filename: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9_.-]{1,128}\.(?:png|jpe?g)", filename, re.IGNORECASE))


@app.get("/dataset/images", summary="Lista radiografias NIH ChestX-ray14")
async def list_dataset_images(
    session: Session,
    offset: Annotated[int, Query(ge=0, le=1_000_000)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 24,
    dataset: Annotated[str, Query(max_length=40)] = "nih-chestxray14",
    pathology: Annotated[str | None, Query(max_length=80)] = None,
    classification: Annotated[str | None, Query(max_length=80)] = None,
    patient_id: Annotated[str | None, Query(max_length=32)] = None,
):
    """Browse metadata in PostgreSQL. NIH labels are dataset annotations; classification filters saved model outputs."""
    if dataset != "nih-chestxray14":
        raise HTTPException(422, "Dataset não suportado. Use nih-chestxray14.")
    if pathology and classification:
        raise HTTPException(422, "Use pathology ou classification, não ambos.")
    if pathology is not None and pathology.strip() not in {*report_analysis.LABELS, "No Finding"}:
        raise HTTPException(422, "Patologia NIH desconhecida.")
    if classification is not None and classification.strip() not in report_analysis.LABELS:
        raise HTTPException(422, "Classe de previsão desconhecida.")
    if patient_id and not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", patient_id):
        raise HTTPException(422, "patient_id inválido.")
    institution = active_institution(session)
    conditions, params = [], []
    if pathology:
        conditions.append("%s = ANY(d.finding_labels)")
        params.append(pathology.strip())
    if patient_id:
        conditions.append("d.patient_id=%s")
        params.append(patient_id)
    if classification:
        conditions.append("EXISTS (SELECT 1 FROM dataset_image_analyses a WHERE a.owner_id=%s AND a.institution_id=%s AND a.filename=d.filename AND a.analysis->'predictions' ? %s)")
        params.extend((session["user"]["id"], institution, classification.strip()))
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    with db() as conn:
        total = conn.execute("SELECT count(*) AS total FROM dataset_images d" + where, params).fetchone()["total"]
        rows = conn.execute("""SELECT d.filename,d.patient_id,d.finding_labels,d.sha256,d.imported_at,
            a.model_version,a.created_at AS analysis_created_at
            FROM dataset_images d LEFT JOIN dataset_image_analyses a
            ON a.filename=d.filename AND a.owner_id=%s AND a.institution_id=%s""" + where +
            " ORDER BY d.filename LIMIT %s OFFSET %s",
            [session["user"]["id"], institution, *params, limit, offset]).fetchall()
    items = [{"id": row["filename"], "dataset": "nih-chestxray14", "patient_id": row["patient_id"],
              "finding_labels": row["finding_labels"], "sha256": row["sha256"],
              "imported_at": row["imported_at"].isoformat() if row["imported_at"] else None,
              "has_analysis": row["model_version"] is not None,
              "analysis_created_at": row["analysis_created_at"].isoformat() if row["analysis_created_at"] else None,
              "image_url": f"/dataset/images/{quote(row['filename'], safe='')}/signed-url"} for row in rows]
    return {"items": items, "pagination": {"offset": offset, "limit": limit, "total": total,
            "next_offset": offset + limit if offset + limit < total else None}}


@app.get("/dataset/images/{filename}", summary="Obtém metadados de uma radiografia NIH")
async def get_dataset_image(filename: str, session: Session):
    if not _valid_dataset_filename(filename):
        raise HTTPException(404, "Imagem não encontrada.")
    institution = active_institution(session)
    with db() as conn:
        row = conn.execute("""SELECT filename,patient_id,finding_labels,sha256,imported_at
            FROM dataset_images WHERE filename=%s""", (filename,)).fetchone()
        analysis = conn.execute("""SELECT model_version,created_at FROM dataset_image_analyses
            WHERE owner_id=%s AND institution_id=%s AND filename=%s""", (session["user"]["id"], institution, filename)).fetchone()
    if not row:
        raise HTTPException(404, "Imagem não encontrada.")
    return {"id": row["filename"], "dataset": "nih-chestxray14", "patient_id": row["patient_id"],
            "finding_labels": row["finding_labels"], "sha256": row["sha256"],
            "imported_at": row["imported_at"].isoformat() if row["imported_at"] else None,
            "has_analysis": bool(analysis),
            "analysis_created_at": analysis["created_at"].isoformat() if analysis else None,
            "image_url": f"/dataset/images/{quote(filename, safe='')}/signed-url"}


@app.post("/dataset/images/{filename}/signed-url", summary="Emite URL temporária para uma imagem NIH")
async def dataset_image_signed_url(filename: str, session: Session):
    if not _valid_dataset_filename(filename):
        raise HTTPException(404, "Imagem não encontrada.")
    active_institution(session)
    expires = int(datetime.now(timezone.utc).timestamp()) + 60
    ticket = secrets.token_urlsafe(32)
    with db() as conn:
        conn.execute("DELETE FROM dataset_image_links WHERE expires_at<=now()")
        exists = conn.execute("SELECT 1 FROM dataset_images WHERE filename=%s", (filename,)).fetchone()
        if not exists:
            raise HTTPException(404, "Imagem não encontrada.")
        conn.execute("INSERT INTO dataset_image_links(token_hash,filename,expires_at) VALUES (%s,%s,to_timestamp(%s))",
                     (token_hash(ticket), filename, expires))
    url = f"/dataset/images/{quote(filename, safe='')}/content?token={quote(ticket)}"
    return {"url": url, "expires_in": 60}


@app.get("/dataset/images/{filename}/content", summary="Entrega conteúdo de uma URL temporária")
async def dataset_image_content(filename: str, token: str):
    if not _valid_dataset_filename(filename) or len(token) > 256:
        raise HTTPException(404, "Imagem não encontrada.")
    with db() as conn:
        row = conn.execute("""SELECT d.content,d.filename FROM dataset_image_links l
            JOIN dataset_images d USING(filename)
            WHERE l.token_hash=%s AND l.filename=%s AND l.expires_at>now()""",
            (token_hash(token), filename)).fetchone()
    if not row:
        raise HTTPException(404, "Imagem não encontrada ou link expirado.")
    mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
    return Response(content=bytes(row["content"]), media_type=mime,
                    headers={"Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff"})


@app.post("/dataset/images/{filename}/classify", summary="Classifica e persiste análise de imagem NIH")
async def classify_dataset_image(filename: str, session: Session):
    if not _valid_dataset_filename(filename):
        raise HTTPException(404, "Imagem não encontrada.")
    institution = active_institution(session)
    with db() as conn:
        row = conn.execute("SELECT content FROM dataset_images WHERE filename=%s", (filename,)).fetchone()
    if not row:
        raise HTTPException(404, "Imagem não encontrada.")
    if len(row["content"]) > report_analysis.MAX_IMAGE_BYTES:
        raise HTTPException(413, "Radiografia acima do limite de 10 MB.")
    try:
        probabilities, model_version, localizations, heatmap = await run_in_threadpool(
            report_analysis.infer, bytes(row["content"]), include_localizations=True)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except (ImportError, OSError, RuntimeError):
        raise HTTPException(503, "Serviço do modelo TorchXRayVision indisponível.") from None
    threshold = report_analysis.EXPLORATORY_THRESHOLD
    analysis = {"image_id": filename, "dataset": "nih-chestxray14", "probabilities": probabilities,
                "predictions": sorted(label for label, score in probabilities.items() if score >= threshold),
                "threshold": threshold, "threshold_status": "exploratory_unvalidated", "model_version": model_version,
                "model_metadata": report_analysis.model_metadata(), "status": "review_required",
                "localization_method": "gradcam", "localization_status": "estimated" if localizations else "unavailable",
                "markers": localizations, "heatmap": heatmap,
                "localization_note": "Mapas Grad-CAM são estimativas de relevância do classificador, não detecções confirmadas.",
                "human_review_required": True,
                "limitations": ["Probabilidades e corte não foram validados nem calibrados para uso clínico.",
                                "Resultado experimental; não é diagnóstico e requer revisão profissional."]}
    with db() as conn:
        conn.execute("""INSERT INTO dataset_image_analyses(owner_id,institution_id,filename,analysis,model_version)
            VALUES (%s,%s,%s,%s,%s) ON CONFLICT(owner_id,institution_id,filename) DO UPDATE SET
            analysis=EXCLUDED.analysis,model_version=EXCLUDED.model_version,created_at=now()""",
            (session["user"]["id"], institution, filename, psycopg.types.json.Jsonb(analysis), model_version))
    return analysis


@app.get("/dataset/images/{filename}/analysis", summary="Consulta análise salva da radiografia NIH")
async def get_dataset_image_analysis(filename: str, session: Session):
    if not _valid_dataset_filename(filename):
        raise HTTPException(404, "Imagem não encontrada.")
    institution = active_institution(session)
    with db() as conn:
        row = conn.execute("""SELECT a.analysis,a.created_at FROM dataset_image_analyses a
            JOIN dataset_images d USING(filename) WHERE a.owner_id=%s AND a.institution_id=%s AND a.filename=%s""",
            (session["user"]["id"], institution, filename)).fetchone()
    if not row:
        raise HTTPException(404, "Ainda não há análise salva para esta imagem.")
    return {**row["analysis"], "created_at": row["created_at"].isoformat()}


@app.post("/auth/signup", status_code=201)
async def signup(body: SignupInput):
    try:
        with db() as conn:
            user = conn.execute("INSERT INTO users(name,email,password_hash,institutions) VALUES (%s,%s,%s,%s) RETURNING id,email,name,institutions",
                                (body.name, body.email, password_hash(body.password.get_secret_value()), psycopg.types.json.Jsonb(body.institutions))).fetchone()
            for institution_id in body.institutions:
                conn.execute("INSERT INTO sim_state(owner_id,institution_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                             (user["id"], institution_id))
            link_user_institutions(conn, user["id"], body.institutions)
        return {"user": {"id": str(user["id"]), "email": user["email"], "name": user["name"],
                         "institutions": user["institutions"], "active_institution_id": None}}
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Este e-mail já está cadastrado.") from None


@app.post("/auth/login")
async def login(body: LoginInput):
    with db() as conn:
        user = conn.execute(
            "SELECT id,email,name,password_hash,institutions,view_all_reports FROM users WHERE email=%s", (body.email,)).fetchone()
        if not user or not verify_password(body.password.get_secret_value(), user["password_hash"]):
            raise HTTPException(401, "Usuário ou senha inválidos. Verifique seus dados e tente novamente.")
        linked = user["institutions"] or []
        institution_id = body.institution_id
        if institution_id and institution_id not in INSTITUTION_IDS:
            raise HTTPException(400, "A instituição selecionada não está disponível.")
        if not linked:
            if institution_id:
                raise HTTPException(403, "Sua conta não possui vínculo com a instituição selecionada. Escolha uma instituição vinculada ao seu perfil.")
            return issue_session(conn, user, None)
        if not institution_id:
            raise HTTPException(400, "Selecione uma instituição para continuar.")
        if institution_id not in linked:
            raise HTTPException(403, "Sua conta não possui vínculo com a instituição selecionada. Escolha uma instituição vinculada ao seu perfil.")
        return issue_session(conn, user, institution_id)


@app.post("/auth/refresh")
async def refresh(body: RefreshInput):
    value = body.refresh_token.get_secret_value()
    with db() as conn:
        row = conn.execute("SELECT u.id,u.email,u.name,u.institutions,u.view_all_reports,s.active_institution_id,s.id AS session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_hash=%s AND s.refresh_expires_at>now() FOR UPDATE OF s",
                           (token_hash(value),)).fetchone()
        if not row:
            raise HTTPException(401, "Sessão inválida.")
        conn.execute("DELETE FROM sessions WHERE id=%s", (row["session_id"],))
        active_id = row["active_institution_id"]
        if active_id not in (row["institutions"] or []):
            active_id = None
        return issue_session(conn, row, active_id)


@app.get("/auth/me")
async def me(session: Session):
    return session["user"]


@app.get("/institutions")
async def institutions():
    return {"institutions": list(INSTITUTIONS)}


@app.get("/auth/institutions")
async def linked_institutions(session: Session):
    ids = session["user"]["institutions"]
    return {"institutions": [item for item in INSTITUTIONS if item["id"] in ids],
            "active_institution_id": session["user"]["active_institution_id"]}


@app.post("/auth/institutions")
async def update_institutions(body: InstitutionSelection, session: Session):
    if body.active_institution_id not in body.institutions:
        raise HTTPException(422, "Escolha uma instituição ativa vinculada ao perfil.")
    owner = session["user"]["id"]
    with db() as conn:
        current = conn.execute("SELECT institutions FROM users WHERE id=%s FOR UPDATE", (owner,)).fetchone()
        if not current:
            raise HTTPException(401, "Sessão inválida.")
        removed = set(current["institutions"] or []) - set(body.institutions)
        # Records remain assigned to their original institution; removing access never moves them.
        conn.execute("UPDATE users SET institutions=%s WHERE id=%s",
                     (psycopg.types.json.Jsonb(body.institutions), owner))
        link_user_institutions(conn, owner, body.institutions)
        conn.execute("UPDATE sessions SET active_institution_id=%s WHERE access_hash=%s",
                     (body.active_institution_id, token_hash(session["token"])))
        for institution_id in body.institutions:
            conn.execute("INSERT INTO sim_state(owner_id,institution_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                         (owner, institution_id))
        # Keep other sessions authenticated, but require them to switch before scoped data access.
        if removed:
            conn.execute("UPDATE sessions SET active_institution_id=NULL WHERE user_id=%s AND active_institution_id=ANY(%s)",
                         (owner, list(removed)))
            conn.execute("UPDATE sessions SET active_institution_id=%s WHERE access_hash=%s",
                         (body.active_institution_id, token_hash(session["token"])))
    return {"institutions": body.institutions, "active_institution_id": body.active_institution_id,
            "active_institution_name": INSTITUTION_NAMES[body.active_institution_id]}


@app.post("/auth/active-institution")
async def switch_institution(body: ActiveInstitutionInput, session: Session):
    if body.institution_id not in session["user"]["institutions"]:
        raise HTTPException(403, "Sua conta não possui vínculo com a instituição selecionada.")
    with db() as conn:
        updated = conn.execute("UPDATE sessions SET active_institution_id=%s WHERE access_hash=%s AND user_id=%s RETURNING id",
                               (body.institution_id, token_hash(session["token"]), session["user"]["id"])).fetchone()
        if not updated:
            raise HTTPException(401, "Sessão inválida.")
        conn.execute("INSERT INTO sim_state(owner_id,institution_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                     (session["user"]["id"], body.institution_id))
    return {"active_institution_id": body.institution_id,
            "active_institution_name": INSTITUTION_NAMES[body.institution_id]}


@app.post("/auth/logout", status_code=204)
async def logout(session: Session):
    with db() as conn:
        conn.execute("DELETE FROM sessions WHERE access_hash=%s",
                     (token_hash(session["token"]),))
    return Response(status_code=204)


def current_hour(conn, owner, institution):
    row = conn.execute(
        "SELECT sim_now FROM sim_state WHERE owner_id=%s AND institution_id=%s", (owner, institution)).fetchone()
    return float(row["sim_now"]) if row else 0.0


def present_case(case, now):
    case = dict(case)
    case.pop("owner_id", None)
    case.pop("institution_id", None)
    case["deadline_at"] = float(case["deadline_at_sim"])
    case["notified_at"] = case.pop("notified_at_sim")
    case["acknowledged_at"] = case.pop("acknowledged_at_sim")
    case["events"] = case.get("events") or []
    case.update(requester_dispatch_state(case, now))
    case["time_remaining_hours"] = float(case["deadline_at"]) - now
    return case


def list_cases(conn, owner, institution, urgency=None, status=None, missed=False):
    sql = """SELECT c.id,c.owner_id,c.institution_id,c.report_id,c.finding,c.evidence,c.urgency,c.confidence,c.status,c.escalation_level,
       c.current_target,c.deadline_at_sim,c.notified_at_sim,c.acknowledged_at_sim,
       c.closed_at,c.closed_at_sim,c.requester_sent_at,c.requester_sent_at_sim,r.modality,r.radiologist,
       r.ordering_physician,r.text,r.flagged_by_radiologist,
       COALESCE((SELECT json_agg(json_build_object('at',e.at_sim,'label',e.detail) ORDER BY e.at_sim,e.id)
                 FROM events e WHERE e.owner_id=c.owner_id AND e.institution_id=c.institution_id AND e.case_id=c.id),'[]'::json) AS events
       FROM cases c JOIN reports r ON r.owner_id=c.owner_id AND r.institution_id=c.institution_id AND r.report_id=c.report_id"""
    where, args = ["c.owner_id=%s", "c.institution_id=%s"], [owner, institution]
    if urgency:
        where.append("c.urgency=%s")
        args.append(urgency)
    if status:
        where.append("c.status=%s")
        args.append(status)
    if missed:
        where += ["c.urgency IN ('critical','urgent')",
                  "r.flagged_by_radiologist=false"]
    rows = conn.execute(sql+" WHERE "+" AND ".join(where) +
                        " ORDER BY c.id", args).fetchall()
    now = current_hour(conn, owner, institution)
    return sorted([present_case(row, now) for row in rows],
                  key=lambda c: ({"critical": 0, "urgent": 1, "actionable": 2}[c["urgency"]], c["time_remaining_hours"], str(c["id"])))


def save_report(conn, owner, institution, report, *, update):
    existing = conn.execute(
        "SELECT 1 FROM reports WHERE owner_id=%s AND institution_id=%s AND report_id=%s",
        (owner, institution, report.report_id),
    ).fetchone()
    if existing and not update:
        raise HTTPException(409, "Já existe um laudo com esse identificador nesta instituição.")
    if not existing and update:
        raise HTTPException(404, "Laudo não encontrado.")
    values = (
        report.modality,
        report.radiologist,
        report.ordering_physician,
        report.text,
        report.flagged_by_radiologist,
        psycopg.types.json.Jsonb([item.model_dump() for item in report.ground_truth]),
    )
    if existing:
        conn.execute("DELETE FROM cases WHERE owner_id=%s AND institution_id=%s AND report_id=%s",
                     (owner, institution, report.report_id))
        conn.execute("UPDATE reports SET modality=%s,radiologist=%s,ordering_physician=%s,text=%s,flagged_by_radiologist=%s,ground_truth=%s WHERE owner_id=%s AND institution_id=%s AND report_id=%s",
                     (*values, owner, institution, report.report_id))
    else:
        conn.execute("INSERT INTO reports(owner_id,institution_id,report_id,modality,radiologist,ordering_physician,text,flagged_by_radiologist,ground_truth) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                     (owner, institution, report.report_id, *values))
    findings = [item.model_dump() for item in report.findings]
    conn.execute("INSERT INTO extractions(owner_id,institution_id,report_id,findings) VALUES (%s,%s,%s,%s) ON CONFLICT(owner_id,institution_id,report_id) DO UPDATE SET findings=EXCLUDED.findings",
                 (owner, institution, report.report_id, psycopg.types.json.Jsonb(findings)))
    now = current_hour(conn, owner, institution)
    for finding in findings:
        case = conn.execute("INSERT INTO cases(owner_id,institution_id,report_id,finding,evidence,urgency,deadline_hours,confidence,current_target,deadline_at_sim) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                            (owner, institution, report.report_id, finding["finding"], finding["evidence"], finding["urgency"], finding["deadline_hours"], finding["confidence"], report.ordering_physician, now + finding["deadline_hours"])).fetchone()
        conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'detected','Achado detectado; IA sugere, humano valida',%s,%s),(%s,%s,%s,'notified',%s,%s,%s)",
                     (owner, institution, case["id"], now, owner, owner, institution, case["id"], "Notificação simulada enviada a " + report.ordering_physician, now, owner))
    return {"report_id": report.report_id, "cases": len(findings), "updated": bool(existing)}


@app.get("/reports")
async def reports(session: Session):
    institution = active_institution(session)
    with db() as conn:
        return conn.execute("SELECT r.report_id,r.modality,r.radiologist,r.ordering_physician,r.text,r.flagged_by_radiologist,r.ground_truth,e.findings FROM reports r LEFT JOIN extractions e USING(owner_id,institution_id,report_id) WHERE r.owner_id=%s AND r.institution_id=%s ORDER BY r.report_id",
                            (session["user"]["id"], institution)).fetchall()


@app.get("/reports/{report_id}")
async def report_detail(report_id: str, session: Session):
    institution = active_institution(session)
    with db() as conn:
        report = conn.execute("SELECT r.report_id,r.modality,r.radiologist,r.ordering_physician,r.text,r.flagged_by_radiologist,r.ground_truth,e.findings FROM reports r LEFT JOIN extractions e USING(owner_id,institution_id,report_id) WHERE r.owner_id=%s AND r.institution_id=%s AND r.report_id=%s",
                              (session["user"]["id"], institution, report_id)).fetchone()
    if not report:
        raise HTTPException(404, "Laudo não encontrado.")
    return report


@app.post("/reports", status_code=201)
async def create_report(body: ReportRecordInput, session: Session):
    institution = active_institution(session)
    with db() as conn:
        return save_report(conn, session["user"]["id"], institution, body, update=False)


@app.put("/reports/{report_id}")
async def update_report(report_id: str, body: ReportRecordInput, session: Session):
    if body.report_id != report_id:
        raise HTTPException(422, "O identificador do laudo não pode ser alterado.")
    institution = active_institution(session)
    with db() as conn:
        return save_report(conn, session["user"]["id"], institution, body, update=True)


@app.delete("/reports/{report_id}", status_code=204)
async def delete_report(report_id: str, session: Session):
    institution = active_institution(session)
    with db() as conn:
        result = conn.execute("DELETE FROM reports WHERE owner_id=%s AND institution_id=%s AND report_id=%s",
                              (session["user"]["id"], institution, report_id))
        if result.rowcount == 0:
            raise HTTPException(404, "Laudo não encontrado.")
    return Response(status_code=204)



@app.get("/workspace")
async def workspace(session: Session):
    view_all = sees_every_report(session)
    scope = () if view_all else (session["user"]["id"], active_institution(session))
    report_where = "" if view_all else "WHERE r.owner_id=%s AND r.institution_id=%s"
    case_where = "" if view_all else "WHERE c.owner_id=%s AND c.institution_id=%s"
    owned_where = "" if view_all else "WHERE owner_id=%s AND institution_id=%s"
    with db() as conn:
        reports = conn.execute(
            f"""SELECT r.owner_id, r.institution_id, r.report_id, r.modality, r.text, r.flagged_by_radiologist,
               r.radiologist, r.ordering_physician, r.dataset_filename,
               (SELECT rf.file_id FROM report_files rf JOIN files f
                 USING(owner_id,institution_id,file_id)
                 WHERE rf.owner_id=r.owner_id AND rf.institution_id=r.institution_id
                   AND rf.report_id=r.report_id AND rf.role='radiograph'
                 ORDER BY f.created_at DESC,f.file_id LIMIT 1) AS image_file_id
               FROM reports r {report_where} ORDER BY r.report_id""", scope,
        ).fetchall()
        cases = conn.execute(
            f"""SELECT c.id, c.owner_id, c.institution_id, c.report_id, c.finding, c.evidence, c.urgency, c.confidence, c.status,
               c.escalation_level, c.deadline_hours, c.deadline_at_sim, c.notified_at_sim,
               c.closed_at, c.closed_at_sim, c.requester_sent_at, c.requester_sent_at_sim,
               COALESCE(s.sim_now, 0) AS sim_now
               FROM cases c LEFT JOIN sim_state s
                 ON s.owner_id=c.owner_id AND s.institution_id=c.institution_id
               {case_where}""", scope,
        ).fetchall()
        events = conn.execute(
            f"SELECT case_id, detail, at_sim FROM events {owned_where} ORDER BY at_sim, id", scope,
        ).fetchall()
        extractions = conn.execute(
            f"SELECT owner_id, institution_id, report_id, findings FROM extractions {owned_where}", scope,
        ).fetchall()
    by_case = {}
    for event in events:
        by_case.setdefault(str(event["case_id"]), []).append(
            {"at": float(event["at_sim"]), "label": event["detail"]}
        )
    by_report = {(str(row["owner_id"]), row["institution_id"], row["report_id"]): row for row in reports}
    classified = {(str(row["owner_id"]), row["institution_id"], row["report_id"]) for row in extractions}
    percents = {}
    for row in extractions:
        for finding in row["findings"] or []:
            if isinstance(finding, dict) and "confidence_percent" in finding:
                percents[(str(row["owner_id"]), row["institution_id"], row["report_id"], finding.get("finding"))] = finding
    presented = []
    for case in cases:
        key = (str(case["owner_id"]), case["institution_id"], case["report_id"])
        report = by_report.get(key)
        extra = percents.get((*key, case["finding"]), {})
        clock = float(case["sim_now"] or 0)
        case_id = str(case["id"])
        presented.append({
            "id": case_id,
            "institution_id": case["institution_id"],
            "report_id": case["report_id"],
            "finding": case["finding"],
            "evidence": case["evidence"],
            "urgency": case["urgency"],
            "confidence": case["confidence"],
            "confidence_percent": extra.get("confidence_percent"),
            "confidence_is_example": extra.get("confidence_is_example") is True,
            "status": case["status"],
            **requester_dispatch_state(case, clock),
            "escalation_level": case["escalation_level"],
            "deadline_hours": case["deadline_hours"],
            "deadline_at": float(case["deadline_at_sim"]) - clock,
            "notified_at": float(case["notified_at_sim"]) - clock,
            "modality": report["modality"] if report else None,
            "text": report["text"] if report else "",
            "radiologist": report["radiologist"] if report else None,
            "ordering_physician": report["ordering_physician"] if report else None,
            "flagged_by_radiologist": bool(report["flagged_by_radiologist"]) if report else False,
            "events": by_case.get(case_id, []),
        })
    return {
        "sim_now": 0,
        "reports": [
            {
                "report_id": row["report_id"],
                "institution_id": row["institution_id"],
                "modality": row["modality"],
                "text": row["text"],
                "flagged_by_radiologist": row["flagged_by_radiologist"],
                "radiologist": row["radiologist"],
                "ordering_physician": row["ordering_physician"],
                "classified": (str(row["owner_id"]), row["institution_id"], row["report_id"]) in classified,
                "image_file_id": row["image_file_id"],
                "dataset_filename": row["dataset_filename"],
                "image_url": None if row["image_file_id"] or row["dataset_filename"] else "/images/chest-xray-demo.png",
            }
            for row in reports
        ],
        "cases": presented,
    }


@app.get("/cases")
async def cases(session: Session, urgency: Urgency | None = None, status: Status | None = None):
    institution = active_institution(session)
    with db() as conn:
        return list_cases(conn, session["user"]["id"], institution, urgency, status)


@app.get("/cases/{case_id}")
async def case_detail(case_id: UUID, session: Session):
    owner = session["user"]["id"]
    institution = active_institution(session)
    with db() as conn:
        case = conn.execute(
            "SELECT * FROM cases WHERE owner_id=%s AND institution_id=%s AND id=%s", (owner, institution, case_id)).fetchone()
        if not case:
            raise HTTPException(404, "Caso não encontrado.")
        report = conn.execute(
            "SELECT text,modality,radiologist,ordering_physician,flagged_by_radiologist FROM reports WHERE owner_id=%s AND institution_id=%s AND report_id=%s", (owner, institution, case["report_id"])).fetchone()
        events = conn.execute(
            "SELECT type,detail,at_sim FROM events WHERE owner_id=%s AND institution_id=%s AND case_id=%s ORDER BY at_sim,id", (owner, institution, case_id)).fetchall()
        return {**present_case(case, current_hour(conn, owner, institution)), "report": report, "events": events}


def command(conn, owner, institution, op, payload):
    conn.execute("INSERT INTO sim_state(owner_id,institution_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (owner, institution))
    conn.execute("SELECT owner_id FROM sim_state WHERE owner_id=%s AND institution_id=%s FOR UPDATE", (owner, institution))
    now = current_hour(conn, owner, institution)
    if op == "import":
        conn.execute("DELETE FROM reports WHERE owner_id=%s AND institution_id=%s", (owner, institution))
        for report in payload["reports"]:
            conn.execute("INSERT INTO reports(owner_id,institution_id,report_id,modality,radiologist,ordering_physician,text,flagged_by_radiologist,ground_truth) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                         (owner, institution, report["report_id"], report["modality"], report["radiologist"], report["ordering_physician"], report["text"], report["flagged_by_radiologist"], psycopg.types.json.Jsonb(report["ground_truth"])))
            findings = payload["extractions"][report["report_id"]]["findings"]
            conn.execute("INSERT INTO extractions(owner_id,institution_id,report_id,findings) VALUES (%s,%s,%s,%s)",
                         (owner, institution, report["report_id"], psycopg.types.json.Jsonb(findings)))
            for finding in findings:
                case = conn.execute("""INSERT INTO cases(owner_id,institution_id,report_id,finding,evidence,urgency,deadline_hours,confidence,current_target,deadline_at_sim)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""", (owner, institution, report["report_id"], finding["finding"], finding["evidence"], finding["urgency"], finding["deadline_hours"], finding["confidence"], report["ordering_physician"], finding["deadline_hours"])).fetchone()
                conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'detected','Achado detectado; IA sugere, humano valida',0,%s),(%s,%s,%s,'notified',%s,0,%s)",
                             (owner, institution, case["id"], owner, owner, institution, case["id"], "Notificação simulada enviada a "+report["ordering_physician"], owner))
        conn.execute("UPDATE sim_state SET sim_now=0 WHERE owner_id=%s AND institution_id=%s", (owner, institution))
        count = conn.execute("SELECT count(*) n FROM cases WHERE owner_id=%s AND institution_id=%s", (owner, institution)).fetchone()["n"]
        return {"reports": len(payload["reports"]), "cases": count, "sim_now": 0}
    if op == "reset":
        conn.execute("DELETE FROM cases WHERE owner_id=%s AND institution_id=%s", (owner, institution))
        conn.execute("UPDATE sim_state SET sim_now=0 WHERE owner_id=%s AND institution_id=%s", (owner, institution))
        reports = conn.execute("SELECT r.*,e.findings FROM reports r JOIN extractions e USING(owner_id,institution_id,report_id) WHERE r.owner_id=%s AND r.institution_id=%s", (owner, institution)).fetchall()
        payload = {"reports": [{**report, "ground_truth": report["ground_truth"]} for report in reports],
                   "extractions": {report["report_id"]: {"findings": report["findings"]} for report in reports}}
        return command(conn, owner, institution, "import", payload)
    if op == "advance":
        now += payload["hours"]
        conn.execute("UPDATE sim_state SET sim_now=%s WHERE owner_id=%s AND institution_id=%s", (now, owner, institution))
        changed = []
        rows = conn.execute("SELECT * FROM cases WHERE owner_id=%s AND institution_id=%s AND status IN ('notified','escalated') AND deadline_at_sim<=%s FOR UPDATE", (owner, institution, now)).fetchall()
        for case_row in rows:
            if case_row["escalation_level"] < 2:
                report = conn.execute("SELECT radiologist FROM reports WHERE owner_id=%s AND institution_id=%s AND report_id=%s", (owner, institution, case_row["report_id"])).fetchone()
                destination = report["radiologist"] if case_row["escalation_level"] == 0 else "Coordenação de Radiologia"
                level = case_row["escalation_level"] + 1
                conn.execute("UPDATE cases SET escalation_level=%s,status='escalated',current_target=%s,deadline_at_sim=%s WHERE owner_id=%s AND institution_id=%s AND id=%s",
                             (level, destination, now + case_row["deadline_hours"], owner, institution, case_row["id"]))
                conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'escalated',%s,%s,%s)",
                             (owner, institution, case_row["id"], "Escalado para " + destination, now, owner))
                changed.append({"id": str(case_row["id"]), "status": "escalated", "escalation_level": level, "current_target": destination})
            elif not conn.execute("SELECT 1 FROM events WHERE owner_id=%s AND institution_id=%s AND case_id=%s AND type='coordination_overdue'", (owner, institution, case_row["id"])).fetchone():
                conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'coordination_overdue','Prazo estourado na coordenação',%s,%s)", (owner, institution, case_row["id"], now, owner))
        return {"sim_now": now, "changed_cases": changed}
    case = conn.execute("SELECT * FROM cases WHERE id=%s FOR UPDATE", (payload["id"],)).fetchone()
    if not case:
        raise HTTPException(404, "Caso não encontrado.")
    owner = case["owner_id"]
    institution = case["institution_id"]
    now = current_hour(conn, owner, institution)
    if op == "acknowledge":
        if case["status"] not in ("notified", "escalated"):
            raise HTTPException(400, "Confirmação inválida.")
        conn.execute("UPDATE cases SET status='read',acknowledged_at_sim=%s WHERE owner_id=%s AND institution_id=%s AND id=%s", (now, owner, institution, case["id"]))
        conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'read',%s,%s,%s)",
                     (owner, institution, case["id"], "Leitura confirmada por " + payload["by"], now, owner))
        return {"id": str(case["id"]), "status": "read"}
    if case["status"] not in ("read", "action_taken") or (case["status"] == "action_taken" and not payload.get("close")):
        raise HTTPException(400, "Ação inválida.")
    state = "closed" if payload.get("close") else "action_taken"
    conn.execute("UPDATE cases SET status=%s WHERE owner_id=%s AND institution_id=%s AND id=%s", (state, owner, institution, case["id"]))
    conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'action_taken',%s,%s,%s)",
                 (owner, institution, case["id"], "Ação registrada: " + payload["action"], now, owner))
    if state == "closed":
        conn.execute("UPDATE cases SET closed_at=COALESCE(closed_at,now()),closed_at_sim=COALESCE(closed_at_sim,%s) WHERE id=%s", (now, case["id"]))
        conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'closed','Caso fechado',%s,%s)",
                     (owner, institution, case["id"], now, owner))
    return {"id": str(case["id"]), "status": state}


def requester_dispatch_state(case, sim_now, now=None):
    closed = case.get("closed_at")
    sent = case.get("requester_sent_at")
    if not closed:
        return {"requester_sent_at": sent.isoformat() if sent else None, "requester_dispatch_deadline": None}
    current = now or datetime.now(timezone.utc)
    endpoint = sent or current
    clock = case.get("requester_sent_at_sim") if sent else sim_now
    remaining = float(case["deadline_at_sim"]) - float(clock or 0) - (endpoint - closed).total_seconds() / 3600
    return {
        "requester_sent_at": sent.isoformat() if sent else None,
        "requester_dispatch_deadline": None if sent else (current + timedelta(hours=remaining)).isoformat(),
        "requester_dispatch_remaining_hours": remaining,
    }


@app.post("/cases/{case_id}/send-requester")
async def send_requester(case_id: UUID, session: Session):
    active_institution(session)
    institutions = session["user"].get("institutions", [])
    with db() as conn:
        case = conn.execute(
            "SELECT * FROM cases WHERE id=%s AND institution_id=ANY(%s) FOR UPDATE",
            (case_id, institutions),
        ).fetchone()
        if not case:
            raise HTTPException(404, "Caso não encontrado.")
        institution = case["institution_id"]
        if case["status"] != "closed":
            raise HTTPException(409, "Confirme a leitura e registre a ação antes do envio.")
        if case.get("requester_sent_at"):
            return {"sent": True, "already_registered": True}
        report = conn.execute(
            "SELECT ordering_physician FROM reports WHERE owner_id=%s AND institution_id=%s AND report_id=%s",
            (case["owner_id"], institution, case["report_id"]),
        ).fetchone()
        if not report or not report["ordering_physician"].strip():
            raise HTTPException(422, "Médico solicitante não informado.")
        now = current_hour(conn, case["owner_id"], institution)
        conn.execute(
            "UPDATE cases SET requester_sent_at=now(),requester_sent_at_sim=%s WHERE id=%s",
            (now, case_id),
        )
        conn.execute(
            "INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'requester_sent',%s,%s,%s)",
            (case["owner_id"], institution, case_id, "Envio interno registrado para " + report["ordering_physician"], now, session["user"]["id"]),
        )
    return {"sent": True, "channel": "internal"}


@app.post("/cases/{case_id}/acknowledge")
async def acknowledge(case_id: UUID, body: AcknowledgeInput, session: Session):
    institution = active_institution(session)
    with db() as conn:
        return command(conn, session["user"]["id"], institution, "acknowledge", {"id": str(case_id), "by": body.by})


@app.post("/cases/{case_id}/action")
async def action(case_id: UUID, body: ActionInput, session: Session):
    institution = active_institution(session)
    with db() as conn:
        return command(conn, session["user"]["id"], institution, "action", {"id": str(case_id), **body.model_dump()})


@app.get("/simulate")
async def clock(session: Session):
    institution = active_institution(session)
    with db() as conn:
        return {"sim_now": current_hour(conn, session["user"]["id"], institution)}


@app.post("/simulate/advance")
async def advance(session: Session, hours: Annotated[float, Query(gt=0, le=8760, allow_inf_nan=False)]):
    institution = active_institution(session)
    with db() as conn:
        return command(conn, session["user"]["id"], institution, "advance", {"hours": hours})


@app.post("/simulate/reset")
async def reset(session: Session):
    institution = active_institution(session)
    with db() as conn:
        return command(conn, session["user"]["id"], institution, "reset", {})


@app.get("/missed")
async def missed(session: Session):
    institution = active_institution(session)
    with db() as conn:
        return list_cases(conn, session["user"]["id"], institution, missed=True)


@app.get("/stats")
async def stats(session: Session):
    institution = active_institution(session)
    with db() as conn:
        rows = conn.execute(
            "SELECT urgency,status,notified_at_sim,acknowledged_at_sim FROM cases WHERE owner_id=%s AND institution_id=%s", (session["user"]["id"], institution)).fetchall()
    urg = {k: 0 for k in ("critical", "urgent", "actionable")}
    sts = {k: 0 for k in ("detected", "notified", "read",
                          "action_taken", "closed", "escalated")}
    elapsed = []
    for r in rows:
        urg[r["urgency"]] += 1
        sts[r["status"]] += 1
        if r["acknowledged_at_sim"] is not None:
            elapsed.append(float(r["acknowledged_at_sim"]
                                 )-float(r["notified_at_sim"]))
    return {"by_urgency": urg, "by_status": sts, "avg_hours_to_ack": sum(elapsed)/len(elapsed) if elapsed else None}


@app.post("/imports")
async def import_data(body: ImportInput, session: Session):
    institution = active_institution(session)
    with db() as conn:
        return command(conn, session["user"]["id"], institution, "import", body.model_dump())


def _read_pdf(content: bytes) -> str:
    try:
        from io import BytesIO
        pages = PdfReader(BytesIO(content)).pages
        if len(pages) > 200:
            raise HTTPException(413, "PDF excede o limite de 200 páginas.")
        chunks = []
        total = 0
        for page in pages:
            chunk = page.extract_text() or ""
            total += len(chunk)
            if total > 100000:
                raise HTTPException(413, "Texto do PDF excede 100.000 caracteres.")
            chunks.append(chunk)
        text = "\n".join(chunks).strip()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Não foi possível extrair texto do PDF; envie um PDF pesquisável.") from None
    if not text:
        raise HTTPException(422, "O PDF não contém texto pesquisável; OCR não está habilitado.")
    return text


def _extract_report(report_id: str, text: str) -> dict:
    key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    if not key:
        raise HTTPException(503, "Extração indisponível: configure GEMINI_API_KEY.")
    prompt_path = BACKEND_DIR / "prompts" / "extraction.txt"
    try:
        return extract_one({"report_id": report_id, "text": text}, prompt_path.read_text(encoding="utf-8-sig"), model, key)
    except (ValueError, OSError, RuntimeError):
        raise HTTPException(502, "A extração do laudo falhou; nenhum resultado foi persistido.") from None


@app.post("/reports/analyze", summary="Extrai achados e compara com a radiografia", description="Protótipo de apoio à revisão humana. Aceita texto/PDF pesquisável como laudo e PNG/JPEG torácico em radiograph. Retorna probabilidades das 14 classes NIH, divergências exploratórias e metadados; nunca emite diagnóstico.")
async def analyze_report(
    session: Session,
    report_text: Annotated[str | None, Form(max_length=100000)] = None,
    report_file: Annotated[UploadFile | None, File(description="Laudo PDF pesquisável")] = None,
    radiograph: Annotated[UploadFile | None, File(description="Radiografia torácica PNG/JPEG para o modelo NIH")] = None,
    report_id: Annotated[str | None, Form(max_length=100)] = None,
):
    institution = active_institution(session)
    if not report_text and not report_file:
        raise HTTPException(422, "Envie report_text ou report_file.")
    if report_text and not report_text.strip():
        raise HTTPException(422, "report_text não pode estar vazio.")
    if report_file and report_file.content_type != "application/pdf":
        raise HTTPException(415, "report_file aceita PDF pesquisável; envie radiografias em radiograph (PNG/JPEG).")
    report_content = await report_file.read() if report_file else None
    if report_content is not None and (not report_content or len(report_content) > 10 * 1024 * 1024):
        raise HTTPException(413, "PDF vazio ou acima do limite de 10 MB.")
    text = report_text.strip() if report_text and report_text.strip() else _read_pdf(report_content)
    if len(text) > 100000:
        raise HTTPException(413, "Laudo excede o limite de 100.000 caracteres.")
    if report_content is not None and report_text:
        text = report_text.strip()
    rid = report_id or secrets.token_hex(16)
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", rid):
        raise HTTPException(422, "report_id contém caracteres inválidos.")

    findings_data = await run_in_threadpool(_extract_report, rid, text)
    findings = findings_data["findings"]
    probabilities, model_version, localizations, heatmap = {}, "unavailable", [], None
    if radiograph:
        if radiograph.content_type not in {"image/png", "image/jpeg"}:
            raise HTTPException(415, "radiograph aceita apenas PNG ou JPEG.")
        image_bytes = await radiograph.read()
        try:
            probabilities, model_version, localizations, heatmap = await run_in_threadpool(
                report_analysis.infer, image_bytes, include_localizations=True)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None
        except (ImportError, OSError, RuntimeError):
            raise HTTPException(503, "Serviço do modelo TorchXRayVision indisponível.") from None
    comparison = report_analysis.compare(findings, probabilities) if probabilities else {
        "threshold": None, "threshold_status": "not_run_without_radiograph", "text_classes": [],
        "model_classes_above_threshold": [], "disagreements": [], "limitations": ["Radiografia não enviada; comparação textual e visual não executada."]}
    stored_files = []
    if report_content:
        stored_files.append({"file_id": secrets.token_hex(16) + ".pdf", "role": "report", "mime_type": "application/pdf", "content": report_content})
    if radiograph:
        ext = ".png" if radiograph.content_type == "image/png" else ".jpg"
        stored_files.append({"file_id": secrets.token_hex(16) + ext, "role": "radiograph", "mime_type": radiograph.content_type, "content": image_bytes})
    analysis = {"report_id": rid, "findings": findings,
                "predictions": comparison["model_classes_above_threshold"],
                "probabilities": probabilities, "comparison": comparison, "disagreements": comparison["disagreements"],
                "model_version": model_version,
                "model_metadata": report_analysis.model_metadata() if probabilities else None,
                "localization_method": "gradcam" if probabilities else None,
                "localization_status": "estimated" if localizations else "unavailable",
                "markers": localizations, "heatmap": heatmap,
                "localization_note": "Mapas Grad-CAM são estimativas de relevância do classificador, não detecções confirmadas." if probabilities else None,
                "source_files": [{k: v for k, v in item.items() if k != "content"} for item in stored_files],
                "status": "review_required", "human_review_required": True}

    owner = session["user"]["id"]
    with db() as conn:
        conn.execute("""INSERT INTO reports(owner_id,institution_id,report_id,modality,radiologist,ordering_physician,text,flagged_by_radiologist,ground_truth)
            VALUES (%s,%s,%s,'chest_xray','Não informado','Revisão radiológica',%s,false,'[]'::jsonb)
            ON CONFLICT(owner_id,institution_id,report_id) DO UPDATE SET text=EXCLUDED.text,modality=EXCLUDED.modality""", (owner, institution, rid, text))
        conn.execute("""INSERT INTO extractions(owner_id,institution_id,report_id,findings) VALUES (%s,%s,%s,%s)
            ON CONFLICT(owner_id,institution_id,report_id) DO UPDATE SET findings=EXCLUDED.findings""", (owner, institution, rid, psycopg.types.json.Jsonb(findings)))
        conn.execute("""INSERT INTO report_analyses(owner_id,institution_id,report_id,analysis,model_version) VALUES (%s,%s,%s,%s,%s)
            ON CONFLICT(owner_id,institution_id,report_id) DO UPDATE SET analysis=EXCLUDED.analysis,model_version=EXCLUDED.model_version,created_at=now()""",
                     (owner, institution, rid, psycopg.types.json.Jsonb(analysis), model_version))
        conn.execute("DELETE FROM files WHERE owner_id=%s AND institution_id=%s AND file_id IN (SELECT file_id FROM report_files WHERE owner_id=%s AND institution_id=%s AND report_id=%s)", (owner, institution, owner, institution, rid))
        conn.execute("DELETE FROM report_files WHERE owner_id=%s AND institution_id=%s AND report_id=%s", (owner, institution, rid))
        for item in stored_files:
            conn.execute("INSERT INTO files(owner_id,institution_id,file_id,mime_type,content) VALUES (%s,%s,%s,%s,%s)",
                         (owner, institution, item["file_id"], item["mime_type"], item["content"]))
            conn.execute("INSERT INTO report_files(owner_id,institution_id,report_id,file_id,role) VALUES (%s,%s,%s,%s,%s)",
                         (owner, institution, rid, item["file_id"], item["role"]))
        now = current_hour(conn, owner, institution)
        for finding in findings:
            exists = conn.execute("SELECT 1 FROM cases WHERE owner_id=%s AND institution_id=%s AND report_id=%s AND finding=%s", (owner, institution, rid, finding["finding"])).fetchone()
            if exists: continue
            case = conn.execute("""INSERT INTO cases(owner_id,institution_id,report_id,finding,evidence,urgency,deadline_hours,confidence,current_target,deadline_at_sim,status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'Revisão radiológica',%s,'notified') RETURNING id""",
                (owner,institution,rid,finding["finding"],finding["evidence"],finding["urgency"],finding["deadline_hours"],finding["confidence"],now+finding["deadline_hours"])).fetchone()
            conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'detected','Extração automática; revisão humana necessária',%s,%s),(%s,%s,%s,'notified','Caso incluído na fila de revisão',%s,%s)",
                         (owner,institution,case["id"],now,owner,owner,institution,case["id"],now,owner))
    return analysis


@app.post("/radiographs/classify", summary="Classifica uma radiografia de tórax")
async def classify_radiograph(
    radiograph: Annotated[UploadFile, File(description="Radiografia torácica PNG/JPEG para o modelo NIH")],
    session: Session,
):
    """Return exploratory NIH class probabilities without persisting the uploaded image."""
    active_institution(session)
    if radiograph.content_type not in {"image/png", "image/jpeg"}:
        raise HTTPException(415, "Envie uma radiografia PNG ou JPEG.")
    image_bytes = await radiograph.read(report_analysis.MAX_IMAGE_BYTES + 1)
    if len(image_bytes) > report_analysis.MAX_IMAGE_BYTES:
        raise HTTPException(413, "Radiografia acima do limite de 10 MB.")
    try:
        probabilities, model_version, localizations, heatmap = await run_in_threadpool(
            report_analysis.infer, image_bytes, include_localizations=True)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except (ImportError, OSError, RuntimeError):
        raise HTTPException(503, "Serviço do modelo TorchXRayVision indisponível.") from None
    threshold = report_analysis.EXPLORATORY_THRESHOLD
    return {
        "probabilities": probabilities,
        "predictions": sorted(label for label, score in probabilities.items() if score >= threshold),
        "threshold": threshold,
        "threshold_status": "exploratory_unvalidated",
        "model_version": model_version,
        "localization_method": "gradcam",
        "localization_status": "estimated" if localizations else "unavailable",
        "markers": localizations,
        "heatmap": heatmap,
        "localization_note": "Mapas Grad-CAM são estimativas de relevância do classificador, não detecções confirmadas.",
        "model_metadata": report_analysis.model_metadata(),
        "status": "review_required",
        "human_review_required": True,
        "limitations": [
            "Modelo de pesquisa pré-treinado (TorchXRayVision, DenseNet121 NIH ChestX-ray14).",
            "Probabilidades e corte não foram validados nem calibrados para uso clínico.",
            "O resultado não é diagnóstico e requer avaliação por profissional qualificado.",
        ],
    }


@app.get("/reports/{report_id}/analysis", summary="Consulta análise salva de um laudo")
async def get_report_analysis(report_id: str, session: Session):
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", report_id):
        raise HTTPException(404, "Análise não encontrada.")
    view_all = sees_every_report(session)
    institution = None if view_all else active_institution(session)
    with db() as conn:
        if view_all:
            row = conn.execute("""SELECT a.analysis,a.model_version,a.created_at
                FROM report_analyses a WHERE a.report_id=%s ORDER BY a.created_at DESC LIMIT 1""", (report_id,)).fetchone()
        else:
            row = conn.execute("""SELECT a.analysis,a.model_version,a.created_at
                FROM report_analyses a JOIN reports r USING(owner_id,institution_id,report_id)
                WHERE a.owner_id=%s AND a.institution_id=%s AND a.report_id=%s""", (session["user"]["id"], institution, report_id)).fetchone()
    if not row:
        raise HTTPException(404, "Análise não encontrada.")
    return {**row["analysis"], "model_version": row["model_version"],
            "created_at": row["created_at"].isoformat()}


@app.post("/reports/{report_id}/reclassify", summary="Reclassifica a radiografia já vinculada ao laudo")
async def reclassify_report(report_id: str, session: Session):
    started = time.monotonic()
    request_id = uuid4().hex
    logger.info("[RECLASSIFY] stage=received request_id=%s", request_id)
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", report_id):
        raise HTTPException(404, "Laudo não encontrado.")
    view_all = sees_every_report(session)
    institution = None if view_all else active_institution(session)
    owner = session["user"]["id"]
    with db() as conn:
        if view_all:
            row = conn.execute("""SELECT f.owner_id,f.institution_id,f.content,f.mime_type,a.analysis
                FROM report_files rf JOIN files f
                  ON f.owner_id=rf.owner_id AND f.institution_id=rf.institution_id AND f.file_id=rf.file_id
                LEFT JOIN report_analyses a
                  ON a.owner_id=rf.owner_id AND a.institution_id=rf.institution_id AND a.report_id=rf.report_id
                WHERE rf.report_id=%s AND rf.role='radiograph'
                ORDER BY f.created_at DESC,f.file_id LIMIT 1""", (report_id,)).fetchone()
        else:
            row = conn.execute("""SELECT f.content,f.mime_type,a.analysis
                FROM report_files rf JOIN files f
                  ON f.owner_id=rf.owner_id AND f.institution_id=rf.institution_id AND f.file_id=rf.file_id
                LEFT JOIN report_analyses a
                  ON a.owner_id=rf.owner_id AND a.institution_id=rf.institution_id AND a.report_id=rf.report_id
                WHERE rf.owner_id=%s AND rf.institution_id=%s AND rf.report_id=%s AND rf.role='radiograph'
                ORDER BY f.created_at DESC,f.file_id LIMIT 1""", (owner, institution, report_id)).fetchone()
        if not row:
            if view_all:
                row = conn.execute("""SELECT r.owner_id,r.institution_id,d.content,
                    CASE WHEN right(lower(d.filename), 4) = '.png' THEN 'image/png' ELSE 'image/jpeg' END AS mime_type,
                    a.analysis
                    FROM reports r
                    JOIN dataset_images d ON d.filename=r.dataset_filename
                    LEFT JOIN report_analyses a
                      ON a.owner_id=r.owner_id AND a.institution_id=r.institution_id AND a.report_id=r.report_id
                    WHERE r.report_id=%s
                    ORDER BY r.institution_id LIMIT 1""", (report_id,)).fetchone()
            else:
                row = conn.execute("""SELECT d.content,
                    CASE WHEN right(lower(d.filename), 4) = '.png' THEN 'image/png' ELSE 'image/jpeg' END AS mime_type,
                    a.analysis
                    FROM reports r
                    JOIN dataset_images d ON d.filename=r.dataset_filename
                    LEFT JOIN report_analyses a
                      ON a.owner_id=r.owner_id AND a.institution_id=r.institution_id AND a.report_id=r.report_id
                    WHERE r.owner_id=%s AND r.institution_id=%s AND r.report_id=%s""",
                    (owner, institution, report_id)).fetchone()
    if not row:
        raise HTTPException(404, "Este laudo não possui radiografia vinculada para reclassificar.")
    owner = row["owner_id"] if view_all else owner
    institution = row["institution_id"] if view_all else institution
    image_bytes = bytes(row["content"])
    if not image_bytes or len(image_bytes) > report_analysis.MAX_IMAGE_BYTES:
        raise HTTPException(413, "Radiografia vazia ou acima do limite de 10 MB.")
    if row["mime_type"] not in {"image/png", "image/jpeg"}:
        raise HTTPException(415, "A radiografia vinculada não está em PNG ou JPEG.")
    logger.info("[RECLASSIFY] stage=image_found request_id=%s elapsed=%.3f", request_id, time.monotonic() - started)
    try:
        probabilities, model_version, localizations, heatmap, metadata = await run_in_threadpool(
            reclassification_worker.run, image_bytes)
    except WorkerBusy as exc:
        raise HTTPException(409, str(exc)) from None
    except TimeoutError as exc:
        logger.error("[RECLASSIFY] stage=inference_timeout request_id=%s elapsed=%.3f", request_id, time.monotonic() - started)
        raise HTTPException(504, str(exc)) from None
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except (ImportError, OSError, RuntimeError) as exc:
        logger.error("[RECLASSIFY] stage=inference_failed request_id=%s exception=%s elapsed=%.3f",
                     request_id, type(exc).__name__, time.monotonic() - started)
        raise HTTPException(503, "Serviço do modelo TorchXRayVision indisponível.") from None

    analysis = dict(row["analysis"] or {})
    findings = analysis.get("findings", [])
    comparison = report_analysis.compare(findings, probabilities)
    analysis.update({
        "report_id": report_id,
        "probabilities": probabilities,
        "predictions": comparison["model_classes_above_threshold"],
        "threshold": comparison["threshold"],
        "threshold_status": comparison["threshold_status"],
        "comparison": comparison,
        "disagreements": comparison["disagreements"],
        "model_version": model_version,
        "model_metadata": metadata,
        "localization_method": "gradcam",
        "localization_status": "estimated" if localizations else "unavailable",
        "markers": localizations,
        "heatmap": heatmap,
        "localization_note": ("Mapas Grad-CAM são estimativas de relevância do classificador, não detecções confirmadas."
                              if localizations else "Localização indisponível ou inconclusiva. Os scores de classificação foram preservados."),
        "status": "review_required",
        "human_review_required": True,
        "reclassification_status": "completed",
    })
    with db() as conn:
        conn.execute("""INSERT INTO report_analyses(owner_id,institution_id,report_id,analysis,model_version)
            VALUES (%s,%s,%s,%s,%s) ON CONFLICT(owner_id,institution_id,report_id) DO UPDATE SET
            analysis=EXCLUDED.analysis,model_version=EXCLUDED.model_version,created_at=now()""",
            (owner, institution, report_id, psycopg.types.json.Jsonb(analysis), model_version))
    logger.info("[RECLASSIFY] stage=persisted request_id=%s elapsed=%.3f", request_id, time.monotonic() - started)
    logger.info("[RECLASSIFY] stage=response_ready request_id=%s elapsed=%.3f", request_id, time.monotonic() - started)
    return analysis


@app.post("/reports/{report_id}/radiograph-url", summary="Emite URL temporária da radiografia de um laudo")
async def report_radiograph_url(report_id: str, request: Request, session: Session):
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", report_id):
        raise HTTPException(404, "Radiografia não encontrada.")
    expires = int(datetime.now(timezone.utc).timestamp()) + 60
    ticket = secrets.token_urlsafe(32)
    view_all = sees_every_report(session)
    owner = session["user"]["id"]
    institution = None if view_all else active_institution(session)
    with db() as conn:
        if view_all:
            row = conn.execute("""SELECT f.owner_id,f.institution_id,f.file_id FROM report_files rf JOIN files f
                USING(owner_id,institution_id,file_id) WHERE rf.report_id=%s
                AND rf.role='radiograph' AND f.mime_type IN ('image/png','image/jpeg')
                ORDER BY f.created_at DESC LIMIT 1""", (report_id,)).fetchone()
        else:
            row = conn.execute("""SELECT f.owner_id,f.institution_id,f.file_id FROM report_files rf JOIN files f
                USING(owner_id,institution_id,file_id) WHERE rf.owner_id=%s AND rf.institution_id=%s AND rf.report_id=%s
                AND rf.role='radiograph' AND f.mime_type IN ('image/png','image/jpeg')
                ORDER BY f.created_at DESC LIMIT 1""", (owner, institution, report_id)).fetchone()
        if not row:
            raise HTTPException(404, "Radiografia não encontrada.")
        conn.execute("INSERT INTO file_links(token_hash,owner_id,institution_id,file_id,expires_at,session_access_hash) VALUES (%s,%s,%s,%s,to_timestamp(%s),%s)",
                     (token_hash(ticket), row["owner_id"], row["institution_id"], row["file_id"], expires, token_hash(session["token"])))
    url = f"/files/{quote(row['file_id'], safe='')}?token={quote(ticket)}"
    return {"url": url, "expires_in": 60}

@app.post("/files", status_code=201)
async def upload_file(request: Request, session: Session):
    institution = active_institution(session)
    types = {"application/json": "json", "image/png": "png",
             "image/jpeg": "jpg", "application/pdf": "pdf"}
    mime = request.headers.get("content-type", "").split(";")[0]
    if mime not in types:
        raise HTTPException(415, "Tipos aceitos: JSON, PNG, JPEG e PDF.")
    content = await request.body()
    if not content:
        raise HTTPException(400, "Arquivo vazio.")
    if len(content) > 10*1024*1024:
        raise HTTPException(413, "Arquivo deve ter até 10 MB.")
    file_id = f"{secrets.token_hex(16)}.{types[mime]}"
    with db() as conn:
        conn.execute("INSERT INTO files(owner_id,institution_id,file_id,mime_type,content) VALUES (%s,%s,%s,%s,%s)",
                     (session["user"]["id"], institution, file_id, mime, content))
    return {"file_id": file_id, "institution_id": institution, "path": f"{session['user']['id']}/{institution}/{file_id}", "bucket": "brightline-files"}


@app.post("/files/{file_id}/signed-url")
async def signed_url(file_id: str, session: Session, request: Request):
    view_all = sees_every_report(session)
    institution = None if view_all else active_institution(session)
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(400, "Identificador de arquivo inválido.")
    expires = int(datetime.now(timezone.utc).timestamp())+60
    ticket = secrets.token_urlsafe(32)
    with db() as conn:
        if view_all:
            exists = conn.execute("""SELECT owner_id,institution_id FROM files f
                WHERE f.file_id=%s AND EXISTS (
                  SELECT 1 FROM report_files rf
                  WHERE rf.owner_id=f.owner_id AND rf.institution_id=f.institution_id AND rf.file_id=f.file_id
                )""", (file_id,)).fetchone()
        else:
            exists = conn.execute("SELECT owner_id,institution_id FROM files WHERE owner_id=%s AND institution_id=%s AND file_id=%s",
                                  (session["user"]["id"], institution, file_id)).fetchone()
        if not exists:
            raise HTTPException(404, "Arquivo não encontrado.")
        conn.execute("INSERT INTO file_links(token_hash,owner_id,institution_id,file_id,expires_at,session_access_hash) VALUES (%s,%s,%s,%s,to_timestamp(%s),%s)",
                     (token_hash(ticket), exists["owner_id"], exists["institution_id"], file_id, expires, token_hash(session["token"])))
    return {"url": f"{str(request.base_url).rstrip('/')}/files/{file_id}?token={ticket}", "expires_in": 60}


@app.get("/files/{file_id}")
async def download_file(file_id: str, token: str):
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(404, "Arquivo não encontrado.")
    with db() as conn:
        row = conn.execute("""SELECT f.mime_type,f.content FROM file_links l JOIN files f
          ON f.owner_id=l.owner_id AND f.institution_id=l.institution_id AND f.file_id=l.file_id
          JOIN sessions s ON s.access_hash=l.session_access_hash
          JOIN users u ON u.id=s.user_id
          WHERE l.token_hash=%s AND l.file_id=%s AND l.expires_at>now() AND s.expires_at>now()
            AND (u.view_all_reports OR s.active_institution_id=l.institution_id)""", (token_hash(token), file_id)).fetchone()
    if not row:
        raise HTTPException(404, "Arquivo não encontrado.")
    return Response(content=bytes(row["content"]), media_type=row["mime_type"])


@app.get("/files")
async def list_files(session: Session):
    institution = active_institution(session)
    with db() as conn:
        return conn.execute("SELECT file_id,mime_type,created_at FROM files WHERE owner_id=%s AND institution_id=%s ORDER BY created_at DESC",
                            (session["user"]["id"], institution)).fetchall()


@app.delete("/files/{file_id}", status_code=204)
async def delete_file(file_id: str, session: Session):
    institution = active_institution(session)
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(404, "Arquivo não encontrado.")
    with db() as conn:
        result = conn.execute("DELETE FROM files WHERE owner_id=%s AND institution_id=%s AND file_id=%s",
                              (session["user"]["id"], institution, file_id))
        if result.rowcount == 0:
            raise HTTPException(404, "Arquivo não encontrado.")
    return Response(status_code=204)