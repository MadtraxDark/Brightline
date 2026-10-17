import { currentTarget, getMissed, getStats, timeRemaining } from "../engine/engine.js";

const URGENCY_RANK = { critical: 0, urgent: 1, actionable: 2 };

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function presentCase(item, simNow) {
  const copy = structuredClone(item);
  copy.events.sort((a, b) => a.at - b.at);
  copy.time_remaining_hours = timeRemaining(item, simNow);
  copy.current_target = currentTarget(item);
  copy.flagged_by_radiologist = item.flagged_by_radiologist;
  copy.radiologist = item.radiologist;
  copy.ordering_physician = item.ordering_physician;
  return copy;
}

export function selectCases(state, { urgency, status, query, onlyUnflagged } = {}) {
  const needle = fold((query ?? "").trim());
  return state.cases
    .filter((item) => {
      if (onlyUnflagged) {
        if (item.urgency !== "critical" && item.urgency !== "urgent") return false;
        if (item.flagged_by_radiologist !== false) return false;
      }
      if (urgency != null && item.urgency !== urgency) return false;
      if (status != null && item.status !== status) return false;
      if (!needle) return true;
      const target = currentTarget(item);
      const haystack = fold(`${item.finding} ${item.report_id} ${target}`);
      return haystack.includes(needle);
    })
    .map((item) => presentCase(item, state.simNow))
    .sort((a, b) => {
      const rank = (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3);
      if (rank !== 0) return rank;
      return a.time_remaining_hours - b.time_remaining_hours;
    });
}

export function selectCase(state, id) {
  const item = state.cases.find((entry) => entry.id === id);
  if (!item) return null;
  const presented = presentCase(item, state.simNow);
  const report = state.reports.find((entry) => entry.report_id === item.report_id) ?? null;
  return {
    case: presented,
    report: report ? structuredClone(report) : null,
    events: presented.events.map((event) => structuredClone(event)),
  };
}

export function selectMissed(state) {
  return getMissed(state).map((item) => presentCase(item, state.simNow));
}

export function selectStats(state) {
  return getStats(state);
}
