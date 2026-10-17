"""API Brightline com PostgreSQL local; arquivos binários também ficam no banco."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac, sha256
import hmac
import os
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
from .models import AcknowledgeInput, ActionInput, Credentials, ImportInput, RefreshInput, SignupInput, Status, Urgency


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


def issue_session(conn, user):
    access, refresh = secrets.token_urlsafe(40), secrets.token_urlsafe(48)
    conn.execute("INSERT INTO sessions(user_id, access_hash, refresh_hash, expires_at) VALUES (%s,%s,%s,%s)",
                 (user["id"], token_hash(access), token_hash(refresh), datetime.now(timezone.utc)+timedelta(hours=1)))
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "expires_in": 3600,
            "user": {"id": str(user["id"]), "email": user["email"], "name": user["name"]}}


bearer = HTTPBearer(auto_error=False)


def authenticated(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Informe um access_token válido.", headers={
                            "WWW-Authenticate": "Bearer"})
    with db() as conn:
        row = conn.execute("""SELECT u.id,u.email,u.name,s.access_hash FROM sessions s JOIN users u ON u.id=s.user_id
            WHERE s.access_hash=%s AND s.expires_at>now()""", (token_hash(credentials.credentials),)).fetchone()
    if not row:
        raise HTTPException(401, "Sessão inválida ou expirada.")
    return {"token": credentials.credentials, "user": {"id": str(row["id"]), "email": row["email"], "name": row["name"]}}


Session = Annotated[dict, Depends(authenticated)]


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
                   allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type"])


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
    with db() as conn:
        conn.execute("SELECT 1 FROM sim_state WHERE owner_id=%s",
                     (session["user"]["id"],)).fetchone()
    return {"status": "ok", "database": "postgresql"}


@app.post("/auth/signup", status_code=201)
async def signup(body: SignupInput):
    try:
        with db() as conn:
            user = conn.execute("INSERT INTO users(name,email,password_hash) VALUES (%s,%s,%s) RETURNING id,email,name",
                                (body.name, body.email, password_hash(body.password.get_secret_value()))).fetchone()
            conn.execute(
                "INSERT INTO sim_state(owner_id) VALUES (%s)", (user["id"],))
        return {"user": {"id": str(user["id"]), "email": user["email"], "name": user["name"]}}
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Este e-mail já está cadastrado.") from None


@app.post("/auth/login")
async def login(body: Credentials):
    with db() as conn:
        user = conn.execute(
            "SELECT id,email,name,password_hash FROM users WHERE email=%s", (body.email,)).fetchone()
        if not user or not verify_password(body.password.get_secret_value(), user["password_hash"]):
            raise HTTPException(401, "E-mail ou senha inválidos.")
        return issue_session(conn, user)


@app.post("/auth/refresh")
async def refresh(body: RefreshInput):
    value = body.refresh_token.get_secret_value()
    with db() as conn:
        row = conn.execute("SELECT u.id,u.email,u.name,s.id AS session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_hash=%s AND s.refresh_expires_at>now() FOR UPDATE OF s",
                           (token_hash(value),)).fetchone()
        if not row:
            raise HTTPException(401, "Sessão inválida.")
        conn.execute("DELETE FROM sessions WHERE id=%s", (row["session_id"],))
        return issue_session(conn, row)


@app.get("/auth/me")
async def me(session: Session):
    return session["user"]


@app.post("/auth/logout", status_code=204)
async def logout(session: Session):
    with db() as conn:
        conn.execute("DELETE FROM sessions WHERE access_hash=%s",
                     (token_hash(session["token"]),))
    return Response(status_code=204)


def current_hour(conn, owner):
    row = conn.execute(
        "SELECT sim_now FROM sim_state WHERE owner_id=%s", (owner,)).fetchone()
    return float(row["sim_now"]) if row else 0.0


def present_case(case, now):
    case = dict(case)
    case.pop("owner_id", None)
    case["time_remaining_hours"] = float(case["deadline_at_sim"]) - now
    return case


def list_cases(conn, owner, urgency=None, status=None, missed=False):
    sql = """SELECT c.id,c.report_id,c.finding,c.evidence,c.urgency,c.confidence,c.status,c.escalation_level,
       c.current_target,c.deadline_at_sim,c.notified_at_sim,c.acknowledged_at_sim FROM cases c"""
    where, args = ["c.owner_id=%s"], [owner]
    if urgency:
        where.append("c.urgency=%s")
        args.append(urgency)
    if status:
        where.append("c.status=%s")
        args.append(status)
    if missed:
        where += ["c.urgency IN ('critical','urgent')",
                  "r.flagged_by_radiologist=false"]
        sql += " JOIN reports r ON r.owner_id=c.owner_id AND r.report_id=c.report_id"
    rows = conn.execute(sql+" WHERE "+" AND ".join(where) +
                        " ORDER BY c.id", args).fetchall()
    now = current_hour(conn, owner)
    return sorted([present_case(row, now) for row in rows],
                  key=lambda c: ({"critical": 0, "urgent": 1, "actionable": 2}[c["urgency"]], c["time_remaining_hours"], str(c["id"])))


@app.get("/cases")
async def cases(session: Session, urgency: Urgency | None = None, status: Status | None = None):
    with db() as conn:
        return list_cases(conn, session["user"]["id"], urgency, status)


@app.get("/cases/{case_id}")
async def case_detail(case_id: UUID, session: Session):
    owner = session["user"]["id"]
    with db() as conn:
        case = conn.execute(
            "SELECT * FROM cases WHERE owner_id=%s AND id=%s", (owner, case_id)).fetchone()
        if not case:
            raise HTTPException(404, "Caso não encontrado.")
        report = conn.execute(
            "SELECT text,modality,radiologist,ordering_physician,flagged_by_radiologist FROM reports WHERE owner_id=%s AND report_id=%s", (owner, case["report_id"])).fetchone()
        events = conn.execute(
            "SELECT type,detail,at_sim FROM events WHERE owner_id=%s AND case_id=%s ORDER BY at_sim,id", (owner, case_id)).fetchall()
        return {**present_case(case, current_hour(conn, owner)), "report": report, "events": events}


def command(conn, owner, op, payload):
    conn.execute(
        "INSERT INTO sim_state(owner_id) VALUES (%s) ON CONFLICT DO NOTHING", (owner,))
    conn.execute(
        "SELECT owner_id FROM sim_state WHERE owner_id=%s FOR UPDATE", (owner,))
    now = current_hour(conn, owner)
    if op == "import":
        conn.execute("DELETE FROM reports WHERE owner_id=%s", (owner,))
        for r in payload["reports"]:
            conn.execute("INSERT INTO reports(owner_id,report_id,modality,radiologist,ordering_physician,text,flagged_by_radiologist,ground_truth) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                         (owner, r["report_id"], r["modality"], r["radiologist"], r["ordering_physician"], r["text"], r["flagged_by_radiologist"], psycopg.types.json.Jsonb(r["ground_truth"])))
            findings = payload["extractions"][r["report_id"]]["findings"]
            conn.execute("INSERT INTO extractions(owner_id,report_id,findings) VALUES (%s,%s,%s)",
                         (owner, r["report_id"], psycopg.types.json.Jsonb(findings)))
            for f in findings:
                case = conn.execute("""INSERT INTO cases(owner_id,report_id,finding,evidence,urgency,deadline_hours,confidence,current_target,deadline_at_sim)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""", (owner, r["report_id"], f["finding"], f["evidence"], f["urgency"], f["deadline_hours"], f["confidence"], r["ordering_physician"], f["deadline_hours"])).fetchone()
                conn.execute("INSERT INTO events(owner_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,'detected','Achado detectado; IA sugere, humano valida',0,%s),(%s,%s,'notified',%s,0,%s)",
                             (owner, case["id"], owner, owner, case["id"], "Notificação simulada enviada a "+r["ordering_physician"], owner))
        conn.execute(
            "UPDATE sim_state SET sim_now=0 WHERE owner_id=%s", (owner,))
        count = conn.execute(
            "SELECT count(*) n FROM cases WHERE owner_id=%s", (owner,)).fetchone()["n"]
        return {"reports": len(payload["reports"]), "cases": count, "sim_now": 0}
    if op == "reset":
        conn.execute("DELETE FROM cases WHERE owner_id=%s", (owner,))
        conn.execute(
            "UPDATE sim_state SET sim_now=0 WHERE owner_id=%s", (owner,))
        reports = conn.execute(
            "SELECT r.*,e.findings FROM reports r JOIN extractions e USING(owner_id,report_id) WHERE r.owner_id=%s", (owner,)).fetchall()
        payload = {"reports": [{**r, "ground_truth": r["ground_truth"]} for r in reports],
                   "extractions": {r["report_id"]: {"findings": r["findings"]} for r in reports}}
        return command(conn, owner, "import", payload)
    if op == "advance":
        now += payload["hours"]
        conn.execute(
            "UPDATE sim_state SET sim_now=%s WHERE owner_id=%s", (now, owner))
        changed = []
        rows = conn.execute(
            "SELECT * FROM cases WHERE owner_id=%s AND status IN ('notified','escalated') AND deadline_at_sim<=%s FOR UPDATE", (owner, now)).fetchall()
        for c in rows:
            if c["escalation_level"] < 2:
                report = conn.execute(
                    "SELECT radiologist FROM reports WHERE owner_id=%s AND report_id=%s", (owner, c["report_id"])).fetchone()
                dest = report["radiologist"] if c["escalation_level"] == 0 else "Coordenação de Radiologia"
                level = c["escalation_level"]+1
                conn.execute("UPDATE cases SET escalation_level=%s,status='escalated',current_target=%s,deadline_at_sim=%s WHERE id=%s",
                             (level, dest, now+c["deadline_hours"], c["id"]))
                conn.execute("INSERT INTO events(owner_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,'escalated',%s,%s,%s)",
                             (owner, c["id"], "Escalado para "+dest, now, owner))
                changed.append({"id": str(
                    c["id"]), "status": "escalated", "escalation_level": level, "current_target": dest})
            elif not conn.execute("SELECT 1 FROM events WHERE owner_id=%s AND case_id=%s AND type='coordination_overdue'", (owner, c["id"])).fetchone():
                conn.execute(
                    "INSERT INTO events(owner_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,'coordination_overdue','Prazo estourado na coordenação',%s,%s)", (owner, c["id"], now, owner))
        return {"sim_now": now, "changed_cases": changed}
    case = conn.execute(
        "SELECT * FROM cases WHERE owner_id=%s AND id=%s FOR UPDATE", (owner, payload["id"])).fetchone()
    if not case:
        raise HTTPException(404, "Caso não encontrado.")
    if op == "acknowledge":
        if case["status"] not in ("notified", "escalated"):
            raise HTTPException(400, "Confirmação inválida.")
        conn.execute(
            "UPDATE cases SET status='read',acknowledged_at_sim=%s WHERE id=%s", (now, case["id"]))
        conn.execute("INSERT INTO events(owner_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,'read',%s,%s,%s)",
                     (owner, case["id"], "Leitura confirmada por "+payload["by"], now, owner))
        return {"id": str(case["id"]), "status": "read"}
    if case["status"] not in ("read", "action_taken") or (case["status"] == "action_taken" and not payload.get("close")):
        raise HTTPException(400, "Ação inválida.")
    state = "closed" if payload.get("close") else "action_taken"
    conn.execute("UPDATE cases SET status=%s WHERE id=%s", (state, case["id"]))
    conn.execute("INSERT INTO events(owner_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,'action_taken',%s,%s,%s)",
                 (owner, case["id"], "Ação registrada: "+payload["action"], now, owner))
    if state == "closed":
        conn.execute("INSERT INTO events(owner_id,case_id,type,detail,at_sim,actor_id) VALUES (%s,%s,'closed','Caso fechado',%s,%s)",
                     (owner, case["id"], now, owner))
    return {"id": str(case["id"]), "status": state}


@app.post("/cases/{case_id}/acknowledge")
async def acknowledge(case_id: UUID, body: AcknowledgeInput, session: Session):
    with db() as conn:
        return command(conn, session["user"]["id"], "acknowledge", {"id": str(case_id), "by": body.by})


@app.post("/cases/{case_id}/action")
async def action(case_id: UUID, body: ActionInput, session: Session):
    with db() as conn:
        return command(conn, session["user"]["id"], "action", {"id": str(case_id), **body.model_dump()})


@app.get("/simulate")
async def clock(session: Session):
    with db() as conn:
        return {"sim_now": current_hour(conn, session["user"]["id"])}


@app.post("/simulate/advance")
async def advance(session: Session, hours: Annotated[float, Query(gt=0, le=8760, allow_inf_nan=False)]):
    with db() as conn:
        return command(conn, session["user"]["id"], "advance", {"hours": hours})


@app.post("/simulate/reset")
async def reset(session: Session):
    with db() as conn:
        return command(conn, session["user"]["id"], "reset", {})


@app.get("/missed")
async def missed(session: Session):
    with db() as conn:
        return list_cases(conn, session["user"]["id"], missed=True)


@app.get("/stats")
async def stats(session: Session):
    with db() as conn:
        rows = conn.execute(
            "SELECT urgency,status,notified_at_sim,acknowledged_at_sim FROM cases WHERE owner_id=%s", (session["user"]["id"],)).fetchall()
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
    with db() as conn:
        return command(conn, session["user"]["id"], "import", body.model_dump())


@app.post("/files", status_code=201)
async def upload_file(request: Request, session: Session):
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
        conn.execute("INSERT INTO files(owner_id,file_id,mime_type,content) VALUES (%s,%s,%s,%s)",
                     (session["user"]["id"], file_id, mime, content))
    return {"file_id": file_id, "path": f"{session['user']['id']}/{file_id}", "bucket": "brightline-files"}


@app.post("/files/{file_id}/signed-url")
async def signed_url(file_id: str, session: Session, request: Request):
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(400, "Identificador de arquivo inválido.")
    expires = int(datetime.now(timezone.utc).timestamp())+60
    ticket = secrets.token_urlsafe(32)
    with db() as conn:
        exists = conn.execute("SELECT 1 FROM files WHERE owner_id=%s AND file_id=%s",
                              (session["user"]["id"], file_id)).fetchone()
        if not exists:
            raise HTTPException(404, "Arquivo não encontrado.")
        conn.execute("INSERT INTO file_links(token_hash,owner_id,file_id,expires_at) VALUES (%s,%s,%s,to_timestamp(%s))",
                     (token_hash(ticket), session["user"]["id"], file_id, expires))
    return {"url": f"{str(request.base_url).rstrip('/')}/files/{file_id}?token={ticket}", "expires_in": 60}


@app.get("/files/{file_id}")
async def download_file(file_id: str, token: str):
    if not re.fullmatch(r"[0-9a-f]{32}\.(json|png|jpg|pdf)", file_id):
        raise HTTPException(404, "Arquivo não encontrado.")
    with db() as conn:
        row = conn.execute("""SELECT f.mime_type,f.content FROM file_links l JOIN files f
          ON f.owner_id=l.owner_id AND f.file_id=l.file_id
          WHERE l.token_hash=%s AND l.file_id=%s AND l.expires_at>now()""", (token_hash(token), file_id)).fetchone()
    if not row:
        raise HTTPException(404, "Arquivo não encontrado.")
    return Response(content=bytes(row["content"]), media_type=row["mime_type"])
