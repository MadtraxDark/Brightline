const COORDINATION = "Coordenação de Radiologia";
const OPEN_FOR_ESCALATION = new Set(["notified", "escalated"]);

function clone(value) {
  return structuredClone(value);
}

export function currentTarget(caseItem) {
  if (caseItem.escalation_level <= 0) return caseItem.ordering_physician;
  if (caseItem.escalation_level === 1) return caseItem.radiologist;
  return COORDINATION;
}

export function timeRemaining(caseItem, simNow) {
  return caseItem.deadline_at - simNow;
}

function warnIfEvidenceMissing(report, finding) {
  const text = report?.text ?? "";
  if (!finding.evidence || !text.includes(finding.evidence)) {
    console.warn(
      `Evidência não é substring do laudo ${report?.report_id ?? "?"}: ${finding.evidence ?? ""}`,
    );
  }
}

export function loadCases(reports, cache) {
  const cases = [];
  for (const report of reports) {
    const extraction = cache[report.report_id];
    const findings = extraction?.findings ?? [];
    findings.forEach((finding, index) => {
      warnIfEvidenceMissing(report, finding);
      cases.push({
        id: `${report.report_id}-${index + 1}`,
        report_id: report.report_id,
        finding: finding.finding,
        evidence: finding.evidence,
        urgency: finding.urgency,
        confidence: finding.confidence,
        deadline_hours: finding.deadline_hours,
        deadline_at: finding.deadline_hours,
        escalation_level: 0,
        status: "notified",
        modality: report.modality,
        radiologist: report.radiologist,
        ordering_physician: report.ordering_physician,
        text: report.text,
        flagged_by_radiologist: report.flagged_by_radiologist,
        notified_at: 0,
        acknowledged_at: null,
        coordination_overdue_logged: false,
        events: [
          {
            at: 0,
            label: `Notificação enviada a ${report.ordering_physician}`,
          },
        ],
      });
    });
  }
  return { simNow: 0, cases };
}

function replaceCase(state, id, nextCase) {
  return {
    ...state,
    cases: state.cases.map((item) => (item.id === id ? nextCase : item)),
  };
}

function requireCase(state, id) {
  const item = state.cases.find((entry) => entry.id === id);
  if (!item) throw new Error("Caso não encontrado.");
  return item;
}

export function advance(state, hours) {
  const simNow = state.simNow + hours;
  const escalatedIds = [];
  const cases = state.cases.map((item) => {
    if (!OPEN_FOR_ESCALATION.has(item.status)) return item;
    if (item.deadline_at > simNow) return item;
    if (item.escalation_level < 2) {
      const escalation_level = item.escalation_level + 1;
      const next = {
        ...item,
        escalation_level,
        status: "escalated",
        deadline_at: simNow + item.deadline_hours,
        events: [...item.events],
      };
      next.events.push({
        at: simNow,
        label: `Escalado para ${currentTarget(next)}`,
      });
      escalatedIds.push(item.id);
      return next;
    }
    if (item.coordination_overdue_logged) return item;
    return {
      ...item,
      coordination_overdue_logged: true,
      events: [
        ...item.events,
        { at: simNow, label: "Prazo estourado na coordenação" },
      ],
    };
  });
  return { state: { simNow, cases }, escalatedIds };
}

export function acknowledge(state, id, by) {
  const item = requireCase(state, id);
  if (item.status === "closed") throw new Error("O caso já está fechado.");
  if (item.status === "read" || item.status === "action_taken") {
    throw new Error("A leitura já foi confirmada.");
  }
  if (!OPEN_FOR_ESCALATION.has(item.status)) {
    throw new Error("Confirme a leitura a partir de um caso notificado.");
  }
  const next = {
    ...clone(item),
    status: "read",
    acknowledged_at: state.simNow,
  };
  next.events.push({
    at: state.simNow,
    label: `Leitura confirmada por ${by}`,
  });
  return replaceCase(state, id, next);
}

export function registerAction(state, id, action, close) {
  const item = requireCase(state, id);
  if (item.status === "closed") throw new Error("O caso já está fechado.");
  if (
    item.status === "notified" ||
    item.status === "escalated" ||
    item.status === "detected"
  ) {
    throw new Error("Confirme a leitura antes.");
  }
  const note = (action ?? "").trim();
  if (item.status === "read") {
    if (!note) throw new Error("Descreva a ação.");
    const next = {
      ...clone(item),
      status: close ? "closed" : "action_taken",
    };
    next.events.push({ at: state.simNow, label: `Ação registrada: ${note}` });
    if (close) next.events.push({ at: state.simNow, label: "Caso fechado" });
    return replaceCase(state, id, next);
  }
  if (item.status === "action_taken" && close) {
    const next = { ...clone(item), status: "closed" };
    next.events.push({ at: state.simNow, label: "Caso fechado" });
    return replaceCase(state, id, next);
  }
  throw new Error("A ação já foi registrada.");
}

export function getMissed(state) {
  return state.cases.filter(
    (item) =>
      (item.urgency === "critical" || item.urgency === "urgent") &&
      item.flagged_by_radiologist === false,
  );
}

export function getStats(state) {
  const urgency = { critical: 0, urgent: 0, actionable: 0 };
  const status = {
    detected: 0,
    notified: 0,
    read: 0,
    action_taken: 0,
    closed: 0,
    escalated: 0,
  };
  const readHours = [];
  for (const item of state.cases) {
    if (urgency[item.urgency] != null) urgency[item.urgency] += 1;
    if (status[item.status] != null) status[item.status] += 1;
    if (item.acknowledged_at != null) {
      readHours.push(item.acknowledged_at - item.notified_at);
    }
  }
  const avg_time_to_read_hours = readHours.length
    ? readHours.reduce((sum, value) => sum + value, 0) / readHours.length
    : null;
  return { urgency, status, avg_time_to_read_hours };
}
