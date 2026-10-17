export function precision(tp, fp) {
  const denominator = Number(tp) + Number(fp);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return tp / denominator;
}

export function recall(tp, fn) {
  const denominator = Number(tp) + Number(fn);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return tp / denominator;
}

export function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}
