"""API Brightline: Supabase Auth, Postgres e Storage com isolamento por usuário."""
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .models import (AcknowledgeInput, ActionInput, Credentials, ImportInput,
                     RefreshInput, Status, Urgency)
from .supabase import SupabaseGateway


async def get_gateway():
    try:
        return SupabaseGateway(get_settings())
    except ValueError as exc:
        raise HTTPException(503, str(exc)) from None


Gateway = Annotated[SupabaseGateway, Depends(get_gateway)]
bearer = HTTPBearer(auto_error=False)


async def authenticated(gateway: Gateway,
                        credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Informe o access_token do Supabase.", headers={"WWW-Authenticate": "Bearer"})
    user = await gateway.request("GET", "/auth/v1/user", token=credentials.credentials)
    if not user or not user.get("id"):
        raise HTTPException(401, "Sessão inválida.")
    return {"token": credentials.credentials, "user": user}


Session = Annotated[dict, Depends(authenticated)]


@asynccontextmanager
async def lifespan(app):
    # Migrações são aplicadas explicitamente; iniciar a API nunca altera o banco.
    settings = get_settings()
    yield


app = FastAPI(title="Brightline API", version="0.2.0",
              description="Dados sintéticos, Supabase Auth e comunicação com validação humana.",
              lifespan=lifespan)

# Permite importar a aplicação para inspecionar OpenAPI sem credenciais.
try:
    origins = get_settings().cors_origins
except ValueError:
    origins = ("http://localhost:5173", "http://127.0.0.1:5173")
app.add_middleware(CORSMiddleware, allow_origins=list(origins), allow_credentials=False,
                   allow_methods=["GET", "POST", "DELETE"],
                   allow_headers=["Authorization", "Content-Type"])


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Pydantic inclui input nos erros; não ecoar senhas, tokens ou laudos.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()]})


@app.middleware("http")
async def no_store_auth(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/auth") or request.headers.get("authorization"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "provider": "supabase"}


@app.get("/ready")
async def ready(gateway: Gateway, session: Session):
    await gateway.rows("sim_state", session["token"], {"select": "owner_id", "order": "owner_id"})
    return {"status": "ok", "database": "supabase"}


@app.post("/auth/signup", status_code=201)
async def signup(body: Credentials, gateway: Gateway):
    return await gateway.request("POST", "/auth/v1/signup", json={
        "email": body.email, "password": body.password.get_secret_value()})


@app.post("/auth/login")
async def login(body: Credentials, gateway: Gateway):
    return await gateway.request("POST", "/auth/v1/token", params={"grant_type": "password"},
                                  json={"email": body.email, "password": body.password.get_secret_value()})


@app.post("/auth/refresh")
async def refresh(body: RefreshInput, gateway: Gateway):
    return await gateway.request("POST", "/auth/v1/token", params={"grant_type": "refresh_token"},
                                  json={"refresh_token": body.refresh_token.get_secret_value()})


@app.get("/auth/me")
async def me(session: Session):
    return session["user"]


@app.post("/auth/logout", status_code=204)
async def logout(gateway: Gateway, session: Session):
    await gateway.request("POST", "/auth/v1/logout", token=session["token"], params={"scope": "local"})
    return Response(status_code=204)


async def current_hour(gateway, token):
    state = await gateway.rows("sim_state", token, {"select": "sim_now", "order": "owner_id"})
    return float(state[0]["sim_now"]) if state else 0


def present_case(case, now):
    case = dict(case)
    # Nunca retorna owner_id, gabarito ou material do cache ao front.
    case.pop("owner_id", None)
    case["time_remaining_hours"] = float(case["deadline_at_sim"]) - now
    return case


async def list_cases(gateway, token, urgency=None, status=None, missed=False):
    params = {"select": "id,report_id,finding,evidence,urgency,confidence,status,escalation_level,current_target,deadline_at_sim,notified_at_sim,acknowledged_at_sim",
              "order": "id"}
    if urgency:
        params["urgency"] = "eq." + urgency
    if status:
        params["status"] = "eq." + status
    if missed:
        params["urgency"] = "in.(critical,urgent)"
        params["select"] += ",reports!inner(flagged_by_radiologist)"
        params["reports.flagged_by_radiologist"] = "eq.false"
    cases = await gateway.rows("cases", token, params)
    now = await current_hour(gateway, token)
    for case in cases:
        case.pop("reports", None)
    return sorted([present_case(c, now) for c in cases],
                  key=lambda c: ({"critical": 0, "urgent": 1, "actionable": 2}[c["urgency"]], c["time_remaining_hours"], c["id"]))


@app.get("/cases")
async def cases(gateway: Gateway, session: Session, urgency: Urgency | None = None, status: Status | None = None):
    return await list_cases(gateway, session["token"], urgency, status)


@app.get("/cases/{case_id}")
async def case_detail(case_id: UUID, gateway: Gateway, session: Session):
    token = session["token"]
    rows = await gateway.rows("cases", token, {"id": f"eq.{case_id}", "select": "*", "order": "id"})
    if not rows:
        raise HTTPException(404, "Caso não encontrado.")
    case = rows[0]
    reports = await gateway.rows("reports", token, {"report_id": "eq." + case["report_id"],
        "select": "text,modality,radiologist,ordering_physician,flagged_by_radiologist", "order": "report_id"})
    events = await gateway.rows("events", token, {"case_id": f"eq.{case_id}",
        "select": "type,detail,at_sim", "order": "at_sim,id"})
    return {**present_case(case, await current_hour(gateway, token)), "report": reports[0], "events": events}


@app.post("/cases/{case_id}/acknowledge")
async def acknowledge(case_id: UUID, body: AcknowledgeInput, gateway: Gateway, session: Session):
    return await gateway.command("acknowledge", {"id": str(case_id), "by": body.by}, session["token"])


@app.post("/cases/{case_id}/action")
async def action(case_id: UUID, body: ActionInput, gateway: Gateway, session: Session):
    return await gateway.command("action", {"id": str(case_id), **body.model_dump()}, session["token"])


@app.get("/simulate")
async def clock(gateway: Gateway, session: Session):
    return {"sim_now": await current_hour(gateway, session["token"])}


@app.post("/simulate/advance")
async def advance(gateway: Gateway, session: Session, hours: Annotated[float, Query(gt=0, le=8760, allow_inf_nan=False)]):
    return await gateway.command("advance", {"hours": hours}, session["token"])


@app.post("/simulate/reset")
async def reset(gateway: Gateway, session: Session):
    return await gateway.command("reset", {}, session["token"])


@app.get("/missed")
async def missed(gateway: Gateway, session: Session):
    return await list_cases(gateway, session["token"], missed=True)


@app.get("/stats")
async def stats(gateway: Gateway, session: Session):
    rows = await gateway.rows("cases", session["token"], {
        "select": "urgency,status,notified_at_sim,acknowledged_at_sim", "order": "id"})
    by_urgency = {k: 0 for k in ("critical", "urgent", "actionable")}
    by_status = {k: 0 for k in ("detected", "notified", "read", "action_taken", "closed", "escalated")}
    elapsed = []
    for row in rows:
        by_urgency[row["urgency"]] += 1
        by_status[row["status"]] += 1
        if row["acknowledged_at_sim"] is not None:
            elapsed.append(float(row["acknowledged_at_sim"]) - float(row["notified_at_sim"]))
    return {"by_urgency": by_urgency, "by_status": by_status,
            "avg_hours_to_ack": sum(elapsed) / len(elapsed) if elapsed else None}


@app.post("/imports")
async def import_data(body: ImportInput, gateway: Gateway, session: Session):
    return await gateway.command("import", body.model_dump(), session["token"])


@app.post("/files", status_code=201)
async def upload_file(request: Request, gateway: Gateway, session: Session):
    types = {"application/json": "json", "image/png": "png", "image/jpeg": "jpg", "application/pdf": "pdf"}
    content_type = request.headers.get("content-type", "").split(";")[0]
    if content_type not in types:
        raise HTTPException(415, "Tipos aceitos: JSON, PNG, JPEG e PDF.")
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(413, "Arquivo deve ter até 10 MB.")
    if not content:
        raise HTTPException(400, "Arquivo vazio.")
    file_id = f"{uuid4()}.{types[content_type]}"
    path = f"{session['user']['id']}/{file_id}"
    await gateway.request("POST", "/storage/v1/object/brightline-files/" + path,
                          token=session["token"], content=bytes(content), content_type=content_type)
    return {"file_id": file_id, "path": path, "bucket": "brightline-files"}


@app.post("/files/{file_id}/signed-url")
async def signed_url(file_id: str, gateway: Gateway, session: Session):
    # O cliente informa somente o nome, nunca a pasta de outro usuário.
    from pathlib import PurePosixPath
    import re
    if not re.fullmatch(r"[0-9a-f-]{36}\.(json|png|jpg|pdf)", file_id) or PurePosixPath(file_id).name != file_id:
        raise HTTPException(400, "Identificador de arquivo inválido.")
    result = await gateway.request("POST", f"/storage/v1/object/sign/brightline-files/{session['user']['id']}/{file_id}",
                                    token=session["token"], json={"expiresIn": 60})
    return {"url": gateway.settings.url + "/storage/v1" + result["signedURL"], "expires_in": 60}
