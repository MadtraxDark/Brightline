"""Extração offline via Claude Messages API, com cache e retomada."""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from brightline_data import ROOT, load_reports, read_json, write_json, validate_extraction


def call_claude(report, prompt, model, api_key, correction=""):
    # Deliberadamente não envia ground_truth nem flagged_by_radiologist.
    content = json.dumps(
        {"report_id": report["report_id"], "text": report["text"]}, ensure_ascii=False)
    if correction:
        content += "\nA tentativa anterior foi rejeitada: " + \
            correction + ". Gere novamente o JSON completo."
    payload = {"model": model, "max_tokens": 4096, "system": prompt,
               "messages": [{"role": "user", "content": content}]}
    request = urllib.request.Request("https://api.anthropic.com/v1/messages",
                                     data=json.dumps(payload).encode("utf-8"), method="POST",
                                     headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            result = json.load(response)
    except urllib.error.HTTPError as exc:
        # Não registra cabeçalhos, credenciais ou corpo remoto em logs.
        raise RuntimeError(f"API retornou HTTP {exc.code}") from None
    if result.get("stop_reason") != "end_turn":
        raise ValueError("Resposta incompleta ou recusada pela API")
    text = "".join(block["text"] for block in result.get(
        "content", []) if block.get("type") == "text")
    return json.loads(text)


def fingerprint(report, prompt, model):
    raw = json.dumps([report["report_id"], report["text"],
                     prompt, model], ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def extract_one(report, prompt, model, key, retries=2, caller=call_claude):
    correction = ""
    for attempt in range(retries + 1):
        try:
            result = caller(report, prompt, model, key, correction)
            return validate_extraction(result, report)
        except (ValueError, RuntimeError, urllib.error.URLError, TimeoutError, OSError) as exc:
            correction = str(exc)
            if attempt == retries:
                raise ValueError(
                    f"Falhou após {attempt + 1} tentativa(s): {correction}") from None
            time.sleep(min(2 ** attempt, 4))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports", type=Path,
                        default=ROOT / "data/reports.json")
    parser.add_argument("--cache", type=Path,
                        default=ROOT / "data/extractions_cache.json")
    parser.add_argument("--prompt", type=Path,
                        default=ROOT / "prompts/extraction.txt")
    parser.add_argument("--model", default=os.environ.get("ANTHROPIC_MODEL"))
    parser.add_argument("--retry-failed", action="store_true",
                        help="Executa somente IDs registrados como falhos")
    parser.add_argument("--force", action="store_true",
                        help="Reextrai inclusive entradas válidas")
    parser.add_argument("--validate-only", action="store_true",
                        help="Valida dados/cache sem acessar a API")
    parser.add_argument("--retries", type=int, choices=range(3), default=2)
    args = parser.parse_args(argv)
    reports = load_reports(args.reports)
    cache = read_json(args.cache) if args.cache.exists() else {}
    if not isinstance(cache, dict):
        raise ValueError("Cache precisa ser dicionário")
    by_id = {r["report_id"]: r for r in reports}
    unknown = set(cache) - set(by_id)
    if unknown:
        raise ValueError(f"Cache contém IDs desconhecidos: {sorted(unknown)}")
    if args.validate_only:
        for rid, value in cache.items():
            validate_extraction(value, by_id[rid])
        print(
            f"Laudos válidos: {len(reports)}. Extrações válidas: {len(cache)}. Pendentes: {len(reports)-len(cache)}.")
        return 0 if len(cache) == len(reports) else 2
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key or not args.model:
        raise ValueError(
            "Configure ANTHROPIC_API_KEY e ANTHROPIC_MODEL (ou --model).")
    prompt = args.prompt.read_text(encoding="utf-8-sig")
    meta_path = args.cache.with_suffix(".meta.json")
    error_path = args.cache.with_suffix(".errors.json")
    meta = read_json(meta_path) if meta_path.exists() else {}
    errors = read_json(error_path) if error_path.exists() else {}
    selected = set(errors) if args.retry_failed else set(by_id)
    # Remove dados obsoletos antes de persistir qualquer progresso.
    for rid in list(cache):
        try:
            validate_extraction(cache[rid], by_id[rid])
            fresh = meta.get(rid) == fingerprint(
                by_id[rid], prompt, args.model)
        except ValueError:
            fresh = False
        if not fresh:
            cache.pop(rid)
            meta.pop(rid, None)
    for report in reports:
        rid = report["report_id"]
        if rid not in selected or (rid in cache and not args.force):
            continue
        cache.pop(rid, None)
        meta.pop(rid, None)
        try:
            cache[rid] = extract_one(
                report, prompt, args.model, key, args.retries)
            meta[rid] = fingerprint(report, prompt, args.model)
            errors.pop(rid, None)
            print(f"{rid}: {len(cache[rid]['findings'])} achado(s), validado")
        except ValueError as exc:
            errors[rid] = {"error": str(exc), "model": args.model}
            print(f"{rid}: falhou; registrado para revisão", file=sys.stderr)
        write_json(args.cache, cache)
        write_json(meta_path, meta)
        write_json(error_path, errors)
    # Também persiste invalidações quando nenhum ID foi selecionado.
    write_json(args.cache, cache)
    write_json(meta_path, meta)
    write_json(error_path, errors)
    pending = sorted(set(by_id) - set(cache))
    print(
        f"Cache: {len(cache)}/{len(reports)} laudos. Pendentes: {', '.join(pending) or 'nenhum'}")
    return 2 if pending else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        sys.exit(1)
