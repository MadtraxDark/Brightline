import { useEffect, useRef, useState } from "react";
import { classificationConfidence } from "../lib/classificationConfidence.js";

const DURATION_MS = 900;

function formatPercent(value) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export default function RollingPercent({
  value,
  from,
  rollId = 0,
  className = "",
}) {
  const start = Number.isFinite(from) ? from : value;
  const [shown, setShown] = useState(start);
  const shownRef = useRef(start);
  const seenRoll = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(value)) return undefined;
    const play = rollId !== seenRoll.current;
    seenRoll.current = rollId;
    const fromValue =
      play && Number.isFinite(from)
        ? from
        : Number.isFinite(shownRef.current)
          ? shownRef.current
          : value;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!play || reduced || fromValue === value) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }
    const origin = fromValue;
    const started = performance.now();
    let frame = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const next = origin + (value - origin) * eased;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, from, rollId]);

  if (!Number.isFinite(shown)) return null;
  const tone = classificationConfidence({ confidence_percent: shown }).tone;
  return (
    <span className={`${className} is-${tone}`.trim()}>
      {formatPercent(shown)}
    </span>
  );
}
