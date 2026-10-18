import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import luna from "../assets/luna.png";
import { loadReportImage } from "../lib/reportImage.js";
import {
  pathologyColor,
  pathologyLabel,
  validLocalizationMarkers,
} from "../lib/pathologyColors.js";
import { markersInsideFilm } from "../lib/filmMarkers.js";
import PathologyScoreList from "./PathologyScoreList.jsx";

const LINE_MS = 1200;
const DOTS_MS = 900;

export default function LunaReadingModal({
  open,
  report,
  modality,
  status,
  result,
  error,
  onReveal,
  onFail,
  onClose,
}) {
  const dialog = useRef(null);
  const previousOverflow = useRef("");
  const revealed = useRef(false);
  const onRevealRef = useRef(onReveal);
  const onFailRef = useRef(onFail);
  onRevealRef.current = onReveal;
  onFailRef.current = onFail;
  const [beat, setBeat] = useState("line");
  const [imageSrc, setImageSrc] = useState("");
  const [ratio, setRatio] = useState(0);
  const [shownMarkers, setShownMarkers] = useState(null);
  const fileId = report?.image_file_id;
  const datasetFilename = report?.dataset_filename;

  useEffect(() => {
    if (!open) return undefined;
    revealed.current = false;
    setBeat("line");
    const timer = window.setTimeout(() => setBeat("dots"), LINE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || beat !== "dots" || revealed.current) return undefined;
    if (status !== "ready" && status !== "error") return undefined;
    const timer = window.setTimeout(() => {
      revealed.current = true;
      if (status === "error") {
        setBeat("error");
        onFailRef.current(error);
        return;
      }
      setBeat("scores");
      onRevealRef.current(result);
    }, DOTS_MS);
    return () => window.clearTimeout(timer);
  }, [open, beat, status, result, error]);

  useEffect(() => {
    if (!open || (!fileId && !datasetFilename)) {
      setImageSrc("");
      setRatio(0);
      return undefined;
    }
    let active = true;
    loadReportImage({
      image_file_id: fileId,
      dataset_filename: datasetFilename,
    })
      .then((url) => {
        if (active) setImageSrc(url || "");
      })
      .catch(() => {
        if (active) setImageSrc("");
      });
    return () => {
      active = false;
    };
  }, [open, fileId, datasetFilename]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return undefined;
    if (open && !node.open) {
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      node.showModal();
      node.querySelector(".luna-reading-close")?.focus();
    }
    if (!open && node.open) node.close();
    return undefined;
  }, [open]);

  useEffect(
    () => () => {
      if (dialog.current?.open)
        document.body.style.overflow = previousOverflow.current;
    },
    [],
  );

  const scanning = beat === "line" || beat === "dots";
  const frameImage = useRef(null);
  const markers = useMemo(
    () => (beat === "scores" ? validLocalizationMarkers(result) : []),
    [beat, result],
  );
  const visibleMarkers = shownMarkers ?? markers;
  useEffect(() => {
    const image = frameImage.current;
    if (!markers.length || !image?.complete || !image.naturalWidth) {
      setShownMarkers(null);
      return;
    }
    setShownMarkers(markersInsideFilm(image, markers));
  }, [markers]);

  return (
    <dialog
      ref={dialog}
      className="luna-reading-dialog"
      aria-labelledby="luna-reading-line"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        document.body.style.overflow = previousOverflow.current;
      }}
    >
      <button
        className="luna-reading-close icon-button"
        type="button"
        aria-label="Fechar análise"
        onClick={onClose}
      >
        <X size={21} aria-hidden="true" />
      </button>
      <div className="luna-reading">
        <figure className="luna-reading-figure">
          {imageSrc ? (
            <div
              className="luna-reading-frame"
              style={ratio ? { aspectRatio: String(ratio) } : undefined}
            >
              <img
                ref={frameImage}
                src={imageSrc}
                alt={
                  modality
                    ? `Radiografia em análise: ${modality}`
                    : "Radiografia em análise"
                }
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth && image.naturalHeight) {
                    setRatio(image.naturalWidth / image.naturalHeight);
                  }
                  setShownMarkers(markersInsideFilm(image, markers));
                }}
              />
              {visibleMarkers.map((marker) => (
                <span
                  key={marker.pathology}
                  className="exam-preview-marker"
                  style={{
                    left: `${marker.x * 100}%`,
                    top: `${marker.y * 100}%`,
                    "--pathology-color": pathologyColor(marker.pathology),
                  }}
                  title={`${pathologyLabel(marker.pathology)}: região estimada`}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <p>Carregando a radiografia.</p>
          )}
          {scanning && imageSrc ? (
            <span className="luna-reading-scan" aria-hidden="true" />
          ) : null}
        </figure>
        <div className="luna-reading-voice">
          <img src={luna} alt="" width="72" height="72" />
          <p id="luna-reading-line">Pera aí, acho que vi algo</p>
          {beat === "dots" || beat === "scores" ? (
            <p className="luna-reading-dots" aria-label="Luna analisando">
              <span />
              <span />
              <span />
            </p>
          ) : null}
          {beat === "scores" && result?.probabilities ? (
            <div className="luna-reading-scores" aria-live="polite">
              <PathologyScoreList
                probabilities={result.probabilities}
                markers={result.markers}
              />
              <small>
                Escores exploratórios do TorchXRayVision. Não são probabilidades
                clínicas calibradas.
              </small>
            </div>
          ) : null}
          {beat === "error" ? (
            <p className="luna-reading-error" role="alert">
              {error || "Não foi possível reclassificar a radiografia."}
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
