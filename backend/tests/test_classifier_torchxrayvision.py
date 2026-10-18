"""Exercise the real pretrained TorchXRayVision weights over HTTP with synthetic inputs."""
import io
import unittest

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app import report_analysis as service


def _weights_available() -> bool:
    try:
        service._model()
    except Exception:
        return False
    return True


@unittest.skipUnless(_weights_available(), "TorchXRayVision runtime/weights not available")
class TorchXRayVisionClassifierTests(unittest.TestCase):
    def test_http_predictions_depend_on_pixels_and_match_direct_inference(self):
        vectors = []
        # Without a context manager the client bypasses database startup; inference
        # and multipart routing still execute normally, with no mocked model.
        client = TestClient(app)
        for pattern in ("gradient", "inverse"):
            ramp = np.tile(np.linspace(0, 255, 64, dtype=np.uint8), (64, 1))
            pixels = ramp if pattern == "gradient" else 255 - ramp
            stream = io.BytesIO()
            Image.fromarray(pixels, "L").save(stream, format="PNG")
            content = stream.getvalue()
            response = client.post("/radiographs/classify", files={
                "radiograph": ("synthetic.png", content, "image/png")})
            self.assertEqual(response.status_code, 200, response.text)
            body = response.json()
            expected, _ = service.infer(content)
            np.testing.assert_allclose(list(body["probabilities"].values()), list(expected.values()), atol=1e-6)
            self.assertEqual(list(body["probabilities"]), service.LABELS)
            self.assertEqual(body["predictions"], sorted(k for k, p in expected.items() if p >= body["threshold"]))
            self.assertEqual(body["model_metadata"]["engine"], "torchxrayvision")
            vectors.append(list(expected.values()))
        self.assertGreater(float(np.max(np.abs(np.array(vectors[0]) - vectors[1]))), 1e-5)

    def test_corrupt_and_empty_uploads_have_no_prediction(self):
        client = TestClient(app)
        for content in (b"", b"not an image"):
            response = client.post("/radiographs/classify", files={
                "radiograph": ("invalid.png", content, "image/png")})
            self.assertEqual(response.status_code, 422)
            self.assertNotIn("probabilities", response.json())
