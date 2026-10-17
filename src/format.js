const STATUS_LABEL = {
  detected: "Detectado",
  notified: "Notificado",
  read: "Lido",
  action_recorded: "Ação registrada",
  action_taken: "Ação registrada",
  closed: "Fechado",
  escalated: "Escalado",
};

const CONFIDENCE_LABEL = {
  alta: "alta",
  media: "média",
  baixa: "baixa",
  high: "alta",
  medium: "média",
  low: "baixa",
};

export function statusLabel(status) {
  return STATUS_LABEL[status] || status;
}

export function confidenceLabel(confidence) {
  return CONFIDENCE_LABEL[confidence] || confidence;
}

export function formatOffset(hours) {
  const rounded = Math.round(hours);
  return `+${rounded}h`;
}

export function formatAverage(hours) {
  if (hours == null || Number.isNaN(hours)) return "—";
  const value = hours.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return `${value} h`;
}

export function splitEvidence(text, evidence) {
  if (!evidence) return { found: false, before: text, match: "", after: "" };
  const index = text.indexOf(evidence);
  if (index === -1) return { found: false, before: text, match: "", after: "" };
  return {
    found: true,
    before: text.slice(0, index),
    match: evidence,
    after: text.slice(index + evidence.length),
  };
}
