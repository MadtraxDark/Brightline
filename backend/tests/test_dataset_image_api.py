import asyncio
from datetime import datetime, timezone
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main


class Result:
    def __init__(self, row=None, rows=None):
        self.row = row
        self.rows = rows or []

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class Connection:
    def __init__(self, results):
        self.results = iter(results)
        self.statements = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        self.statements.append((query, params))
        return next(self.results)


class DatasetImageApiTests(unittest.TestCase):
    def test_image_listing_is_paginated_and_uses_database_filters(self):
        timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
        connection = Connection([
            Result({"total": 3}),
            Result(rows=[{"filename": "00000001_000.png", "patient_id": "00000001",
                          "finding_labels": ["Effusion"], "sha256": "abc", "imported_at": timestamp,
                          "model_version": None, "analysis_created_at": None}]),
        ])
        with patch.object(main, "db", return_value=connection):
            result = asyncio.run(main.list_dataset_images(
                {"user": {"id": "owner-1", "institutions": ["hctco-unifeso"], "active_institution_id": "hctco-unifeso"}}, offset=2, limit=1,
                dataset="nih-chestxray14", pathology="Effusion", classification=None,
                patient_id=None,
            ))
        self.assertEqual(result["pagination"], {"offset": 2, "limit": 1, "total": 3, "next_offset": None})
        self.assertEqual(result["items"][0]["finding_labels"], ["Effusion"])
        self.assertIn("= ANY(d.finding_labels)", connection.statements[0][0])
        self.assertIn("ORDER BY d.filename LIMIT %s OFFSET %s", connection.statements[1][0])

    def test_listing_rejects_conflicting_filters(self):
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(main.list_dataset_images(
                {"user": {"id": "owner-1", "institutions": ["hctco-unifeso"], "active_institution_id": "hctco-unifeso"}}, offset=0, limit=24,
                dataset="nih-chestxray14", pathology="Effusion", classification="Edema",
                patient_id=None,
            ))
        self.assertEqual(caught.exception.status_code, 422)

    def test_classification_filter_is_scoped_to_the_authenticated_owner(self):
        connection = Connection([Result({"total": 0}), Result(rows=[])])
        with patch.object(main, "db", return_value=connection):
            asyncio.run(main.list_dataset_images(
                {"user": {"id": "owner-1", "institutions": ["hctco-unifeso"], "active_institution_id": "hctco-unifeso"}}, offset=0, limit=24,
                dataset="nih-chestxray14", pathology=None, classification="Effusion",
                patient_id=None,
            ))
        count_sql, count_params = connection.statements[0]
        self.assertIn("dataset_image_analyses", count_sql)
        self.assertEqual(count_params, ["owner-1", "hctco-unifeso", "Effusion"])
        self.assertNotIn("= ANY(d.finding_labels)", count_sql)

    def test_signed_url_is_short_lived_and_never_contains_a_disk_path(self):
        connection = Connection([Result(), Result({"exists": 1}), Result()])
        with patch.object(main, "db", return_value=connection), patch.object(
            main.secrets, "token_urlsafe", return_value="temporary-token"
        ):
            result = asyncio.run(main.dataset_image_signed_url(
                "00000001_000.png", {"user": {"id": "owner-1", "institutions": ["hctco-unifeso"], "active_institution_id": "hctco-unifeso"}}
            ))
        self.assertEqual(result["expires_in"], 60)
        self.assertIn("/dataset/images/00000001_000.png/content?token=", result["url"])
        self.assertNotIn("D:\\", result["url"])
        self.assertEqual(connection.statements[2][1][0], main.token_hash("temporary-token"))

    def test_path_traversal_and_expired_links_are_rejected(self):
        with self.assertRaises(HTTPException) as traversal:
            asyncio.run(main.dataset_image_content("..\\secret.png", "token"))
        self.assertEqual(traversal.exception.status_code, 404)
        connection = Connection([Result(None)])
        with patch.object(main, "db", return_value=connection):
            with self.assertRaises(HTTPException) as expired:
                asyncio.run(main.dataset_image_content("00000001_000.png", "expired"))
        self.assertEqual(expired.exception.status_code, 404)

    def test_catalog_requires_authentication(self):
        response = TestClient(main.app).get("/dataset/images")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
