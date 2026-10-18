import PointChat from "./luna/PointChat.jsx";
import lunaIcon from "../assets/luna.png";
import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Expand,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Scan,
} from "lucide-react";

import { caseChatReply } from "../lib/caseChat.js";
import {
  pathologyColor,
  validLocalizationMarkers,
} from "../lib/pathologyColors.js";
import { authorizedRequest } from "../lib/session.js";

export default function ExamViewer({
  report,
  modality,
  item,
  analysis,
  activePathology,
  focusPathology,
  onSelectPathology,
  onHoverPathology,
}) {
  const [remoteSrc, setRemoteSrc] = useState("");
  const fileId = report?.image_file_id;
  useEffect(() => {
    if (!fileId) {
      setRemoteSrc("");
      return undefined;
    }
    let active = true;
    authorizedRequest(`/files/${fileId}/signed-url`, { method: "POST" })
      .then((data) => {
        if (active) setRemoteSrc(data?.url || "");
      })
      .catch(() => {
        if (active) setRemoteSrc("");
      });
    return () => {
      active = false;
    };
  }, [fileId]);
  const src =
    remoteSrc ||
    (!fileId && (report?.image_url || "/images/chest-xray-demo.png"));
  const illustrative = !fileId;
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:700px)").matches,
  );
  const touches = useRef(new Map());
  const gesture = useRef(null);
  useEffect(() => {
    const media = matchMedia("(max-width:700px)");
    const change = () => {
      setMobile(media.matches);
      touches.current.clear();
      gesture.current = null;
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const [pointMode, setPointMode] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [drawing, setDrawing] = useState(null);
  const areaStart = useRef(null);
  function mobileDown(event) {
    if (!mobile) return false;
    if (event.button !== 0) return true;
    event.currentTarget.setPointerCapture(event.pointerId);
    touches.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const list = [...touches.current.values()];
    if (list.length >= 2) {
      const [a, b] = list;
      const rect = stage.current.getBoundingClientRect();
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
        pan: { ...pan },
        mid: {
          x: (a.x + b.x) / 2 - rect.left - rect.width / 2,
          y: (a.y + b.y) / 2 - rect.top - rect.height / 2,
        },
      };
      areaStart.current = null;
      setDrawing(null);
    } else {
      const rect = plane.current.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      gesture.current = {
        kind:
          areaMode && inside ? "area" : pointMode && inside ? "point" : "pan",
        start: { x: event.clientX, y: event.clientY },
        pan: { ...pan },
      };
      if (gesture.current.kind === "area") {
        areaStart.current = imagePosition(event);
        setDrawing({ ...areaStart.current, width: 0, height: 0 });
      }
    }
    return true;
  }
  function mobileMove(event) {
    if (!mobile) return false;
    if (!touches.current.has(event.pointerId) || !gesture.current) return true;
    touches.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const g = gesture.current,
      list = [...touches.current.values()];
    if (g.kind === "pinch" && list.length >= 2) {
      const [a, b] = list,
        rect = stage.current.getBoundingClientRect();
      const next = Math.min(
          4,
          Math.max(
            0.25,
            (g.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
              Math.max(1, g.distance),
          ),
        ),
        factor = next / g.zoom;
      setZoom(next);
      setPan({
        x:
          (a.x + b.x) / 2 -
          rect.left -
          rect.width / 2 -
          (g.mid.x - g.pan.x) * factor,
        y:
          (a.y + b.y) / 2 -
          rect.top -
          rect.height / 2 -
          (g.mid.y - g.pan.y) * factor,
      });
    } else if (g.kind === "pan")
      setPan({
        x: g.pan.x + event.clientX - g.start.x,
        y: g.pan.y + event.clientY - g.start.y,
      });
    else if (g.kind === "area" && areaStart.current) {
      const p = imagePosition(event),
        a = areaStart.current;
      setDrawing({
        x: Math.min(p.x, a.x),
        y: Math.min(p.y, a.y),
        width: Math.abs(p.x - a.x),
        height: Math.abs(p.y - a.y),
      });
    }
    return true;
  }
  function mobileUp(event, cancelled = false) {
    if (!mobile) return false;
    const g = gesture.current;
    if (
      !cancelled &&
      g?.kind === "point" &&
      Math.hypot(event.clientX - g.start.x, event.clientY - g.start.y) < 10
    ) {
      const p = imagePosition(event);
      addPoint(p.x, p.y);
      setPointMode(false);
    }
    if (!cancelled && g?.kind === "area" && areaStart.current) {
      const p = imagePosition(event),
        a = areaStart.current;
      const region = {
        id: points.length + 1,
        kind: "area",
        x: Math.min(p.x, a.x),
        y: Math.min(p.y, a.y),
        width: Math.abs(p.x - a.x),
        height: Math.abs(p.y - a.y),
      };
      if (region.width > 0.02 && region.height > 0.02) {
        setPoints((list) => [...list, region]);
        setSelected(region);
        setChatOpen(true);
        setQuestion("");
        setAreaMode(false);
      }
    }
    touches.current.delete(event.pointerId);
    areaStart.current = null;
    setDrawing(null);
    const remaining = [...touches.current.values()][0];
    gesture.current = remaining
      ? { kind: "pan", start: remaining, pan: { ...pan } }
      : null;
    return true;
  }
  function imagePosition(event) {
    const rect = plane.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }
  const [points, setPoints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [question, setQuestion] = useState("");
  const [discussion, setDiscussion] = useState([]);
  const plane = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const replyTimer = useRef(null);
  const busyReply = useRef(false);
  useEffect(() => () => clearTimeout(replyTimer.current), []);
  function addPoint(x, y) {
    const point = { id: points.length + 1, x, y };
    setPoints((previous) => [...previous, point]);
    setSelected(point);
    setChatOpen(true);
    setQuestion("");
  }
  function ask(event) {
    event.preventDefault();
    if (!question.trim() || !selected || busyReply.current) return;
    const text = question.trim();
    const answer =
      "Este ponto foi marcado por você; a Luna ainda não analisa pixels ou regiões da imagem. " +
      caseChatReply(text, item ?? {}, report);
    const id = crypto.randomUUID();
    setDiscussion((previous) => [
      ...previous,
      {
        id,
        point: selected.id,
        kind: selected.kind,
        question: text,
        answer: null,
      },
    ]);
    setQuestion("");
    setTyping(true);
    busyReply.current = true;
    replyTimer.current = setTimeout(() => {
      setDiscussion((previous) =>
        previous.map((message) =>
          message.id === id ? { ...message, answer } : message,
        ),
      );
      setTyping(false);
      busyReply.current = false;
    }, 900);
  }
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [canvasMode, setCanvasMode] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stage = useRef(null);
  const [ratio, setRatio] = useState(1);
  const [marks, setMarks] = useState(true);
  const [showLocalization, setShowLocalization] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const dialog = useRef(null);
  const previousOverflow = useRef("");
  const drag = useRef(null);
  const trigger = useRef(null);
  const annotations =
    !illustrative && Array.isArray(report?.image_annotations)
      ? report.image_annotations.filter(
          (a) =>
            [a.x, a.y, a.width, a.height].every(Number.isFinite) &&
            a.x >= 0 &&
            a.y >= 0 &&
            a.width > 0 &&
            a.height > 0 &&
            a.x + a.width <= 1 &&
            a.y + a.height <= 1,
        )
      : [];
  const localizations = illustrative ? [] : validLocalizationMarkers(analysis);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  useEffect(() => {
    if (!focusPathology || illustrative || !src) return undefined;
    const marker = localizations.find(
      (localization) => localization.pathology === focusPathology,
    );
    if (!marker || !dialog.current) return undefined;
    if (!dialog.current.open) {
      dialog.current.showModal();
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const frame = requestAnimationFrame(() => {
      const currentStage = stage.current;
      const currentPlane = plane.current;
      if (!currentStage || !currentPlane) return;
      const nextZoom = 1.35;
      setZoom(nextZoom);
      setOffset({ x: 0, y: 0 });
      setPan({
        x: currentPlane.clientWidth * (0.5 - marker.x) * nextZoom,
        y: currentPlane.clientHeight * (0.5 - marker.y) * nextZoom,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusPathology, illustrative, src]);
  useEffect(
    () => () => {
      document.body.style.overflow = previousOverflow.current;
    },
    [],
  );
  useEffect(() => {
    const node = stage.current;
    function wheel(event) {
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? node.clientHeight
            : 1;
      if (canvasMode)
        setZoom((z) =>
          Math.min(
            4,
            Math.max(0.25, z * Math.exp(-event.deltaY * unit * 0.0015)),
          ),
        );
      else
        setOffset((p) => ({
          x: p.x - (event.deltaX * unit) / zoom,
          y: p.y - (event.deltaY * unit) / zoom,
        }));
    }
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [canvasMode, zoom]);
  function toggleMode() {
    drag.current = null;
    setCanvasMode((value) => !value);
  }
  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPan({ x: 0, y: 0 });
  }
  function close() {
    dialog.current.close();
  }
  const alt = illustrative
    ? "Radiografia ilustrativa do conjunto NIH, sem vínculo com este caso"
    : `Imagem do exame: ${modality}`;
  return (
    <>
      <figure className="exam-viewer exam-card">
        <header>
          <span>
            <ScanLine size={19} aria-hidden="true" />
            Imagem radiológica
          </span>
          <span className="exam-card-id">{report?.report_id}</span>
        </header>
        <button
          ref={trigger}
          className="exam-preview"
          type="button"
          disabled={failed || !src}
          aria-label="Abrir visualização ampliada da imagem"
          onClick={() => {
            reset();
            dialog.current.showModal();
            previousOverflow.current = document.body.style.overflow;
            document.body.style.overflow = "hidden";
          }}
        >
          {!failed && src ? (
            <div className="exam-preview-image" style={{ aspectRatio: ratio }}>
              <img
                src={src}
                alt={alt}
                onLoad={(event) =>
                  setRatio(
                    event.currentTarget.naturalWidth /
                      event.currentTarget.naturalHeight,
                  )
                }
                onError={() => setFailed(true)}
              />
              {localizations.map((marker) => (
                <span
                  key={marker.pathology}
                  className={`exam-preview-marker${activePathology === marker.pathology ? " is-active" : ""}`}
                  style={{
                    left: `${marker.x * 100}%`,
                    top: `${marker.y * 100}%`,
                    "--pathology-color": pathologyColor(marker.pathology),
                  }}
                  title={`${marker.pathology}: região estimada`}
                  aria-hidden="true"
                >
                  <span className="exam-preview-marker-label">
                    {marker.pathology.replaceAll("_", " ")}
                  </span>
                </span>
              ))}
            </div>
          ) : !failed && !src ? (
            <span className="exam-image-loading">Carregando radiografia…</span>
          ) : (
            <span className="exam-image-error">Imagem indisponível</span>
          )}
          {!failed && (
            <span className="exam-preview-overlay">
              <Expand size={22} aria-hidden="true" />
              <span>Ampliar imagem</span>
            </span>
          )}
        </button>
        <figcaption>
          {illustrative
            ? "Imagem ilustrativa · NIH ChestX-ray14 · Sem vínculo com este caso"
            : modality}
        </figcaption>
      </figure>
      <dialog
        className="exam-dialog"
        ref={dialog}
        aria-labelledby="exam-dialog-title"
        onKeyDown={(event) => {
          if (
            !mobile &&
            event.key.toLowerCase() === "c" &&
            !event.repeat &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !event.target.closest('input,textarea,[contenteditable="true"]')
          ) {
            event.preventDefault();
            toggleMode();
          }
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        onClose={() => {
          document.body.style.overflow = previousOverflow.current;
          trigger.current?.focus();
          onSelectPathology?.(null);
        }}
      >
        <div className="exam-dialog-shell">
          <header className="exam-dialog-header">
            <div>
              <h2 id="exam-dialog-title">Imagem radiológica</h2>
              <p>
                {illustrative
                  ? "Imagem ilustrativa, sem vínculo com este caso"
                  : `${modality} · ${report?.report_id || ""}`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fechar visualizador"
              onClick={close}
            >
              <X size={22} />
            </button>
          </header>
          <div className="exam-tools">
            <button
              type="button"
              aria-label="Marcar ponto para perguntar à Luna"
              aria-pressed={pointMode}
              onClick={() => {
                setPointMode((v) => !v);
                setAreaMode(false);
                setSelected(null);
              }}
            >
              <img
                className="exam-luna-tool"
                src={lunaIcon}
                alt=""
                width="30"
                height="30"
              />
              <span className="exam-touch-label">Ponto</span>
            </button>
            <button
              type="button"
              aria-label="Marcar área para perguntar à Luna"
              aria-pressed={areaMode}
              onClick={() => {
                setAreaMode((v) => !v);
                setPointMode(false);
                setDrawing(null);
                areaStart.current = null;
              }}
            >
              <Scan size={20} />
              <span className="exam-touch-label">Área</span>
            </button>
            <button
              className="exam-mode-toggle exam-desktop-control"
              type="button"
              aria-label="Navegar no plano (atalho C)"
              aria-pressed={canvasMode}
              onClick={toggleMode}
            >
              C
            </button>
            <button
              type="button"
              className="exam-desktop-control"
              aria-label="Diminuir zoom"
              disabled={zoom <= 0.25}
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            >
              <ZoomOut size={19} />
            </button>
            <output className="exam-desktop-control" aria-label="Zoom">
              {Math.round(zoom * 100)}%
            </output>
            <button
              type="button"
              className="exam-desktop-control"
              aria-label="Aumentar zoom"
              disabled={zoom >= 4}
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            >
              <ZoomIn size={19} />
            </button>
            <button
              type="button"
              aria-label="Centralizar imagem"
              onClick={reset}
            >
              <RotateCcw size={18} />
              <span className="exam-touch-label">Centralizar</span>
            </button>
            {annotations.length > 0 && (
              <button
                type="button"
                aria-pressed={marks}
                onClick={() => setMarks((v) => !v)}
              >
                Marcações da IA
              </button>
            )}
            {localizations.length > 0 && (
              <button
                type="button"
                aria-pressed={showLocalization}
                onClick={() => setShowLocalization((value) => !value)}
              >
                Pontos estimados
              </button>
            )}
            {analysis?.heatmap && (
              <button
                type="button"
                aria-pressed={showHeatmap}
                onClick={() => setShowHeatmap((value) => !value)}
              >
                Heatmap
              </button>
            )}
          </div>
          <div className="exam-workbench">
            <div
              className="exam-stage"
              ref={stage}
              data-mode={
                areaMode
                  ? "area"
                  : pointMode
                    ? "point"
                    : canvasMode
                      ? "canvas"
                      : "image"
              }
              style={{
                backgroundPosition: `${pan.x}px ${pan.y}px`,
                backgroundSize: `${48 * zoom}px ${48 * zoom}px`,
              }}
              tabIndex={0}
              aria-label="Imagem ampliada. Arraste para mover ou use as setas do teclado."
              onKeyDown={(event) => {
                const moves = {
                  ArrowUp: [0, -30],
                  ArrowDown: [0, 30],
                  ArrowLeft: [-30, 0],
                  ArrowRight: [30, 0],
                };
                if (moves[event.key]) {
                  event.preventDefault();
                  const [x, y] = moves[event.key];
                  if (canvasMode) setPan((p) => ({ x: p.x + x, y: p.y + y }));
                  else
                    setOffset((p) => ({
                      x: p.x + x / zoom,
                      y: p.y + y / zoom,
                    }));
                }
              }}
              onPointerDown={(event) => {
                if (mobileDown(event)) return;
                if (event.button !== 0) return;
                if (areaMode) {
                  const rect = plane.current.getBoundingClientRect();
                  if (
                    event.clientX < rect.left ||
                    event.clientX > rect.right ||
                    event.clientY < rect.top ||
                    event.clientY > rect.bottom
                  )
                    return;
                  areaStart.current = imagePosition(event);
                  setDrawing({ ...areaStart.current, width: 0, height: 0 });
                  event.currentTarget.setPointerCapture(event.pointerId);
                  return;
                }
                if (pointMode) {
                  const rect = plane.current.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / rect.width;
                  const y = (event.clientY - rect.top) / rect.height;
                  if (x >= 0 && x <= 1 && y >= 0 && y <= 1) addPoint(x, y);
                  return;
                }
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {
                  x: event.clientX,
                  y: event.clientY,
                  origin: canvasMode ? pan : offset,
                };
              }}
              onPointerMove={(event) => {
                if (mobileMove(event)) return;
                if (areaStart.current) {
                  const pos = imagePosition(event),
                    start = areaStart.current;
                  setDrawing({
                    x: Math.min(pos.x, start.x),
                    y: Math.min(pos.y, start.y),
                    width: Math.abs(pos.x - start.x),
                    height: Math.abs(pos.y - start.y),
                  });
                  return;
                }
                if (!drag.current) return;
                const { x, y, origin } = drag.current;
                if (canvasMode)
                  setPan({
                    x: origin.x + event.clientX - x,
                    y: origin.y + event.clientY - y,
                  });
                else
                  setOffset({
                    x: origin.x + (event.clientX - x) / zoom,
                    y: origin.y + (event.clientY - y) / zoom,
                  });
              }}
              onPointerUp={(event) => {
                if (mobileUp(event)) return;
                if (areaStart.current) {
                  const pos = imagePosition(event),
                    start = areaStart.current;
                  const region = {
                    id: points.length + 1,
                    kind: "area",
                    x: Math.min(pos.x, start.x),
                    y: Math.min(pos.y, start.y),
                    width: Math.abs(pos.x - start.x),
                    height: Math.abs(pos.y - start.y),
                  };
                  if (region.width > 0.015 && region.height > 0.015) {
                    setPoints((p) => [...p, region]);
                    setSelected(region);
                    setChatOpen(true);
                    setQuestion("");
                  }
                  areaStart.current = null;
                  setDrawing(null);
                }
                drag.current = null;
              }}
              onPointerCancel={(event) => {
                if (mobileUp(event, true)) return;
                areaStart.current = null;
                setDrawing(null);
                drag.current = null;
              }}
            >
              <div
                className="exam-image-plane"
                ref={plane}
                style={{
                  aspectRatio: ratio,
                  transform: `translate(${pan.x + offset.x * zoom}px,${pan.y + offset.y * zoom}px) scale(${zoom})`,
                }}
              >
                {points.map((point) => (
                  <button
                    className={
                      point.kind === "area"
                        ? "exam-user-area"
                        : "exam-user-point"
                    }
                    type="button"
                    key={point.id}
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                      ...(point.kind === "area"
                        ? {
                            width: `${point.width * 100}%`,
                            height: `${point.height * 100}%`,
                          }
                        : {
                            transform: `translate(-50%,-50%) scale(${1 / zoom})`,
                          }),
                    }}
                    aria-label={`Perguntar sobre ${point.kind === "area" ? "área" : "ponto"} ${point.id}`}
                    aria-pressed={selected?.id === point.id}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setSelected(point);
                      setChatOpen(true);
                      setQuestion("");
                    }}
                  >
                    <span
                      style={
                        point.kind === "area"
                          ? {
                              transform: `scale(${1 / zoom})`,
                              transformOrigin: "0 100%",
                            }
                          : undefined
                      }
                    >
                      {point.id}
                    </span>
                  </button>
                ))}
                {drawing && (
                  <span
                    className="exam-area-draft"
                    style={{
                      left: `${drawing.x * 100}%`,
                      top: `${drawing.y * 100}%`,
                      width: `${drawing.width * 100}%`,
                      height: `${drawing.height * 100}%`,
                    }}
                  />
                )}
                <img
                  src={src}
                  alt={alt}
                  draggable="false"
                  onLoad={(event) =>
                    setRatio(
                      event.currentTarget.naturalWidth /
                        event.currentTarget.naturalHeight,
                    )
                  }
                />
                {showHeatmap && analysis?.heatmap && (
                  <img
                    className="exam-localization-heatmap"
                    src={analysis.heatmap}
                    alt="Heatmap Grad-CAM estimado"
                    draggable="false"
                  />
                )}
                {marks &&
                  annotations.map((a, index) => (
                    <span
                      className="exam-annotation"
                      key={index}
                      style={{
                        left: `${a.x * 100}%`,
                        top: `${a.y * 100}%`,
                        width: `${a.width * 100}%`,
                        height: `${a.height * 100}%`,
                      }}
                    >
                      <span>{a.label || `Achado ${index + 1}`}</span>
                    </span>
                  ))}
                {showLocalization &&
                  localizations.map((marker) => (
                    <button
                      key={marker.pathology}
                      type="button"
                      className={`exam-ai-marker${activePathology === marker.pathology ? " is-active" : ""}`}
                      style={{
                        left: `${marker.x * 100}%`,
                        top: `${marker.y * 100}%`,
                        transform: `translate(-50%, -50%) scale(${(activePathology === marker.pathology ? 1.4 : 1) / zoom})`,
                        "--pathology-color": pathologyColor(marker.pathology),
                      }}
                      title={`${marker.pathology} · escore ${(marker.score * 100).toFixed(1)}% · região estimada`}
                      aria-label={`${marker.pathology}, escore do modelo ${(marker.score * 100).toFixed(1)}%, região estimada`}
                      aria-pressed={activePathology === marker.pathology}
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseEnter={() => onHoverPathology?.(marker.pathology)}
                      onMouseLeave={() => onHoverPathology?.(null)}
                      onFocus={() => onHoverPathology?.(marker.pathology)}
                      onBlur={() => onHoverPathology?.(null)}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectPathology?.(
                          focusPathology === marker.pathology
                            ? null
                            : marker.pathology,
                        );
                      }}
                    >
                      <span
                        className={
                          activePathology === marker.pathology ? "is-open" : ""
                        }
                        style={{
                          transform: `translate(-50%, -100%) scale(${zoom})`,
                        }}
                      >
                        {marker.pathology} · {(marker.score * 100).toFixed(1)}%
                        · estimativa
                      </span>
                    </button>
                  ))}
              </div>
            </div>
            {chatOpen && (
              <PointChat
                selected={selected}
                question={question}
                onQuestion={setQuestion}
                onSubmit={ask}
                discussion={discussion}
                typing={typing}
                reportId={report?.report_id}
                onClose={() => {
                  setChatOpen(false);
                  setPointMode(false);
                  setAreaMode(false);
                }}
              />
            )}
          </div>
          <footer>
            <span role="status">
              {mobile
                ? areaMode
                  ? "Arraste para selecionar uma área"
                  : pointMode
                    ? "Toque na imagem para marcar um ponto"
                    : "Arraste para mover · Use dois dedos para ampliar"
                : areaMode
                  ? "Arraste para selecionar uma área"
                  : pointMode
                    ? "Clique na imagem para marcar um ponto"
                    : canvasMode
                      ? "Navegar no plano · Roda: zoom · Arraste: mover visualização"
                      : "Posicionar imagem · Roda e arraste: mover imagem"}
              {!mobile && " · C alterna o modo"}
            </span>
            {!annotations.length && !localizations.length && (
              <span>
                Não há marcações de imagem da IA disponíveis para este caso.
              </span>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}
