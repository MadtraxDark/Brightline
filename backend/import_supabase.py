"""Importa um conjunto completo de laudos/cache para a conta autenticada no Supabase."""
import argparse
import getpass
import os
from pathlib import Path
import sys

import httpx
from dotenv import load_dotenv

from brightline_data import ROOT, load_reports, read_json, validate_extraction


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports", type=Path,
                        default=ROOT / "data/reports.json")
    parser.add_argument("--cache", type=Path, default=ROOT /
                        "data/extractions_cache.json")
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument(
        "--email", help="Login interativo; a senha será solicitada sem eco")
    parser.add_argument("--replace", action="store_true",
                        help="Confirma substituição dos dados desta conta e reinício da simulação")
    parser.add_argument("--validate-only", action="store_true",
                        help="Confere os arquivos sem acessar a rede")
    args = parser.parse_args(argv)
    reports = load_reports(args.reports)
    cache = read_json(args.cache)
    if not isinstance(cache, dict) or set(cache) != {r["report_id"] for r in reports}:
        raise ValueError(
            "O cache deve conter todos os laudos, sem IDs desconhecidos.")
    for report in reports:
        validate_extraction(cache[report["report_id"]], report)
    if args.validate_only:
        print(
            f"Importação válida: {len(reports)} laudos com extrações completas.")
        return 0
    if not args.replace:
        raise ValueError(
            "Use --replace para substituir os dados da sua conta e reiniciar a simulação.")
    from urllib.parse import urlparse
    parsed = urlparse(args.api)
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}):
        raise ValueError("A API deve usar HTTPS, exceto localhost.")
    load_dotenv(ROOT / ".env", override=False)
    token = os.getenv("BRIGHTLINE_ACCESS_TOKEN")
    with httpx.Client(base_url=args.api.rstrip("/"), timeout=60) as client:
        if args.email:
            response = client.post(
                "/auth/login", json={"email": args.email, "password": getpass.getpass("Senha: ")})
            if response.is_error:
                raise ValueError(
                    f"Login recusado (HTTP {response.status_code}). Confira a senha e confirme seu e-mail.")
            token = response.json()["access_token"]
        if not token:
            raise ValueError(
                "Informe --email ou configure BRIGHTLINE_ACCESS_TOKEN.")
        response = client.post("/imports", headers={"Authorization": f"Bearer {token}"},
                               json={"reports": reports, "extractions": cache})
        if response.is_error:
            raise ValueError(
                f"Importação recusada (HTTP {response.status_code}). Confira a sessão e a migração do Supabase.")
        result = response.json()
        print(
            f"Importados: {result['reports']} laudos; {result['cases']} casos; hora simulada {result['sim_now']}.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, httpx.RequestError) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        sys.exit(1)
