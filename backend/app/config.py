"""Configuração do Supabase compartilhada pela API."""
from dataclasses import dataclass
from functools import lru_cache
import os
import base64
import json
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    url: str
    publishable_key: str
    cors_origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")


@lru_cache
def get_settings() -> Settings:
    load_dotenv(ROOT / ".env", override=False)
    url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""
    parsed = urlparse(url)
    local = parsed.hostname in {"localhost", "127.0.0.1"}
    if not url or not key or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path:
        raise ValueError("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no .env.")
    if parsed.scheme != "https" and not (local and parsed.scheme == "http"):
        raise ValueError("Supabase requer HTTPS (HTTP permitido somente em localhost).")
    if key.startswith("sb_secret_"):
        raise ValueError("Use a chave publicável, nunca a chave secreta do Supabase.")
    if not key.startswith("sb_publishable_"):
        # Apenas identifica a função da chave legada; a validação das sessões é remota.
        try:
            encoded = key.split(".")[1]
            role = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))["role"]
        except (ValueError, KeyError, IndexError):
            raise ValueError("Chave publicável/anon inválida.") from None
        if role != "anon":
            raise ValueError("Chave legada deve ter role anon; service_role não é permitido.")
    origins = tuple(x.strip() for x in os.getenv("BRIGHTLINE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip())
    return Settings(url, key, origins)
