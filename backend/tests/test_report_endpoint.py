import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from app import main
from fastapi import HTTPException


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
    def test_failed_inference_does_not_persist_or_return_success(self):
        class LinkedImage(FakeConnection):
            def execute(self, query, params=()):
                self.statements.append((query, params))
                return FakeResult({"content": b"image", "mime_type": "image/png", "analysis": {}})

        session = {"user": {"id": "owner", "institutions": ["hctco-unifeso"],
                            "active_institution_id": "hctco-unifeso"}}
        for error, status in [(main.WorkerBusy("busy"), 409), (TimeoutError("timeout"), 504),
                              (RuntimeError("unavailable"), 503), (ValueError("invalid"), 422)]:
            with self.subTest(status=status):
                conn = LinkedImage()
                with patch.object(main, "db", return_value=conn), patch.object(
                    main.reclassification_worker, "run", side_effect=error
                ), self.assertRaises(HTTPException) as caught:
                    asyncio.run(main.reclassify_report("TEST", session))
                self.assertEqual(caught.exception.status_code, status)
                self.assertFalse(any("INSERT" in sql for sql, _ in conn.statements))

    def test_reclassification_reads_linked_image_and_persists_new_scores_and_markers(self):
        class ReclassificationConnection(FakeConnection):
            def execute(self, query, params=()):
                self.statements.append((query, params))
                if "SELECT f.content,f.mime_type,a.analysis" in query:
                    return FakeResult({
                        "content": b"original-radiograph-bytes",
                        "mime_type": "image/png",
                        "analysis": {"findings": []},
                    })
                return FakeResult()

        connection = ReclassificationConnection()
        probabilities = {label: 0.1 for label in main.report_analysis.LABELS}
        probabilities["Atelectasis"] = 0.82
        markers = [{"pathology": "Atelectasis", "score": 0.82, "x": 0.45, "y": 0.67,
                    "localization_method": "gradcam", "localization_status": "estimated",
                    "heatmap_available": True}]
        session = {"user": {"id": "owner-test", "institutions": ["hctco-unifeso"],
                             "active_institution_id": "hctco-unifeso"}}
        with patch.object(main, "db", return_value=connection), patch.object(
            main, "run_in_threadpool", new=AsyncMock(return_value=(probabilities, "model-test", markers, "data:image/png;base64,abc", {"weights": "test"}))), patch.object(
            main.report_analysis, "model_metadata", return_value={"weights": "test"}
        ) as metadata:
            result = asyncio.run(main.reclassify_report("REPORT-TEST", session))

        metadata.assert_not_called()
        self.assertEqual(result["reclassification_status"], "completed")
        self.assertEqual(result["predictions"], ["Atelectasis"])
        self.assertEqual(result["markers"], markers)
        self.assertEqual(result["heatmap"], "data:image/png;base64,abc")
        self.assertTrue(result["human_review_required"])
        self.assertTrue(any("INSERT INTO report_analyses" in query for query, _ in connection.statements))

    def test_view_all_reclassifies_the_report_file_instead_of_the_session_owner(self):
        class SharedReport(FakeConnection):
            def execute(self, query, params=()):
                self.statements.append((query, params))
                if "SELECT f.owner_id,f.institution_id,f.content" in query:
                    return FakeResult({
                        "owner_id": "report-owner",
                        "institution_id": "hospital-sao-jose-teresopolis",
                        "content": b"original-radiograph-bytes",
                        "mime_type": "image/png",
                        "analysis": {"findings": []},
                    })
                return FakeResult()

        connection = SharedReport()
        probabilities = {label: 0.1 for label in main.report_analysis.LABELS}
        session = {"user": {"id": "viewer", "view_all_reports": True,
                            "institutions": ["asl-softhouse"],
                            "active_institution_id": "asl-softhouse"}}
        with patch.object(main, "db", return_value=connection), patch.object(
            main, "run_in_threadpool", new=AsyncMock(return_value=(
                probabilities, "model-test", [], None, {"weights": "test"}))
        ):
            asyncio.run(main.reclassify_report("R-001", session))

        select = next(params for query, params in connection.statements if "SELECT f.owner_id" in query)
        self.assertEqual(select, ("R-001",))
        insert = next(params for query, params in connection.statements if "INSERT INTO report_analyses" in query)
        self.assertEqual(insert[0], "report-owner")
        self.assertEqual(insert[1], "hospital-sao-jose-teresopolis")
        self.assertEqual(insert[2], "R-001")

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
                {"user": {"id": "owner-test", "institutions": ["hctco-unifeso"],
                          "active_institution_id": "hctco-unifeso"}},
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
