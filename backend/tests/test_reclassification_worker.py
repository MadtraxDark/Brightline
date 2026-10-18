import time
import unittest
from unittest.mock import patch

from app import reclassification as service


def stalled_classification(connection):
    connection.recv()
    time.sleep(30)


def stalled_localization(connection):
    connection.recv()
    connection.send(("classified", ({"Atelectasis": 0.8}, "test", {"weights": "test"})))
    time.sleep(30)


def crashed_localization(connection):
    connection.recv()
    connection.send(("classified", ({"Atelectasis": 0.8}, "test", {})))
    connection.close()


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.worker = service.InferenceWorker()
        self.addCleanup(self.worker.close)

    def test_classification_timeout_kills_process_and_releases_capacity(self):
        with patch.object(service, "_serve", stalled_classification):
            with self.assertRaises(TimeoutError):
                self.worker.run(b"test", classification_timeout=0.1)
        self.assertIsNone(self.worker.process)
        self.assertFalse(self.worker.lock.locked())

    def test_localization_timeout_preserves_scores_and_kills_process(self):
        with patch.object(service, "_serve", stalled_localization):
            scores, version, markers, heatmap, metadata = self.worker.run(
                b"test", classification_timeout=10, localization_timeout=0.1)
        self.assertEqual(scores, {"Atelectasis": 0.8})
        self.assertEqual(markers, [])
        self.assertIsNone(heatmap)
        self.assertIsNone(self.worker.process)
        self.assertFalse(self.worker.lock.locked())

    def test_duplicate_requests_are_rejected_without_waiting(self):
        self.worker.lock.acquire()
        try:
            with self.assertRaises(service.WorkerBusy):
                self.worker.run(b"test")
        finally:
            self.worker.lock.release()

    def test_localization_process_exit_keeps_scores(self):
        with patch.object(service, "_serve", crashed_localization):
            scores, _, markers, heatmap, _ = self.worker.run(b"test", classification_timeout=10)
        self.assertEqual(scores, {"Atelectasis": 0.8})
        self.assertEqual(markers, [])
        self.assertIsNone(heatmap)
