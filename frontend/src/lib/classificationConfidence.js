// confidence_percent is explicitly on a 0–100 scale; categorical confidence
// must never be converted into an invented numerical probability.
export function classificationConfidence(item) {
  const value = item?.confidence_percent;
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  ) {
    return {
      label: `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`,
      tone: value > 80 ? "high" : value < 20 ? "low" : "medium",
      numeric: true,
    };
  }
  const labels = { high: "Alta", medium: "Média", low: "Baixa" };
  return {
    label: labels[item?.confidence] ?? "Não informada",
    tone: labels[item?.confidence] ? item.confidence : "unknown",
    numeric: false,
  };
}

export function topProbabilityPercent(probabilities) {
  if (!probabilities || typeof probabilities !== "object") return null;
  let best = null;
  for (const value of Object.values(probabilities)) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
      continue;
    if (best === null || value > best) best = value;
  }
  return best === null ? null : best * 100;
}
