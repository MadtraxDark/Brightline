import asyncio
import unittest
from unittest.mock import patch

from app import main


class FakeResult:
    def __init__(self, row=None):
        self.row = row

    def fetchone(self):
        return self.row


class FakeConnection:
    def __init__(self):
        self.statements = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        self.statements.append((query, params))
        if "INSERT INTO cases(owner_id" in query:
            return FakeResult({"id": "case-test"})
        return FakeResult()


class ReportEndpointTests(unittest.TestCase):
    def test_analysis_is_persisted_for_authenticated_owner_and_requires_review(self):
        connection = FakeConnection()
        findings = [{
            "finding": "Derrame pleural direito",
            "evidence": "Derrame pleural direito.",
            "urgency": "actionable",
            "deadline_hours": 720,
            "confidence": "high",
        }]
        with patch.object(main, "db", return_value=connection), patch.object(
            main, "_extract_report", return_value={"findings": findings}
        ):
            result = asyncio.run(main.analyze_report(
                {"user": {"id": "owner-test"}},
                report_text="Laudo sintético de teste.",
                report_file=None,
                radiograph=None,
                report_id="REPORT-TEST",
            ))

        self.assertEqual(result["status"], "review_required")
        self.assertTrue(result["human_review_required"])
        self.assertEqual(result["findings"], findings)
        persisted = [query for query, _ in connection.statements]
        self.assertTrue(any("INSERT INTO reports(owner_id" in query for query in persisted))
        self.assertTrue(any("INSERT INTO extractions(owner_id" in query for query in persisted))
        self.assertTrue(any("INSERT INTO report_analyses(owner_id" in query for query in persisted))
        self.assertTrue(any("INSERT INTO cases(owner_id" in query for query in persisted))
        self.assertTrue(any("INSERT INTO events(owner_id" in query for query in persisted))
        for query, params in connection.statements:
            if "INSERT INTO reports(owner_id" in query or "INSERT INTO report_analyses(owner_id" in query:
                self.assertEqual(params[0], "owner-test")


if __name__ == "__main__":
    unittest.main()
