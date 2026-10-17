from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "brightline.db"

app = FastAPI(title="Brightline API", description="Backend de demonstração com dados sintéticos")


class ReportInput(BaseModel):
    report_id: str
    modality: str
    radiologist: str
    ordering_physician: str
    text: str
    flagged_by_radiologist: bool
    ground_truth: list[dict[str, str]] = Field(default_factory=list)


class FindingInput(BaseModel):
    finding: str
    evidence: str
    urgency: Literal["critical", "urgent", "actionable"]
    deadline_hours: int
    confidence: Literal["high", "medium", "low"]


class ExtractionInput(BaseModel):
    report_id: str
    findings: list[FindingInput]


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def initialize_database() -> None:
    with closing(connect()) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY, modality TEXT NOT NULL, radiologist TEXT NOT NULL,
                ordering_physician TEXT NOT NULL, text TEXT NOT NULL,
                flagged_by_radiologist INTEGER NOT NULL, ground_truth_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES reports(id),
                finding TEXT NOT NULL, evidence TEXT NOT NULL, urgency TEXT NOT NULL,
                deadline_hours INTEGER NOT NULL, confidence TEXT NOT NULL,
                status TEXT NOT NULL, escalation_level INTEGER NOT NULL,
                notified_at_sim REAL NOT NULL, deadline_at_sim REAL NOT NULL,
                acknowledged_at_sim REAL
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL REFERENCES cases(id), type TEXT NOT NULL,
                detail TEXT NOT NULL, at_sim REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sim_state (
                id INTEGER PRIMARY KEY CHECK (id = 1), sim_now REAL NOT NULL
            );
            INSERT OR IGNORE INTO sim_state(id, sim_now) VALUES (1, 0);
            """
        )
        db.commit()


@app.on_event("startup")
def startup() -> None:
    initialize_database()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
