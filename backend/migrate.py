"""Apply pending Brightline PostgreSQL migrations."""
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from .app.config import get_settings


MIGRATIONS = Path(__file__).resolve().parent / "migrations"


def main():
    with psycopg.connect(get_settings().database_url, row_factory=dict_row) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS schema_migrations (
            version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())""")
        # The initial schema is created by the official Postgres entrypoint. If a
        # pre-existing database is supplied, init.sql is safely replayed first.
        if not conn.execute("SELECT to_regclass('public.users') AS users").fetchone()["users"]:
            conn.execute((MIGRATIONS.parent / "init.sql").read_text(encoding="utf-8"))
        conn.execute("INSERT INTO schema_migrations(version) VALUES ('001_initial') ON CONFLICT DO NOTHING")
        for path in sorted(MIGRATIONS.glob("[0-9]*.sql")):
            version = path.stem
            if version == "001_initial":
                continue
            if conn.execute("SELECT 1 FROM schema_migrations WHERE version=%s", (version,)).fetchone():
                print(f"{version}: já aplicada")
                continue
            with conn.transaction():
                conn.execute(path.read_text(encoding="utf-8"))
                conn.execute("INSERT INTO schema_migrations(version) VALUES (%s)", (version,))
            print(f"{version}: aplicada")


if __name__ == "__main__":
    main()
