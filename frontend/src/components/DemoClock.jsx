import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { advance, reset } from "../api.js";
import { useStore } from "../store/useStore.js";

function escalatedLine(count) {
  if (count === 0) return "Nenhum caso escalou.";
  if (count === 1) return "1 caso escalou.";
  return `${count} casos escalaram.`;
}

export default function DemoClock() {
  const simNow = useStore((state) => state.simNow);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const [box, setBox] = useState(null);
  const confirmTimer = useRef(null);
  const statusTimer = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const panelId = useId();

  useEffect(() => {
    return () => {
      clearTimeout(confirmTimer.current);
      clearTimeout(statusTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    }
    place();
    const focusTimer = setTimeout(() => panel.current?.querySelector("button")?.focus(), 0);
    const closeOutside = (event) => {
      if (trigger.current?.contains(event.target) || panel.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  function showStatus(message) {
    setStatus(message);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 4000);
  }

  async function onAdvance(hours) {
    try {
      const result = await advance(hours);
      const ids = result?.recentlyEscalated;
      if (!Array.isArray(ids)) {
        showStatus(`Avançou ${hours}h.`);
        return;
      }
      showStatus(`Avançou ${hours}h. ${escalatedLine(ids.length)}`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "A ação não foi registrada.");
    }
  }

  async function onReset() {
    if (!confirming) {
      setConfirming(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirming(false);
    try {
      await reset();
      clearTimeout(statusTimer.current);
      setStatus("");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "A ação não foi registrada.");
    }
  }

  return (
    <div className="demo-clock">
      <button
        ref={trigger}
        type="button"
        className="demo-clock-trigger"
        aria-label={`Relógio da demonstração, hora simulada +${simNow}h`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          const rect = trigger.current?.getBoundingClientRect();
          if (rect) setBox({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
          setOpen((value) => !value);
        }}
      >
        Demo · +{simNow}h
      </button>
      {open && box ? createPortal(
        <div
          ref={panel}
          id={panelId}
          className="demo-clock-panel"
          role="dialog"
          aria-label="Relógio da demonstração"
          style={{ top: box.top, right: box.right }}
        >
          <div className="demo-clock-actions">
            <button type="button" onClick={() => onAdvance(1)}>+1h</button>
            <button type="button" onClick={() => onAdvance(6)}>+6h</button>
            <button type="button" onClick={() => onAdvance(24)}>+24h</button>
          </div>
          <button className="demo-clock-reset" type="button" onClick={onReset}>
            {confirming ? "Confirmar reset" : "Resetar demo"}
          </button>
          <p className="demo-clock-status" aria-live="polite">{status}</p>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
