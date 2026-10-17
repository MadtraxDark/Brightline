const STATUS_LABEL = {
  detected: "Detectado",
  notified: "Notificado",
  read: "Lido",
  action_recorded: "Ação registrada",
  closed: "Fechado",
  escalated: "Escalado",
};

const CONFIDENCE_LABEL = {
  alta: "alta",
  media: "média",
  baixa: "baixa",
};

export function statusLabel(status) {
  return STATUS_LABEL[status] || status;
}

export function confidenceLabel(confidence) {
  return CONFIDENCE_LABEL[confidence] || confidence;
}

export function formatRemaining(hours) {
  const overdue = hours < 0;
  const totalMinutes = Math.round(Math.abs(hours) * 60);
  let body;
  if (totalMinutes >= 48 * 60) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const restHours = Math.floor((totalMinutes % (24 * 60)) / 60);
    body = `${days}d ${restHours}h`;
  } else if (totalMinutes >= 60) {
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    body = minutes === 0 ? `${wholeHours}h` : `${wholeHours}h ${minutes}m`;
  } else {
    body = `${totalMinutes} min`;
  }
  return {
    overdue,
    text: overdue ? `Atrasado há ${body}` : body,
  };
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
