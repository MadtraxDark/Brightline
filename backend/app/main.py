"""API Brightline com PostgreSQL local; arquivos binários também ficam no banco."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac, sha256
import hmac
import re
import secrets
from typing import Annotated
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .institutions import INSTITUTIONS, INSTITUTION_IDS, INSTITUTION_NAMES
from .models import (AcknowledgeInput, ActionInput, ActiveInstitutionInput, ImportInput,
                     InstitutionSelection, LoginInput, RefreshInput, ReportRecordInput, SignupInput, Status, Urgency)


def db():
    return psycopg.connect(get_settings().database_url, row_factory=dict_row)


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
                     "active_institution_name": INSTITUTION_NAMES.get(institution_id)}}


bearer = HTTPBearer(auto_error=False)


def authenticated(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Informe um access_token válido.", headers={
                            "WWW-Authenticate": "Bearer"})
    with db() as conn:
        row = conn.execute("""SELECT u.id,u.email,u.name,u.institutions,s.access_hash,s.active_institution_id FROM sessions s JOIN users u ON u.id=s.user_id
            WHERE s.access_hash=%s AND s.expires_at>now()""", (token_hash(credentials.credentials),)).fetchone()
    if not row:
        raise HTTPException(401, "Sessão inválida ou expirada.")
    return {"token": credentials.credentials, "user": {"id": str(row["id"]), "email": row["email"], "name": row["name"],
            "institutions": row["institutions"] or [], "active_institution_id": row["active_institution_id"],
            "active_institution_name": INSTITUTION_NAMES.get(row["active_institution_id"])}}


Session = Annotated[dict, Depends(authenticated)]


def active_institution(session):
    institution_id = session["user"].get("active_institution_id")
    if not institution_id:
        raise HTTPException(409, "Escolha uma instituição vinculada para acessar os dados.")
    if institution_id not in session["user"].get("institutions", []):
        raise HTTPException(403, "Sua sessão não possui vínculo com a instituição ativa.")
    return institution_id


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


@app.middleware("http")
async def no_store_auth(request: Request, call_next):
    response = await call_next(request)
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


@app.post("/auth/signup", status_code=201)
async def signup(body: SignupInput):
    try:
        with db() as conn:
            user = conn.execute("INSERT INTO users(name,email,password_hash,institutions) VALUES (%s,%s,%s,%s) RETURNING id,email,name,institutions",
                                (body.name, body.email, password_hash(body.password.get_secret_value()), psycopg.types.json.Jsonb(body.institutions))).fetchone()
            for institution_id in body.institutions:
                conn.execute("INSERT INTO sim_state(owner_id,institution_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                             (user["id"], institution_id))
        return {"user": {"id": str(user["id"]), "email": user["email"], "name": user["name"],
                         "institutions": user["institutions"], "active_institution_id": None}}
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Este e-mail já está cadastrado.") from None


@app.post("/auth/login")
async def login(body: LoginInput):
    with db() as conn:
        user = conn.execute(
            "SELECT id,email,name,password_hash,institutions FROM users WHERE email=%s", (body.email,)).fetchone()
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
        row = conn.execute("SELECT u.id,u.email,u.name,u.institutions,s.active_institution_id,s.id AS session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_hash=%s AND s.refresh_expires_at>now() FOR UPDATE OF s",
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
    case["time_remaining_hours"] = float(case["deadline_at"]) - now
    return case


def list_cases(conn, owner, institution, urgency=None, status=None, missed=False):
    sql = """SELECT c.id,c.owner_id,c.institution_id,c.report_id,c.finding,c.evidence,c.urgency,c.confidence,c.status,c.escalation_level,
       c.current_target,c.deadline_at_sim,c.notified_at_sim,c.acknowledged_at_sim,r.modality,r.radiologist,
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
    case = conn.execute("SELECT * FROM cases WHERE owner_id=%s AND institution_id=%s AND id=%s FOR UPDATE", (owner, institution, payload["id"])).fetchone()
    if not case:
        raise HTTPException(404, "Caso não encontrado.")
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
        conn.execute("INSERT INTO events(owner_id,institution_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,%s,'closed','Caso fechado',%s,%s)",
                     (owner, institution, case["id"], now, owner))
    return {"id": str(case["id"]), "status": state}


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
    institution = active_institution(session)
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(400, "Identificador de arquivo inválido.")
    expires = int(datetime.now(timezone.utc).timestamp())+60
    ticket = secrets.token_urlsafe(32)
    with db() as conn:
        exists = conn.execute("SELECT 1 FROM files WHERE owner_id=%s AND institution_id=%s AND file_id=%s",
                              (session["user"]["id"], institution, file_id)).fetchone()
        if not exists:
            raise HTTPException(404, "Arquivo não encontrado.")
        conn.execute("INSERT INTO file_links(token_hash,owner_id,institution_id,file_id,expires_at,session_access_hash) VALUES (%s,%s,%s,%s,to_timestamp(%s),%s)",
                     (token_hash(ticket), session["user"]["id"], institution, file_id, expires, token_hash(session["token"])))
    return {"url": f"{str(request.base_url).rstrip('/')}/files/{file_id}?token={ticket}", "expires_in": 60}


@app.get("/files/{file_id}")
async def download_file(file_id: str, token: str):
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(404, "Arquivo não encontrado.")
    with db() as conn:
        row = conn.execute("""SELECT f.mime_type,f.content FROM file_links l JOIN files f
          ON f.owner_id=l.owner_id AND f.institution_id=l.institution_id AND f.file_id=l.file_id
          JOIN sessions s ON s.access_hash=l.session_access_hash AND s.active_institution_id=l.institution_id
          WHERE l.token_hash=%s AND l.file_id=%s AND l.expires_at>now() AND s.expires_at>now()""", (token_hash(token), file_id)).fetchone()
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
