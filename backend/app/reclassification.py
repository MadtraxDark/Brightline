"""Bounded, reusable CPU worker for report reclassification (no extra storage)."""
import atexit
import logging
import multiprocessing
import os
import threading
import time

from . import report_analysis

logger = logging.getLogger("uvicorn.error")
CLASSIFICATION_TIMEOUT = float(os.getenv("BRIGHTLINE_RECLASSIFY_TIMEOUT", "60"))
LOCALIZATION_TIMEOUT = float(os.getenv("BRIGHTLINE_LOCALIZATION_TIMEOUT", "20"))


class WorkerBusy(RuntimeError):
    pass


def _serve(connection):
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    while True:
        try:
            content = connection.recv()
        except EOFError:
            return
        try:
            def classified(scores, version):
                connection.send(("classified", (scores, version, report_analysis.model_metadata())))

            result = report_analysis.infer(content, include_localizations=True, on_classified=classified)
            connection.send(("completed", result))
        except Exception as exc:
            logger.error("[RECLASSIFY] stage=worker_failed exception=%s", type(exc).__name__)
            connection.send(("error", "invalid_image" if isinstance(exc, ValueError) else "model_unavailable"))


class InferenceWorker:
    def __init__(self):
        self.lock = threading.Lock()
        self.process = None
        self.connection = None

    def close(self):
        if self.process is not None:
            if self.process.is_alive():
                self.process.terminate()
            self.process.join(timeout=2)
            if self.process.is_alive():
                self.process.kill()
                self.process.join(timeout=2)
            self.process.close()
            self.process = None
        if self.connection is not None:
            self.connection.close()
            self.connection = None

    def run(self, content, classification_timeout=None, localization_timeout=None):
        if not self.lock.acquire(blocking=False):
            raise WorkerBusy("Uma reclassificação já está em andamento. Aguarde e tente novamente.")
        started = time.monotonic()
        classified_result = None
        try:
            if self.process is None or not self.process.is_alive():
                self.close()
                context = multiprocessing.get_context("spawn")
                self.connection, child = context.Pipe()
                self.process = context.Process(target=_serve, args=(child,), daemon=True)
                self.process.start()
                child.close()
            self.connection.send(content)
            classification_timeout = CLASSIFICATION_TIMEOUT if classification_timeout is None else classification_timeout
            localization_timeout = LOCALIZATION_TIMEOUT if localization_timeout is None else localization_timeout
            if not self.connection.poll(classification_timeout):
                raise TimeoutError("A classificação excedeu o limite de tempo. Tente novamente.")
            stage, payload = self.connection.recv()
            if stage == "error":
                if payload == "invalid_image":
                    raise ValueError("Arquivo de radiografia inválido.")
                raise RuntimeError("Serviço do modelo TorchXRayVision indisponível.")
            if stage != "classified":
                raise RuntimeError("Resposta inválida do processo de inferência.")
            scores, version, metadata = payload
            classified_result = (scores, version, [], None, metadata)
            if not self.connection.poll(localization_timeout):
                # Scores have already arrived. Terminate a stuck CAM and keep them.
                logger.error("[RECLASSIFY] stage=localization_timeout elapsed=%.3f", time.monotonic() - started)
                self.close()
                return scores, version, [], None, metadata
            stage, payload = self.connection.recv()
            if stage != "completed":
                logger.error("[RECLASSIFY] stage=localization_failed elapsed=%.3f", time.monotonic() - started)
                self.close()
                return scores, version, [], None, metadata
            return (*payload, metadata)
        except TimeoutError:
            self.close()
            raise
        except (EOFError, BrokenPipeError, OSError) as exc:
            self.close()
            if classified_result is not None:
                logger.error("[RECLASSIFY] stage=localization_process_failed exception=%s elapsed=%.3f",
                             type(exc).__name__, time.monotonic() - started)
                return classified_result
            raise RuntimeError("O processo do modelo foi interrompido. Tente novamente.") from exc
        except Exception:
            self.close()
            raise
        finally:
            self.lock.release()


worker = InferenceWorker()
atexit.register(worker.close)
