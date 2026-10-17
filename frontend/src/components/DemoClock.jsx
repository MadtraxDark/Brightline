import { useEffect, useRef, useState } from "react";
import { advance, reset } from "../api.js";
import { useStore } from "../store/useStore.js";

function escalatedLine(count) {
  if (count === 0) return "Nenhum caso escalou.";
  if (count === 1) return "1 caso escalou.";
  return `${count} casos escalaram.`;
}

export default function DemoClock() {
  const simNow = useStore((state) => state.simNow);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const confirmTimer = useRef(null);
  const statusTimer = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(confirmTimer.current);
      clearTimeout(statusTimer.current);
    };
  }, []);

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
    <section className="demo-clock" aria-label="Relógio da demonstração">
      <h2>Relógio da demonstração</h2>
      <p className="demo-clock-time">Hora simulada: +{simNow}h</p>
      <div className="demo-clock-actions">
        <button type="button" onClick={() => onAdvance(1)}>+1h</button>
        <button type="button" onClick={() => onAdvance(6)}>+6h</button>
        <button type="button" onClick={() => onAdvance(24)}>+24h</button>
      </div>
      <button className="demo-clock-reset" type="button" onClick={onReset}>
        {confirming ? "Confirmar reset" : "Resetar demo"}
      </button>
      <p className="demo-clock-status" aria-live="polite">{status}</p>
    </section>
  );
}
