import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Expand,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MapPin,
  Send,
} from "lucide-react";

import { caseChatReply } from "../lib/caseChat.js";

export default function ExamViewer({ report, modality, item }) {
  const src = report?.image_url || "/images/chest-xray-demo.png";
  const illustrative = !report?.image_url;
  const [pointMode, setPointMode] = useState(false);
  const [points, setPoints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [question, setQuestion] = useState("");
  const [discussion, setDiscussion] = useState([]);
  const plane = useRef(null);
  function addPoint(x, y) {
    const point = { id: points.length + 1, x, y };
    setPoints((previous) => [...previous, point]);
    setSelected(point);
    setQuestion("");
  }
  function ask(event) {
    event.preventDefault();
    if (!question.trim() || !selected) return;
    const text = question.trim();
    setDiscussion((previous) => [
      ...previous,
      {
        point: selected.id,
        question: text,
        answer:
          "Este ponto foi marcado por você; a Luna ainda não analisa pixels ou regiões da imagem. " +
          caseChatReply(text, item ?? {}, report),
      },
    ]);
    setQuestion("");
    setSelected(null);
  }
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [canvasMode, setCanvasMode] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stage = useRef(null);
  const [ratio, setRatio] = useState(1);
  const [marks, setMarks] = useState(true);
  const dialog = useRef(null);
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
  useEffect(() => {
    setFailed(false);
  }, [src]);
  useEffect(
    () => () => {
      document.body.style.overflow = "";
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
          disabled={failed}
          aria-label="Abrir visualização ampliada da imagem"
          onClick={() => {
            reset();
            dialog.current.showModal();
            document.body.style.overflow = "hidden";
          }}
        >
          {!failed ? (
            <img src={src} alt={alt} onError={() => setFailed(true)} />
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
          document.body.style.overflow = "";
          trigger.current?.focus();
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
                setSelected(null);
              }}
            >
              <MapPin size={19} />
            </button>
            <button
              className="exam-mode-toggle"
              type="button"
              aria-label="Navegar no plano (atalho C)"
              aria-pressed={canvasMode}
              onClick={toggleMode}
            >
              C
            </button>
            <button
              type="button"
              aria-label="Diminuir zoom"
              disabled={zoom <= 0.25}
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            >
              <ZoomOut size={19} />
            </button>
            <output aria-label="Zoom">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
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
          </div>
          <div className="exam-workbench">
            <div
              className="exam-stage"
              ref={stage}
              data-mode={pointMode ? "point" : canvasMode ? "canvas" : "image"}
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
                if (event.button !== 0) return;
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
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
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
                    className="exam-user-point"
                    type="button"
                    key={point.id}
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                    }}
                    aria-label={`Perguntar sobre ponto ${point.id}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setSelected(point);
                      setQuestion("");
                    }}
                  >
                    {point.id}
                  </button>
                ))}
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
              </div>
            </div>
            {(selected || discussion.length > 0) && (
              <aside
                className="exam-point-chat"
                aria-label="Conversa com Luna sobre pontos"
              >
                <h3>Luna · Pontos da imagem</h3>
                <p className="point-chat-hint">
                  Marcações manuais · Respostas demonstrativas sobre o laudo.
                </p>
                <div className="point-chat-log" role="log" aria-live="polite">
                  {discussion.map((message, index) => (
                    <div key={index}>
                      <span>Ponto {message.point} · Você</span>
                      <p className="point-question">{message.question}</p>
                      <span>Luna</span>
                      <p>{message.answer}</p>
                    </div>
                  ))}
                </div>
                {selected && (
                  <form onSubmit={ask}>
                    <label htmlFor="point-question">
                      Sua pergunta · Ponto {selected.id}
                    </label>
                    <textarea
                      id="point-question"
                      autoFocus
                      key={selected.id}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      maxLength={2000}
                      placeholder="O que você quer discutir neste ponto?"
                      rows={3}
                    />
                    <button type="submit" disabled={!question.trim()}>
                      <Send size={16} />
                      Enviar para Luna
                    </button>
                  </form>
                )}
              </aside>
            )}
          </div>
          <footer>
            <span role="status">
              {pointMode
                ? "Clique na imagem para marcar um ponto e perguntar à Luna"
                : canvasMode
                  ? "Navegar no plano · Roda: zoom · Arraste: mover visualização"
                  : "Posicionar imagem · Roda e arraste: mover imagem"}{" "}
              · C alterna o modo
            </span>
            {!annotations.length && (
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
