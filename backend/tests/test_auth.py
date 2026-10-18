"""Auth policy and opt-in integration against the configured PostgreSQL."""
import os
import secrets
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app, db, password_hash, verify_password
from app.models import SignupInput


class AuthPolicyTests(unittest.TestCase):
    def test_password_policy_and_normalization(self):
        with self.assertRaises(ValidationError):
            SignupInput(name="Ana Silva", email="ana@example.test", password="12345678", institutions=["hctco-unifeso"])
        body = SignupInput(name=" Ana Silva ", email=" ANA@example.test ", password="123456789", institutions=["hctco-unifeso"])
        self.assertEqual(body.name, "Ana Silva")
        self.assertEqual(body.email, "ana@example.test")
        self.assertEqual(body.institutions, ["hctco-unifeso"])
        with self.assertRaises(ValidationError):
            SignupInput(name="Ana Silva", email="ana@example.test", password="123456789", institutions=[])
        with self.assertRaises(ValidationError):
            SignupInput(name="Ana Silva", email="ana@example.test", password="123456789", institutions=["Brightline"])

    def test_password_hash_is_salted_and_verified(self):
        encoded = password_hash("test-password")
        self.assertNotEqual(encoded, password_hash("test-password"))
        self.assertTrue(verify_password("test-password", encoded))
        self.assertFalse(verify_password("wrong-password", encoded))
        self.assertFalse(verify_password("test-password", "malformed"))


@unittest.skipUnless(os.getenv("BRIGHTLINE_TEST_DATABASE") == "1", "Set BRIGHTLINE_TEST_DATABASE=1 for PostgreSQL integration")
class AuthDatabaseTests(unittest.TestCase):
    @staticmethod
    def report_payload(text="Hemorragia subaracnóidea aguda no exame."):
        evidence = "Hemorragia subaracnóidea aguda"
        return {
            "report_id": "SHARED-REPORT-01",
            "modality": "TC",
            "radiologist": "Dra. Ana",
            "ordering_physician": "Dr. Paulo",
            "text": text,
            "flagged_by_radiologist": False,
            "ground_truth": [],
            "findings": [{
                "finding": "Hemorragia subaracnóidea",
                "evidence": evidence,
                "urgency": "critical",
                "deadline_hours": 1,
                "confidence": "high",
            }],
        }

    def test_institution_data_and_file_isolation(self):
        email = f"scope-test-{uuid4().hex}@example.test"
        other_email = f"scope-other-{uuid4().hex}@example.test"
        password = secrets.token_urlsafe(20)
        user_id = other_user_id = None
        hospital_a = "hctco-unifeso"
        hospital_b = "hospital-sao-jose-teresopolis"
        with TestClient(app) as client:
            try:
                signup = client.post("/auth/signup", json={
                    "name": "Teste Escopo", "email": email, "password": password,
                    "institutions": [hospital_a, hospital_b],
                })
                self.assertEqual(signup.status_code, 201)
                user_id = signup.json()["user"]["id"]
                session = client.post("/auth/login", json={
                    "email": email, "password": password, "institution_id": hospital_a,
                }).json()
                headers = {"Authorization": f"Bearer {session['access_token']}"}
                created_a = client.post("/reports", json=self.report_payload(), headers=headers)
                self.assertEqual(created_a.status_code, 201, created_a.text)
                case_a = client.get("/cases", headers=headers).json()[0]["id"]

                self.assertEqual(client.post("/auth/active-institution", json={"institution_id": hospital_b}, headers=headers).status_code, 200)
                self.assertEqual(client.get("/cases", headers=headers).json(), [])
                created_b = client.post("/reports", json=self.report_payload(), headers=headers)
                self.assertEqual(created_b.status_code, 201, created_b.text)
                self.assertEqual(len(client.get("/cases", headers=headers).json()), 1)
                self.assertEqual(client.get(f"/cases/{case_a}", headers=headers).status_code, 404)

                edited = self.report_payload("Novo achado: Hemorragia subaracnóidea aguda confirmada.")
                self.assertEqual(client.put(f"/reports/{edited['report_id']}", json=edited, headers=headers).status_code, 200)
                self.assertIn("confirmada", client.get(f"/reports/{edited['report_id']}", headers=headers).json()["text"])
                self.assertEqual(client.delete(f"/reports/{edited['report_id']}", headers=headers).status_code, 204)
                self.assertEqual(client.get("/cases", headers=headers).json(), [])

                self.assertEqual(client.post("/auth/active-institution", json={"institution_id": hospital_a}, headers=headers).status_code, 200)
                self.assertEqual(len(client.get("/cases", headers=headers).json()), 1)
                file_response = client.post("/files", content=b"PDF de teste", headers={**headers, "Content-Type": "application/pdf"})
                self.assertEqual(file_response.status_code, 201)
                file_id = file_response.json()["file_id"]
                self.assertEqual(len(client.get("/files", headers=headers).json()), 1)
                signed = client.post(f"/files/{file_id}/signed-url", headers=headers).json()["url"]
                self.assertEqual(client.get(signed).content, b"PDF de teste")
                client.post("/auth/active-institution", json={"institution_id": hospital_b}, headers=headers)
                self.assertEqual(client.get(signed).status_code, 404)
                self.assertEqual(client.get("/files", headers=headers).json(), [])

                other_signup = client.post("/auth/signup", json={
                    "name": "Outra médica", "email": other_email, "password": password,
                    "institutions": [hospital_a],
                })
                self.assertEqual(other_signup.status_code, 201)
                other_user_id = other_signup.json()["user"]["id"]
                other_session = client.post("/auth/login", json={
                    "email": other_email, "password": password, "institution_id": hospital_a,
                }).json()
                other_headers = {"Authorization": f"Bearer {other_session['access_token']}"}
                self.assertEqual(client.get(f"/cases/{case_a}", headers=other_headers).status_code, 404)
                client.post("/auth/logout", headers=other_headers)

                self.assertEqual(client.post("/auth/institutions", json={
                    "institutions": [hospital_a], "active_institution_id": hospital_a,
                }, headers=headers).status_code, 200)
                self.assertEqual(client.post("/auth/active-institution", json={"institution_id": hospital_b}, headers=headers).status_code, 403)
                self.assertEqual(len(client.get("/files", headers=headers).json()), 1)
                self.assertEqual(client.post("/auth/logout", headers=headers).status_code, 204)
            finally:
                with db() as conn:
                    if user_id:
                        conn.execute("DELETE FROM users WHERE id=%s AND email=%s", (user_id, email))
                    if other_user_id:
                        conn.execute("DELETE FROM users WHERE id=%s AND email=%s", (other_user_id, other_email))

    def test_complete_account_lifecycle(self):
        email = f"auth-test-{uuid4().hex}@example.test"
        password = secrets.token_urlsafe(20)
        payload = {"name": "Teste Auth", "email": email, "password": password, "institutions": ["hctco-unifeso", "hospital-sao-jose-teresopolis"]}
        user_id = None
        with TestClient(app) as client:
            try:
                self.assertEqual(client.post("/auth/signup", json={**payload, "password": "12345678"}).status_code, 422)
                signup = client.post("/auth/signup", json=payload)
                self.assertEqual(signup.status_code, 201)
                session = signup.json()
                user_id = session["user"]["id"]
                self.assertNotIn("access_token", session)
                self.assertNotIn("refresh_token", session)
                with db() as conn:
                    self.assertEqual(conn.execute("SELECT count(*) AS total FROM sessions WHERE user_id=%s", (user_id,)).fetchone()["total"], 0)
                    row = conn.execute("SELECT name,password_hash FROM users WHERE id=%s", (user_id,)).fetchone()
                    self.assertEqual(row["name"], "Teste Auth")
                    self.assertNotEqual(row["password_hash"], password)
                    self.assertTrue(verify_password(password, row["password_hash"]))
                self.assertEqual(client.post("/auth/signup", json=payload).status_code, 409)
                credentials = {"email": email.upper(), "password": password}
                self.assertEqual(client.post("/auth/login", json={**credentials, "password": "wrong", "institution_id": "hctco-unifeso"}).status_code, 401)
                self.assertEqual(client.post("/auth/login", json=credentials).status_code, 400)
                login = client.post("/auth/login", json={**credentials, "institution_id": "hctco-unifeso"})
                self.assertEqual(login.status_code, 200)
                session = login.json()
                headers = {"Authorization": f"Bearer {session['access_token']}"}
                self.assertEqual(client.get("/auth/me", headers=headers).json()["id"], user_id)
                self.assertEqual(client.get("/auth/me", headers=headers).json()["active_institution_id"], "hctco-unifeso")
                self.assertEqual(client.post("/auth/active-institution", json={"institution_id": "outro-hospital"}, headers=headers).status_code, 403)
                switched = client.post("/auth/active-institution", json={"institution_id": "hospital-sao-jose-teresopolis"}, headers=headers)
                self.assertEqual(switched.status_code, 200)
                self.assertEqual(client.get("/auth/me", headers=headers).json()["active_institution_id"], "hospital-sao-jose-teresopolis")
                self.assertEqual(client.post("/auth/institutions", json={"institutions": [], "active_institution_id": "hctco-unifeso"}, headers=headers).status_code, 422)
                self.assertEqual(client.post("/auth/institutions", json={"institutions": ["hctco-unifeso"], "active_institution_id": "hctco-unifeso"}, headers=headers).status_code, 200)
                refreshed = client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})
                self.assertEqual(refreshed.status_code, 200)
                self.assertEqual(client.get("/auth/me", headers=headers).status_code, 401)
                self.assertEqual(client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code, 401)
                session = refreshed.json()
                headers = {"Authorization": f"Bearer {session['access_token']}"}
                self.assertEqual(client.post("/auth/logout", headers=headers).status_code, 204)
                self.assertEqual(client.get("/auth/me", headers=headers).status_code, 401)
                self.assertEqual(client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code, 401)
            finally:
                if user_id:
                    with db() as conn:
                        conn.execute("DELETE FROM users WHERE id=%s AND email=%s", (user_id, email))


if __name__ == "__main__":
    unittest.main()
