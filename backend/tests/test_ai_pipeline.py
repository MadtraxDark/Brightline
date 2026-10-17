import copy
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

from brightline_data import ROOT, load_reports, validate_extraction, write_json, read_json
from evaluate import evaluate, load_aliases
from extract import call_claude, extract_one, main


def sample(rid="T-01"):
    return {"report_id": rid, "modality": "TC", "radiologist": "Profissional fictício A",
            "ordering_physician": "Profissional fictício B", "flagged_by_radiologist": False,
            "text": "Hemorragia aguda à esquerda. Sem pneumotórax.",
            "ground_truth": [{"finding": "hemorragia aguda à esquerda", "urgency": "critical"}]}


def extraction(report, urgency="critical", evidence="Hemorragia aguda à esquerda."):
    return {"report_id": report["report_id"], "findings": [{"finding": "hemorragia aguda à esquerda",
            "evidence": evidence, "urgency": urgency,
                                                            "deadline_hours": {"critical": 1, "urgent": 24, "actionable": 720}[urgency],
                                                            "confidence": "high"}]}


class PipelineTests(unittest.TestCase):
    def test_real_dataset_contract_and_coverage(self):
        reports = load_reports(ROOT / "data/reports.json")
        self.assertEqual(len(reports), 40)
        self.assertEqual(sum(not r["ground_truth"] for r in reports), 8)
        self.assertGreaterEqual(sum(not r["flagged_by_radiologist"] and any(
            g["urgency"] in {"critical", "urgent"} for g in r["ground_truth"]) for r in reports), 6)

    def test_evidence_must_be_literal_and_nonempty(self):
        report = sample()
        for evidence in ("", "hemorragia aguda à esquerda.", "sangramento à esquerda"):
            with self.assertRaises(ValueError):
                validate_extraction(extraction(
                    report, evidence=evidence), report)
        validate_extraction(extraction(report), report)

    def test_invalid_fields_and_deadline(self):
        report = sample()
        for field, value in (("deadline_hours", True), ("deadline_hours", 24),
                             ("negated", False), ("confidence", "certain")):
            result = extraction(report)
            result["findings"][0][field] = value
            with self.assertRaises(ValueError):
                validate_extraction(result, report)

    @patch("extract.time.sleep")
    def test_retry_rejects_invalid_evidence_then_recovers(self, sleep):
        report = sample()
        calls = []

        def caller(*args):
            calls.append(args)
            return extraction(report, evidence="inventado") if len(calls) == 1 else extraction(report)
        self.assertEqual(extract_one(report, "prompt", "model",
                         "key", caller=caller), extraction(report))
        self.assertIn("literalmente", calls[1][-1])

    @patch("extract.time.sleep")
    def test_retry_limit(self, sleep):
        mock = Mock(side_effect=ValueError("JSON inválido"))
        with self.assertRaises(ValueError):
            extract_one(sample(), "prompt", "model", "key", caller=mock)
        self.assertEqual(mock.call_count, 3)

    def test_api_request_does_not_leak_ground_truth(self):
        report = sample()
        response = io.BytesIO(json.dumps({"stop_reason": "end_turn", "content": [
            {"type": "text", "text": json.dumps(extraction(report))}]}).encode())
        with patch("extract.urllib.request.urlopen", return_value=response) as send:
            call_claude(report, "prompt", "model", "secret")
        payload = json.loads(send.call_args.args[0].data)
        user = json.loads(payload["messages"][0]["content"])
        self.assertEqual(set(user), {"report_id", "text"})

    def test_wrong_urgency_counts_as_fp_and_fn(self):
        report = sample()
        result = evaluate(
            [report], {report["report_id"]: extraction(report, "urgent")})
        self.assertEqual(result["true_positives"], 0)
        self.assertEqual(result["wrong_urgency_count"], 1)
        self.assertEqual(result["false_positives_count"], 1)
        self.assertEqual(result["false_negatives_count"], 1)
        self.assertEqual(result["critical_recall"], 0)

    def test_missing_reports_are_not_dropped(self):
        result = evaluate([sample()], {})
        self.assertFalse(result["complete"])
        self.assertEqual(result["recall"], 0)
        self.assertIsNone(result["precision"])
        self.assertEqual(result["missing_report_ids"], ["T-01"])

    def test_alias_and_one_to_one_matching(self):
        report = sample()
        report["ground_truth"].append(copy.deepcopy(report["ground_truth"][0]))
        got = extraction(report)
        got["findings"][0]["finding"] = "sangramento"
        result = evaluate(
            [report], {"T-01": got}, {"sangramento": "hemorragia aguda a esquerda"})
        self.assertEqual(result["true_positives"], 1)
        self.assertEqual(result["false_negatives_count"], 1)

    def test_all_normal_zero_denominators(self):
        report = sample()
        report["ground_truth"] = []
        result = evaluate(
            [report], {"T-01": {"report_id": "T-01", "findings": []}})
        self.assertIsNone(result["precision"])
        self.assertIsNone(result["recall"])
        self.assertIsNone(result["critical_recall"])

    def test_unknown_cache_id_is_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([sample()], {"UNKNOWN": {}})

    def test_alias_chains_rejected(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            path = Path(directory) / "aliases.json"
            write_json(path, {"a": "b", "b": "c"})
            with self.assertRaises(ValueError):
                load_aliases(path)

    def test_failed_batch_resume_cache_and_prompt_invalidation(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            base = Path(directory)
            reports = [sample("T-01"), sample("T-02")]
            write_json(base / "reports.json", reports)
            prompt = base / "prompt.txt"
            prompt.write_text("prompt 1", encoding="utf-8")
            cache = base / "cache.json"
            args = ["--reports", str(base / "reports.json"), "--cache", str(cache),
                    "--prompt", str(prompt), "--model", "test-model"]
            with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-only"}), patch("sys.stdout", io.StringIO()), patch("sys.stderr", io.StringIO()):
                with patch("extract.extract_one", side_effect=[extraction(reports[0]), ValueError("falha de teste")]):
                    self.assertEqual(main(args), 2)
                self.assertEqual(set(read_json(cache)), {"T-01"})
                with patch("extract.extract_one", return_value=extraction(reports[1])) as run:
                    self.assertEqual(main(args + ["--retry-failed"]), 0)
                    self.assertEqual(run.call_count, 1)
                with patch("extract.extract_one") as run:
                    self.assertEqual(main(args), 0)
                    run.assert_not_called()
                prompt.write_text("prompt 2", encoding="utf-8")
                with patch("extract.extract_one", side_effect=[extraction(r) for r in reports]) as run:
                    self.assertEqual(main(args), 0)
                    self.assertEqual(run.call_count, 2)


if __name__ == "__main__":
    unittest.main()
