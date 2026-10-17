from __future__ import annotations

import json
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("BRIGHTLINE_DATA_DIR", BASE_DIR / "data"))
DB_PATH = Path(os.getenv("BRIGHTLINE_DB_PATH", BASE_DIR / "brightline.db"))
URGENCY_ORDER = {"critical": 0, "urgent": 1, "actionable": 2}
TARGETS = {0: "ordering_physician", 1: "radiologist", 2: "Coordenação de Radiologia"}


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def initialize_database() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS reports (
                report_id TEXT PRIMARY KEY,
                modality TEXT NOT NULL,
                radiologist TEXT NOT NULL,
                ordering_physician TEXT NOT NULL,
                text TEXT NOT NULL,
                flagged_by_radiologist INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id TEXT NOT NULL REFERENCES reports(report_id),
                finding TEXT NOT NULL,
                evidence TEXT NOT NULL,
                urgency TEXT NOT NULL,
                deadline_hours REAL NOT NULL,
                confidence TEXT NOT NULL,
                status TEXT NOT NULL,
                escalation_level INTEGER NOT NULL,
                notified_at_sim REAL NOT NULL,
                deadline_at_sim REAL NOT NULL,
                acknowledged_at_sim REAL
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                detail TEXT NOT NULL,
                at_sim REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sim_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                sim_now REAL NOT NULL
            );
            INSERT OR IGNORE INTO sim_state (id, sim_now) VALUES (1, 0);
            """
        )


def load_inputs() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    with (DATA_DIR / "reports.json").open(encoding="utf-8") as file:
        reports = json.load(file)
    with (DATA_DIR / "extractions_cache.json").open(encoding="utf-8") as file:
        extractions = json.load(file)
    if not isinstance(reports, list) or not isinstance(extractions, dict):
        raise ValueError("reports.json deve ser uma lista e extractions_cache.json deve ser um objeto.")
    return reports, extractions


def seed_database() -> None:
    """Rebuild demo data from the two JSON contracts, keeping the simulated clock at zero."""
    reports, extractions = load_inputs()
    with connect() as db:
        db.execute("DELETE FROM events")
        db.execute("DELETE FROM cases")
        db.execute("DELETE FROM reports")
        db.execute("UPDATE sim_state SET sim_now = 0 WHERE id = 1")

        for report in reports:
            required = ("report_id", "modality", "radiologist", "ordering_physician", "text", "flagged_by_radiologist")
            if any(key not in report for key in required):
                raise ValueError(f"Laudo inválido: faltam campos obrigatórios em {report!r}")
            db.execute(
                """INSERT INTO reports
                   (report_id, modality, radiologist, ordering_physician, text, flagged_by_radiologist)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (report["report_id"], report["modality"], report["radiologist"],
                 report["ordering_physician"], report["text"], int(bool(report["flagged_by_radiologist"]))),
            )

        for report_id, extraction in extractions.items():
            report = db.execute("SELECT * FROM reports WHERE report_id = ?", (report_id,)).fetchone()
            if report is None:
                raise ValueError(f"Extração {report_id} não tem laudo correspondente em reports.json.")
            for finding in extraction.get("findings", []):
                if finding.get("evidence", "") not in report["text"]:
                    raise ValueError(f"A evidência de {report_id} precisa ser um trecho literal do laudo.")
                urgency = finding["urgency"]
                if urgency not in URGENCY_ORDER:
                    raise ValueError(f"Urgência inválida em {report_id}: {urgency}")
                deadline = float(finding["deadline_hours"])
                cursor = db.execute(
                    """INSERT INTO cases
                       (report_id, finding, evidence, urgency, deadline_hours, confidence, status,
                        escalation_level, notified_at_sim, deadline_at_sim, acknowledged_at_sim)
                       VALUES (?, ?, ?, ?, ?, ?, 'notified', 0, 0, ?, NULL)""",
                    (report_id, finding["finding"], finding["evidence"], urgency, deadline,
                     finding["confidence"], deadline),
                )
                db.execute(
                    "INSERT INTO events (case_id, type, detail, at_sim) VALUES (?, ?, ?, ?)",
                    (cursor.lastrowid, "notified", f"Notificação enviada a {report['ordering_physician']}", 0),
                )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Brightline API", description="Backend de demonstração do Brightline", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AcknowledgeRequest(BaseModel):
    by: str = Field(min_length=1)


class ActionRequest(BaseModel):
    action: str = Field(min_length=1)
    close: bool = False


def get_sim_now(db: sqlite3.Connection) -> float:
    return float(db.execute("SELECT sim_now FROM sim_state WHERE id = 1").fetchone()[0])


def current_target(db: sqlite3.Connection, row: sqlite3.Row) -> str:
    report = db.execute(
        "SELECT ordering_physician, radiologist FROM reports WHERE report_id = ?",
        (row["report_id"],),
    ).fetchone()
    level = int(row["escalation_level"])
    if level == 0:
        return report["ordering_physician"]
    if level == 1:
        return report["radiologist"]
    return "Coordenação de Radiologia"


def serialize_case(db: sqlite3.Connection, row: sqlite3.Row, sim_now: float) -> dict[str, Any]:
    return {
        "id": row["id"],
        "report_id": row["report_id"],
        "finding": row["finding"],
        "evidence": row["evidence"],
        "urgency": row["urgency"],
        "confidence": row["confidence"],
        "status": row["status"],
        "escalation_level": row["escalation_level"],
        "current_target": current_target(db, row),
        "time_remaining_hours": float(row["deadline_at_sim"] - sim_now),
    }


def event(db: sqlite3.Connection, case_id: int, event_type: str, detail: str, at_sim: float) -> None:
    db.execute(
        "INSERT INTO events (case_id, type, detail, at_sim) VALUES (?, ?, ?, ?)",
        (case_id, event_type, detail, at_sim),
    )


def require_case(db: sqlite3.Connection, case_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Caso não encontrado.")
    return row


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "Brightline API"}


@app.get("/cases")
def list_cases(
    urgency: str | None = Query(default=None),
    status: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    with connect() as db:
        query = "SELECT * FROM cases WHERE 1 = 1"
        params: list[Any] = []
        if urgency:
            query += " AND urgency = ?"
            params.append(urgency)
        if status:
            query += " AND status = ?"
            params.append(status)
        rows = db.execute(query, params).fetchall()
        sim_now = get_sim_now(db)
        result = [serialize_case(db, row, sim_now) for row in rows]
        result.sort(key=lambda case: (URGENCY_ORDER.get(case["urgency"], 99), case["time_remaining_hours"]))
        return result


@app.get("/cases/{case_id}")
def get_case(case_id: int) -> dict[str, Any]:
    with connect() as db:
        row = require_case(db, case_id)
        result = serialize_case(db, row, get_sim_now(db))
        report = db.execute(
            """SELECT text, modality, radiologist, ordering_physician, flagged_by_radiologist
               FROM reports WHERE report_id = ?""",
            (row["report_id"],),
        ).fetchone()
        result["report"] = {
            "text": report["text"],
            "modality": report["modality"],
            "radiologist": report["radiologist"],
            "ordering_physician": report["ordering_physician"],
            "flagged_by_radiologist": bool(report["flagged_by_radiologist"]),
        }
        result["events"] = [
            {"type": item["type"], "detail": item["detail"], "at_sim": item["at_sim"]}
            for item in db.execute(
                "SELECT type, detail, at_sim FROM events WHERE case_id = ? ORDER BY at_sim, id",
                (case_id,),
            ).fetchall()
        ]
        return result


@app.post("/cases/{case_id}/acknowledge")
def acknowledge_case(case_id: int, body: AcknowledgeRequest) -> dict[str, Any]:
    with connect() as db:
        row = require_case(db, case_id)
        if row["status"] not in ("notified", "escalated"):
            raise HTTPException(status_code=400, detail="Só é possível confirmar a leitura de um caso notificado ou escalado.")
        sim_now = get_sim_now(db)
        db.execute(
            "UPDATE cases SET status = 'read', acknowledged_at_sim = ? WHERE id = ?",
            (sim_now, case_id),
        )
        event(db, case_id, "read", f"Leitura confirmada por {body.by}", sim_now)
        updated = db.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        return serialize_case(db, updated, sim_now)


@app.post("/cases/{case_id}/action")
def record_action(case_id: int, body: ActionRequest) -> dict[str, Any]:
    with connect() as db:
        row = require_case(db, case_id)
        if row["status"] not in ("read", "action_taken"):
            raise HTTPException(status_code=400, detail="Confirme a leitura antes de registrar uma ação.")
        sim_now = get_sim_now(db)
        if row["status"] == "action_taken" and not body.close:
            raise HTTPException(status_code=400, detail="O caso já tem uma ação registrada; use close=true para fechá-lo.")
        next_status = "closed" if body.close else "action_taken"
        db.execute("UPDATE cases SET status = ? WHERE id = ?", (next_status, case_id))
        event(db, case_id, "action", f"Ação registrada: {body.action}", sim_now)
        if body.close:
            event(db, case_id, "closed", "Caso fechado", sim_now)
        updated = db.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        return serialize_case(db, updated, sim_now)


@app.post("/simulate/advance")
def advance_simulation(hours: float = Query(gt=0)) -> dict[str, Any]:
    with connect() as db:
        sim_now = get_sim_now(db) + hours
        db.execute("UPDATE sim_state SET sim_now = ? WHERE id = 1", (sim_now,))
        rows = db.execute(
            "SELECT * FROM cases WHERE status IN ('notified', 'escalated') AND deadline_at_sim <= ? ORDER BY id",
            (sim_now,),
        ).fetchall()
        changed: list[dict[str, Any]] = []
        for row in rows:
            level = int(row["escalation_level"])
            if level < 2:
                new_level = level + 1
                db.execute(
                    "UPDATE cases SET status = 'escalated', escalation_level = ?, deadline_at_sim = ? WHERE id = ?",
                    (new_level, sim_now + float(row["deadline_hours"]), row["id"]),
                )
                updated = db.execute("SELECT * FROM cases WHERE id = ?", (row["id"],)).fetchone()
                target = current_target(db, updated)
                if new_level == 1:
                    detail = f"Escalado para {target} (radiologista)"
                else:
                    detail = f"Escalado para {target}"
                event(db, row["id"], "escalated", detail, sim_now)
                changed.append(serialize_case(db, updated, sim_now))
            else:
                already_recorded = db.execute(
                    "SELECT 1 FROM events WHERE case_id = ? AND type = 'deadline_missed'",
                    (row["id"],),
                ).fetchone()
                if already_recorded is None:
                    event(db, row["id"], "deadline_missed", "Prazo estourado na coordenação", sim_now)
        return {"sim_now": sim_now, "changed": changed}


@app.post("/simulate/reset")
def reset_simulation() -> dict[str, Any]:
    try:
        seed_database()
    except (OSError, json.JSONDecodeError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível recarregar os dados. Verifique reports.json e extractions_cache.json: {exc}",
        ) from exc
    with connect() as db:
        count = db.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
    return {"sim_now": 0, "cases_loaded": count}


@app.get("/missed")
def list_missed() -> list[dict[str, Any]]:
    with connect() as db:
        sim_now = get_sim_now(db)
        rows = db.execute(
            """SELECT cases.* FROM cases JOIN reports USING (report_id)
               WHERE cases.urgency IN ('critical', 'urgent') AND reports.flagged_by_radiologist = 0"""
        ).fetchall()
        result = [serialize_case(db, row, sim_now) for row in rows]
        result.sort(key=lambda case: (URGENCY_ORDER.get(case["urgency"], 99), case["time_remaining_hours"]))
        return result


@app.get("/stats")
def get_stats() -> dict[str, Any]:
    with connect() as db:
        by_urgency = {urgency: 0 for urgency in URGENCY_ORDER}
        for row in db.execute("SELECT urgency, COUNT(*) AS count FROM cases GROUP BY urgency"):
            by_urgency[row["urgency"]] = row["count"]
        known_statuses = ("detected", "notified", "read", "action_taken", "closed", "escalated")
        by_status = {status: 0 for status in known_statuses}
        for row in db.execute("SELECT status, COUNT(*) AS count FROM cases GROUP BY status"):
            by_status[row["status"]] = row["count"]
        avg = db.execute(
            "SELECT AVG(acknowledged_at_sim - notified_at_sim) FROM cases WHERE acknowledged_at_sim IS NOT NULL"
        ).fetchone()[0]
        return {"by_urgency": by_urgency, "by_status": by_status, "avg_hours_to_ack": avg}
