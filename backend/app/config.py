"""Configuração dos serviços locais do Brightline."""
from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: tuple[str, ...]


@lru_cache
def get_settings() -> Settings:
    load_dotenv(ROOT / ".env", override=False)
    url = os.getenv("DATABASE_URL", "").strip()
    if not url.startswith(("postgresql://", "postgresql+psycopg://")):
        raise ValueError("Configure DATABASE_URL para o PostgreSQL local no .env.")
    origins = tuple(x.strip() for x in os.getenv(
        "BRIGHTLINE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip())
    return Settings(url, origins)
