import io
import unittest
from unittest.mock import patch

import numpy as np
try:
    from PIL import Image
except ImportError:
    Image = None

from app import report_analysis as service


class ReportAnalysisTests(unittest.TestCase):
    def test_comparison_exposes_both_disagreement_directions(self):
        findings = [{"finding": "derrame pleural à direita", "evidence": "Derrame pleural à direita."}]
        scores = {name: 0.1 for name in service.LABELS}
        scores["Pneumothorax"] = 0.83
        result = service.compare(findings, scores)
        self.assertEqual(result["threshold_status"], "exploratory_unvalidated")
        self.assertEqual({item["type"] for item in result["disagreements"]},
                         {"text_not_signaled", "model_without_text_match"})
        effusion = next(item for item in result["disagreements"] if item["class"] == "Effusion")
        self.assertEqual(effusion["laterality"], "right")

    def test_uncertainty_and_negation_are_explicit_in_comparison(self):
        scores = {name: 0.1 for name in service.LABELS}
        uncertain = service.compare(
            [{"finding": "Possível derrame pleural à esquerda", "evidence": "Possível derrame pleural à esquerda."}],
            scores,
        )
        mismatch = next(item for item in uncertain["disagreements"] if item["class"] == "Effusion")
        self.assertTrue(mismatch["uncertainty"])
        self.assertEqual(mismatch["laterality"], "left")

        scores["Effusion"] = 0.9
        negated = service.compare(
            [{"finding": "Sem derrame pleural", "evidence": "Sem derrame pleural."}], scores
        )
        mismatch = next(item for item in negated["disagreements"] if item["class"] == "Effusion")
        self.assertTrue(mismatch["negated_or_uncertain"])

    def test_metrics_do_not_claim_class_thresholds(self):
        metrics = service.read_metrics()
        self.assertEqual(metrics["test_metrics"]["macro_auc"], 0.6130061745643616)
        self.assertNotIn("thresholds", metrics)

    @unittest.skipIf(Image is None, "Pillow não está instalado no ambiente local")
    def test_inference_uses_rgb_224_and_returns_all_labels(self):
        stream = io.BytesIO()
        Image.new("L", (31, 45), 128).save(stream, format="PNG")

        class Model:
            def predict(self, batch, verbose=0):
                self.assert_shape = batch.shape
                return np.full((1, 14), 0.25, dtype=np.float32)

        model = Model()
        with patch.object(service, "_model", return_value=model):
            result, version = service.infer(stream.getvalue())
        self.assertEqual(model.assert_shape, (1, 224, 224, 3))
        self.assertEqual(set(result), set(service.LABELS))
        self.assertEqual(version, service.MODEL_VERSION)

    @unittest.skipIf(Image is None, "Pillow não está instalado no ambiente local")
    def test_non_image_input_is_rejected(self):
        with self.assertRaises(ValueError):
            service.infer(b"not an image")


if __name__ == "__main__":
    unittest.main()
