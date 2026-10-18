import asyncio
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app import main
from app.models import CommunicationInput


class FakeResult:
    def __init__(self, row=None, rows=None):
        self.row = row
        self.rows = rows or []

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class FakeConnection:
    def __init__(self, row=None, rows=None):
        self.statements = []
        self.row = row
        self.rows = rows or []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        self.statements.append((query, params))
        if "INSERT INTO communications" in query:
            return FakeResult({
                "id": "msg-1",
                "peer_name": params[2],
                "channel": params[3],
                "body": params[4],
                "report_id": params[5],
                "email_to": params[6],
                "author_id": params[7],
                "author_name": params[8],
                "created_at": "2026-10-18T12:00:00Z",
            })
        if "FROM reports" in query:
            return FakeResult({"ok": 1} if self.row else None)
        return FakeResult(rows=self.rows)


SESSION = {
    "user": {
        "id": "owner",
        "name": "Ana",
        "institutions": ["hctco-unifeso"],
        "active_institution_id": "hctco-unifeso",
        "view_all_reports": False,
    }
}


class CommunicationTests(unittest.TestCase):
    def test_chat_requires_a_known_physician(self):
        connection = FakeConnection(row=None)
        with patch.object(main, "db", return_value=connection), self.assertRaises(HTTPException) as caught:
            asyncio.run(main.create_communication(CommunicationInput(
                peer_name="Dra. Inexistente", body="Olá", channel="chat"
            ), SESSION))
        self.assertEqual(caught.exception.status_code, 404)
        self.assertFalse(any("INSERT" in sql for sql, _ in connection.statements))

    def test_email_is_stored_for_a_known_physician(self):
        connection = FakeConnection(row=True)
        with patch.object(main, "db", return_value=connection):
            saved = asyncio.run(main.create_communication(CommunicationInput(
                peer_name="Dr. Lima",
                body="Segue o laudo R-004.",
                channel="email",
                report_id="R-004",
                email_to="lima@exemplo.org",
            ), SESSION))
        self.assertEqual(saved["channel"], "email")
        self.assertEqual(saved["email_to"], "lima@exemplo.org")
        self.assertTrue(any("INSERT INTO communications" in sql for sql, _ in connection.statements))

    def test_invalid_email_is_rejected(self):
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(main.create_communication(CommunicationInput(
                peer_name="Dr. Lima", body="Oi", channel="email", email_to="sem-arroba"
            ), SESSION))
        self.assertEqual(caught.exception.status_code, 422)
