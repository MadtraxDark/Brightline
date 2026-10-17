"""Contrato e persistência compartilhados pelos scripts de IA (Python 3.10+)."""
import json
import os
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEADLINES = {"critical": 1, "urgent": 24, "actionable": 720}


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write_json(path, value):
    """Substituição atômica: preserva o arquivo anterior se a escrita falhar."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         delete=False, suffix=".tmp") as stream:
            name = stream.name
            json.dump(value, stream, ensure_ascii=False,
                      indent=2, allow_nan=False)
            stream.write("\n")
        os.replace(name, path)
    finally:
        if name and Path(name).exists():
            Path(name).unlink()


def load_reports(path):
    reports = read_json(path)
    if not isinstance(reports, list) or not reports:
        raise ValueError("reports.json precisa ser uma lista não vazia")
    ids = set()
    fields = {"report_id", "modality", "radiologist", "ordering_physician", "text",
              "flagged_by_radiologist", "ground_truth"}
    for report in reports:
        if not isinstance(report, dict) or set(report) != fields:
            raise ValueError("Laudo fora do contrato")
        for field in fields - {"ground_truth", "flagged_by_radiologist"}:
            if not isinstance(report[field], str) or not report[field].strip():
                raise ValueError(f"Campo inválido: {field}")
        rid = report["report_id"]
        if rid in ids:
            raise ValueError(f"ID duplicado: {rid}")
        ids.add(rid)
        if type(report["flagged_by_radiologist"]) is not bool:
            raise ValueError(f"{rid}: sinalização precisa ser booleano")
        if not isinstance(report["ground_truth"], list):
            raise ValueError(f"{rid}: ground_truth precisa ser lista")
        pairs = set()
        for item in report["ground_truth"]:
            if (not isinstance(item, dict) or set(item) != {"finding", "urgency"}
                    or not isinstance(item["finding"], str) or not item["finding"].strip()
                    or not isinstance(item["urgency"], str) or item["urgency"] not in DEADLINES):
                raise ValueError(f"{rid}: gabarito inválido")
            pair = (item["finding"], item["urgency"])
            if pair in pairs:
                raise ValueError(f"{rid}: gabarito duplicado")
            pairs.add(pair)
    return reports


def validate_extraction(value, report):
    if not isinstance(value, dict) or set(value) != {"report_id", "findings"}:
        raise ValueError("Saída deve conter apenas report_id e findings")
    if value["report_id"] != report["report_id"]:
        raise ValueError("report_id diferente da entrada")
    if not isinstance(value["findings"], list):
        raise ValueError("findings precisa ser lista")
    seen = set()
    fields = {"finding", "evidence", "urgency", "deadline_hours", "confidence"}
    for finding in value["findings"]:
        if not isinstance(finding, dict) or set(finding) != fields:
            raise ValueError("Achado fora do contrato")
        for field in ("finding", "evidence", "urgency", "confidence"):
            if not isinstance(finding[field], str) or not finding[field].strip():
                raise ValueError(f"Campo inválido: {field}")
        urgency = finding["urgency"]
        if urgency not in DEADLINES:
            raise ValueError("Urgência inválida")
        if type(finding["deadline_hours"]) is not int or finding["deadline_hours"] != DEADLINES[urgency]:
            raise ValueError("Prazo incompatível com a urgência")
        if finding["confidence"] not in {"high", "medium", "low"}:
            raise ValueError("Confiança inválida")
        if finding["evidence"] not in report["text"]:
            raise ValueError("Evidência não aparece literalmente no laudo")
        identity = finding["finding"].strip().casefold()
        if identity in seen:
            raise ValueError("Achado duplicado")
        seen.add(identity)
    return value
