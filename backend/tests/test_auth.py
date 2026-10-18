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
            SignupInput(name="Ana Silva", email="ana@example.test", password="12345678",
                        institutions=["hctco_unifeso"])
        body = SignupInput(name=" Ana Silva ", email=" ANA@example.test ", password="123456789",
                           institutions=["hctco_unifeso"])
        self.assertEqual(body.name, "Ana Silva")
        self.assertEqual(body.email, "ana@example.test")
        self.assertEqual(body.institutions, ["hctco_unifeso"])
        self.assertEqual(
            SignupInput(
                name="Ana Silva",
                email="ana@example.test",
                password="123456789",
                institutions=["hctco_unifeso", "hospital_sao_jose"],
            ).institutions,
            ["hctco_unifeso", "hospital_sao_jose"],
        )

    def test_password_hash_is_salted_and_verified(self):
        encoded = password_hash("test-password")
        self.assertNotEqual(encoded, password_hash("test-password"))
        self.assertTrue(verify_password("test-password", encoded))
        self.assertFalse(verify_password("wrong-password", encoded))
        self.assertFalse(verify_password("test-password", "malformed"))


@unittest.skipUnless(os.getenv("BRIGHTLINE_TEST_DATABASE") == "1", "Set BRIGHTLINE_TEST_DATABASE=1 for PostgreSQL integration")
class AuthDatabaseTests(unittest.TestCase):
    def test_complete_account_lifecycle(self):
        email = f"auth-test-{uuid4().hex}@example.test"
        password = secrets.token_urlsafe(20)
        payload = {"name": "Teste Auth", "email": email, "password": password,
                   "institutions": ["hctco_unifeso"]}
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
                    self.assertEqual(
                        conn.execute(
                            "SELECT institution_id FROM user_institutions WHERE user_id=%s",
                            (user_id,),
                        ).fetchall(),
                        [{"institution_id": "hctco_unifeso"}],
                    )
                self.assertEqual(client.post("/auth/signup", json=payload).status_code, 409)
                credentials = {"email": email.upper(), "password": password,
                               "institution_id": "hctco_unifeso"}
                self.assertEqual(client.post("/auth/login", json={**credentials, "password": "wrong"}).status_code, 401)
                login = client.post("/auth/login", json=credentials)
                self.assertEqual(login.status_code, 200)
                session = login.json()
                self.assertEqual(session["user"]["institutions"], ["hctco_unifeso"])
                headers = {"Authorization": f"Bearer {session['access_token']}"}
                me = client.get("/auth/me", headers=headers).json()
                self.assertEqual(me["id"], user_id)
                self.assertEqual(me["institutions"], ["hctco_unifeso"])
                denied = client.post(
                    "/auth/login",
                    json={**credentials, "institution_id": "hospital_sao_jose"},
                )
                self.assertEqual(denied.status_code, 403)
                changed = client.put(
                    "/auth/institutions",
                    headers=headers,
                    json={"institutions": ["hctco_unifeso", "hospital_sao_jose"]},
                )
                self.assertEqual(changed.json()["institutions"], ["hctco_unifeso", "hospital_sao_jose"])
                switched = client.put("/auth/institution", headers=headers,
                                      json={"institution_id": "hospital_sao_jose"})
                self.assertEqual(switched.status_code, 200)
                self.assertEqual(switched.json()["institution_id"], "hospital_sao_jose")
                refreshed = client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})
                self.assertEqual(refreshed.status_code, 200)
                self.assertEqual(client.get("/auth/me", headers=headers).status_code, 401)
                self.assertEqual(client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code, 401)
                session = refreshed.json()
                self.assertEqual(session["user"]["institution_id"], "hospital_sao_jose")
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
