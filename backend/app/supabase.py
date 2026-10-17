"""Cliente REST sem estado global de sessão; toda chamada preserva o JWT do usuário."""
from typing import Any
import httpx
from fastapi import HTTPException
from .config import Settings


class SupabaseGateway:
    def __init__(self, settings: Settings, transport=None):
        self.settings = settings
        self.transport = transport

    async def request(self, method: str, path: str, *, token: str | None = None,
                      json: Any = None, params=None, content=None, content_type=None):
        headers = {"apikey": self.settings.publishable_key}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if content_type:
            headers["Content-Type"] = content_type
        try:
            async with httpx.AsyncClient(timeout=30, transport=self.transport) as client:
                response = await client.request(method, self.settings.url + path, headers=headers,
                                                json=json, params=params, content=content)
        except httpx.RequestError:
            raise HTTPException(503, "Supabase indisponível. Tente novamente.") from None
        if response.is_error:
            try:
                code = response.json().get("code")
            except ValueError:
                code = None
            status = response.status_code
            if code == "PT404":
                raise HTTPException(404, "Caso não encontrado.")
            if code == "PT400":
                raise HTTPException(400, "Operação inválida para os dados ou estado atual.")
            if status in {401, 403} or code in {"PGRST301", "PGRST303"}:
                raise HTTPException(401 if status == 401 else 403, "Sessão inválida ou acesso não permitido.")
            if status == 429:
                raise HTTPException(429, "Limite de tentativas atingido. Aguarde e tente novamente.")
            if path.startswith("/auth/") and status in {400, 422}:
                raise HTTPException(400, "Não foi possível autenticar. Confira os dados, a confirmação do e-mail e a configuração do Auth.")
            if status == 409:
                raise HTTPException(409, "O recurso já existe ou conflita com os dados atuais.")
            raise HTTPException(502, "Falha no Supabase. Confira as migrações e a configuração do projeto.")
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    async def rows(self, table, token, params=None):
        # Pagina explicitamente para não truncar na configuração de limite da Data API.
        rows = []
        offset = 0
        while True:
            page = await self.request("GET", f"/rest/v1/{table}", token=token,
                                      params={**(params or {}), "limit": 100, "offset": offset})
            rows.extend(page)
            if len(page) < 100:
                return rows
            offset += len(page)

    async def command(self, operation, payload, token):
        return await self.request("POST", "/rest/v1/rpc/brightline_command", token=token,
                                  json={"operation": operation, "payload": payload})
