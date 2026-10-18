import io
import unittest
from unittest.mock import Mock, patch

import numpy as np
import torch
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

    @unittest.skipIf(Image is None, "Pillow não está instalado no ambiente local")
    def test_preprocessing_matches_torchxrayvision_input(self):
        stream = io.BytesIO()
        Image.new("RGB", (31, 45), (128, 128, 128)).save(stream, format="PNG")
        batch = service.preprocess(stream.getvalue())
        self.assertEqual(tuple(batch.shape), (1, 1, 224, 224))
        self.assertTrue(-1024 <= float(batch.min()) and float(batch.max()) <= 1024)

    @unittest.skipIf(Image is None, "Pillow não está instalado no ambiente local")
    def test_inference_maps_outputs_by_pathology_name(self):
        stream = io.BytesIO()
        Image.new("L", (31, 45), 128).save(stream, format="PNG")
        pathologies = list(reversed(service.LABELS)) + ["Lung Lesion"]

        class Model:
            def __init__(self):
                self.pathologies = pathologies

            def __call__(self, batch):
                self.shape = tuple(batch.shape)
                return torch.tensor([[i / 100 for i in range(len(pathologies))]])

        model = Model()
        with patch.object(service, "_model", return_value=model):
            result, version = service.infer(stream.getvalue())
        self.assertEqual(model.shape, (1, 1, 224, 224))
        self.assertEqual(list(result), service.LABELS)
        self.assertAlmostEqual(result["Hernia"], 0.0)
        self.assertAlmostEqual(result["Atelectasis"], 0.13)
        self.assertEqual(version, service.MODEL_VERSION)

    @unittest.skipIf(Image is None, "Pillow não está instalado no ambiente local")
    def test_non_image_input_is_rejected(self):
        with self.assertRaises(ValueError):
            service.infer(b"not an image")

    def test_invalid_model_outputs_are_rejected(self):
        stream = io.BytesIO()
        Image.new("RGB", (24, 24)).save(stream, format="PNG")
        for output in (np.zeros((2, 14)), np.zeros((1, 13)),
                       np.full((1, 14), np.nan), np.full((1, 14), np.inf),
                       np.full((1, 14), -0.1), np.full((1, 14), 1.1)):
            model = Mock(pathologies=list(service.LABELS), return_value=torch.tensor(output, dtype=torch.float32))
            with self.subTest(output=output), patch.object(service, "_model", return_value=model):
                with self.assertRaises(RuntimeError):
                    service.infer(stream.getvalue())


if __name__ == "__main__":
    unittest.main()
