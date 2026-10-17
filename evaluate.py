"""Avaliação determinística com pareamento um a um e aliases revisados."""
import argparse
import re
import sys
import unicodedata
from pathlib import Path
from brightline_data import ROOT, load_reports, read_json, write_json, validate_extraction


def normalize(text):
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^\w]+", " ", text).strip()


def load_aliases(path):
    raw = read_json(path) if path else {}
    if not isinstance(raw, dict):
        raise ValueError("Aliases devem mapear variante para nome canônico")
    result = {}
    for alias, canonical in raw.items():
        if not isinstance(canonical, str) or not normalize(alias) or not normalize(canonical):
            raise ValueError("Alias inválido")
        a, c = normalize(alias), normalize(canonical)
        if a in result and result[a] != c:
            raise ValueError("Aliases conflitantes após normalização")
        result[a] = c
    if any(c in result and result[c] != c for c in result.values()):
        raise ValueError("Não use cadeias ou ciclos de aliases")
    return result


def evaluate(reports, cache, aliases=None):
    if not isinstance(cache, dict):
        raise ValueError("Cache precisa ser dicionário")
    aliases = aliases or {}

    def identity(item):
        name = normalize(item["finding"])
        return aliases.get(name, name)
    unknown = set(cache) - {r["report_id"] for r in reports}
    if unknown:
        raise ValueError(f"IDs desconhecidos no cache: {sorted(unknown)}")
    tp = 0
    fp, fn, wrong = [], [], []
    missing = []
    critical_total = critical_tp = 0
    for report in reports:
        rid = report["report_id"]
        truth = report["ground_truth"]
        critical_total += sum(g["urgency"] == "critical" for g in truth)
        if rid not in cache:
            missing.append(rid)
            predicted = []
        else:
            predicted = validate_extraction(cache[rid], report)["findings"]
        used = set()
        unmatched_truth = []
        # Primeiro reserva todos os pares corretos; depois diagnostica urgência errada.
        for expected in truth:
            match = next((i for i, got in enumerate(predicted) if i not in used
                          and identity(got) == identity(expected)
                          and got["urgency"] == expected["urgency"]), None)
            if match is not None:
                used.add(match)
                tp += 1
                critical_tp += expected["urgency"] == "critical"
            else:
                unmatched_truth.append(expected)
                fn.append({"report_id": rid, **expected})
        unused = set(range(len(predicted))) - used
        fp.extend({"report_id": rid, "finding": predicted[i]["finding"],
                   "urgency": predicted[i]["urgency"]} for i in sorted(unused))
        for expected in unmatched_truth:
            match = next((i for i in sorted(unused) if identity(
                predicted[i]) == identity(expected)), None)
            if match is not None:
                unused.remove(match)
                wrong.append({"report_id": rid, "finding": expected["finding"],
                              "expected": expected["urgency"], "predicted": predicted[match]["urgency"]})
    return {"scope": "Avaliação em conjunto sintético pequeno, ilustrativa; sem validação clínica",
            "matching": "nome normalizado e aliases explícitos, com mesma urgência; pareamento um a um",
            "complete": not missing, "reports": len(reports), "extracted_reports": len(reports)-len(missing),
            "missing_report_ids": missing, "true_positives": tp, "false_positives_count": len(fp),
            "false_negatives_count": len(fn), "precision": tp/(tp+len(fp)) if tp+len(fp) else None,
            "recall": tp/(tp+len(fn)) if tp+len(fn) else None,
            "critical_recall": critical_tp/critical_total if critical_total else None,
            "critical_true_positives": critical_tp, "critical_ground_truth": critical_total,
            "wrong_urgency_count": len(wrong), "wrong_urgency": wrong,
            "false_positives": fp, "false_negatives": fn}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports", type=Path,
                        default=ROOT / "data/reports.json")
    parser.add_argument("--cache", type=Path, default=ROOT /
                        "data/extractions_cache.json")
    parser.add_argument("--aliases", type=Path,
                        default=ROOT / "data/finding_aliases.json")
    parser.add_argument("--output", type=Path,
                        default=ROOT / "data/evaluation.json")
    args = parser.parse_args(argv)
    result = evaluate(load_reports(args.reports), read_json(
        args.cache), load_aliases(args.aliases))
    write_json(args.output, result)
    print(result["scope"])

    def percent(value):
        return f"{value:.1%}" if value is not None else "N/A (denominador zero)"
    print(f"Cobertura: {result['extracted_reports']}/{result['reports']}")
    print(
        f"Precisão: {percent(result['precision'])}; recall: {percent(result['recall'])}")
    print(f"RECALL CRITICAL: {percent(result['critical_recall'])}")
    print(
        f"Urgência errada: {result['wrong_urgency_count']} (também conta como FP e FN)")
    for category in ("false_negatives", "false_positives", "wrong_urgency"):
        print(f"\n{category}:")
        for item in result[category]:
            print("  " + str(item))
    if not result["complete"]:
        print("AVALIAÇÃO INCOMPLETA: laudos ausentes contam como extração vazia; não são excluídos do recall.")
        print("Pendentes: " + ", ".join(result["missing_report_ids"]))
    return 0 if result["complete"] else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        sys.exit(1)
