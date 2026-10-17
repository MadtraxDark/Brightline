"""Testes da API contra o protocolo REST simulado do Supabase."""
import asyncio
import base64
import json
import os
import unittest
from unittest.mock import patch
from uuid import uuid4

import httpx

from app.config import Settings, get_settings
from app.main import app, get_gateway
from app.supabase import SupabaseGateway


USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"


class ApiClient:
    def request(self, method, path, **kwargs):
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                return await client.request(method, path, **kwargs)
        return asyncio.run(run())

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def close(self):
        pass


class SupabaseApiTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.handler = lambda request: httpx.Response(200, json=[])
        def transport(request):
            self.requests.append(request)
            if request.url.path == "/auth/v1/user":
                if request.headers.get("authorization") != "Bearer good-token":
                    return httpx.Response(401, json={"message": "invalid token"})
                return httpx.Response(200, json={"id": USER, "email": "test@example.org"})
            return self.handler(request)
        gateway = SupabaseGateway(Settings("https://example.supabase.co", "sb_publishable_test"),
                                  transport=httpx.MockTransport(transport))
        async def override():
            return gateway
        app.dependency_overrides[get_gateway] = override
        self.client = ApiClient()
        self.headers = {"Authorization": "Bearer good-token"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()

    def test_health_and_protected_routes(self):
        self.assertEqual(self.client.get("/health").json()["provider"], "supabase")
        for path in ("/cases", "/stats", "/missed", "/simulate", "/ready", "/auth/me"):
            self.assertEqual(self.client.get(path).status_code, 401, path)
        self.assertEqual(self.client.get("/cases", headers={"Authorization": "Bearer bad"}).status_code, 401)

    def test_user_is_validated_by_supabase(self):
        response = self.client.get("/auth/me", headers=self.headers)
        self.assertEqual(response.json()["id"], USER)
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_login_and_refresh_protocol(self):
        self.handler = lambda request: httpx.Response(200, json={"access_token": "issued", "refresh_token": "refresh"})
        response = self.client.post("/auth/login", json={"email": "test@example.org", "password": "test-password"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.requests[-1].url.params["grant_type"], "password")
        self.assertNotIn("authorization", self.requests[-1].headers)
        self.client.post("/auth/refresh", json={"refresh_token": "refresh"})
        self.assertEqual(self.requests[-1].url.params["grant_type"], "refresh_token")

    def test_auth_errors_and_no_password_echo(self):
        secret = "private"
        response = self.client.post("/auth/login", json={"email": "invalid", "password": secret})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(secret, response.text)
        self.handler = lambda request: httpx.Response(400, json={"message": "sensitive upstream error"})
        response = self.client.post("/auth/login", json={"email": "test@example.org", "password": "test-password"})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("sensitive", response.text)

    def test_cases_use_user_token_and_calculate_clock(self):
        def handler(request):
            if request.url.path == "/rest/v1/sim_state":
                return httpx.Response(200, json=[{"sim_now": 2}])
            return httpx.Response(200, json=[{
                "id": str(uuid4()), "report_id": "R-01", "urgency": "critical", "deadline_at_sim": 1}])
        self.handler = handler
        response = self.client.get("/cases?urgency=critical", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["time_remaining_hours"], -1)
        for request in self.requests:
            self.assertEqual(request.headers["authorization"], "Bearer good-token")
            self.assertEqual(request.headers["apikey"], "sb_publishable_test")

    def test_rpc_and_invalid_state_status(self):
        def handler(request):
            self.assertEqual(request.url.path, "/rest/v1/rpc/brightline_command")
            return httpx.Response(400, json={"code": "PT400"})
        self.handler = handler
        response = self.client.post(f"/cases/{uuid4()}/action", headers=self.headers,
                                    json={"action": "Revisar", "close": True})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post("/simulate/advance?hours=-1", headers=self.headers).status_code, 422)

    def test_import_requires_literal_evidence_and_complete_cache(self):
        report = {"report_id": "R-01", "modality": "TC", "radiologist": "A", "ordering_physician": "B",
                  "text": "Hemorragia aguda.", "flagged_by_radiologist": False, "ground_truth": []}
        body = {"reports": [report], "extractions": {}}
        self.assertEqual(self.client.post("/imports", headers=self.headers, json=body).status_code, 422)
        body["extractions"] = {"R-01": {"report_id": "R-01", "findings": [{
            "finding": "hemorragia", "evidence": "inventado", "urgency": "critical", "deadline_hours": 1, "confidence": "high"}]}}
        self.assertEqual(self.client.post("/imports", headers=self.headers, json=body).status_code, 422)
        body["extractions"]["R-01"]["findings"][0]["evidence"] = "Hemorragia aguda."
        self.handler = lambda request: httpx.Response(200, json={"reports": 1, "cases": 1, "sim_now": 0})
        self.assertEqual(self.client.post("/imports", headers=self.headers, json=body).status_code, 200)

    def test_storage_path_is_scoped_to_validated_user(self):
        self.handler = lambda request: httpx.Response(200, json={"Key": "stored"})
        response = self.client.post("/files", headers={**self.headers, "Content-Type": "application/json"}, content=b"{}")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["path"].startswith(USER + "/"))
        self.assertIn(USER, self.requests[-1].url.path)
        self.assertEqual(self.client.post("/files", headers={**self.headers, "Content-Type": "text/html"}, content=b"<p>x</p>").status_code, 415)

    def test_upstream_unavailable_does_not_expose_secrets(self):
        self.handler = lambda request: httpx.Response(500, json={"message": "secret"})
        response = self.client.get("/ready", headers=self.headers)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("secret", response.text)

    def test_config_rejects_admin_keys(self):
        encoded = base64.urlsafe_b64encode(json.dumps({"role": "service_role"}).encode()).decode().rstrip("=")
        for key in ("sb_secret_test", f"header.{encoded}.signature"):
            with patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co", "SUPABASE_PUBLISHABLE_KEY": key}):
                get_settings.cache_clear()
                with self.assertRaises(ValueError):
                    get_settings()
        get_settings.cache_clear()

    def test_pagination_is_not_silently_truncated(self):
        def handler(request):
            if request.url.path == "/rest/v1/sim_state":
                return httpx.Response(200, json=[])
            offset = int(request.url.params["offset"])
            count = 100 if offset == 0 else 1
            return httpx.Response(200, json=[{"id": str(offset+i), "urgency": "urgent", "deadline_at_sim": 24} for i in range(count)])
        self.handler = handler
        result = self.client.get("/cases", headers=self.headers)
        self.assertEqual(len(result.json()), 101)


if __name__ == "__main__":
    unittest.main()
