import {
  currentTarget,
  getMissed,
  getStats,
  timeRemaining,
} from "../engine/engine.js";
import contacts from "../data/contacts.json" with { type: "json" };

const URGENCY_RANK = { critical: 0, urgent: 1, actionable: 2 };

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function presentCase(item, simNow, report) {
  const copy = structuredClone(item);
  copy.events.sort((a, b) => a.at - b.at);
  copy.time_remaining_hours = timeRemaining(item, simNow);
  copy.current_target = currentTarget(item);
  copy.flagged_by_radiologist = item.flagged_by_radiologist;
  copy.radiologist = item.radiologist;
  copy.ordering_physician = item.ordering_physician;
  copy.modality = item.modality ?? null;
  copy.patient =
    report?.patient && typeof report.patient === "object"
      ? structuredClone(report.patient)
      : null;
  copy.location = typeof report?.location === "string" ? report.location : null;
  copy.indication =
    typeof report?.indication === "string" ? report.indication : null;
  const ramal = contacts[copy.current_target]?.ramal;
  copy.contact = typeof ramal === "string" && ramal ? { ramal } : null;
  return copy;
}

function reportFor(state, item) {
  return (
    listOf(state?.reports).find(
      (entry) => entry?.report_id === item?.report_id,
    ) ?? null
  );
}

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

function laneBucket() {
  return { open: 0, overdue: 0, resolved: 0 };
}

export function selectLanes(state) {
  const simNow = state?.simNow ?? 0;
  const lanes = {
    critical: laneBucket(),
    urgent: laneBucket(),
    actionable: laneBucket(),
    noAlert: { count: 0 },
  };
  const withCase = new Set();
  for (const item of listOf(state?.cases)) {
    if (item?.report_id != null) withCase.add(item.report_id);
    const bucket = lanes[item?.urgency];
    if (!bucket || !("open" in bucket)) continue;
    if (item.status === "closed") {
      bucket.resolved += 1;
      continue;
    }
    bucket.open += 1;
    const waiting = item.status === "notified" || item.status === "escalated";
    if (waiting && timeRemaining(item, simNow) < 0) bucket.overdue += 1;
  }
  for (const report of listOf(state?.reports)) {
    if (!withCase.has(report?.report_id)) lanes.noAlert.count += 1;
  }
  return lanes;
}

export function selectReportsWithoutAlert(state) {
  const withCase = new Set(listOf(state?.cases).map((item) => item?.report_id));
  return listOf(state?.reports)
    .filter((report) => report && !withCase.has(report.report_id))
    .map((report) => ({
      id: report.report_id,
      modality: report.modality ?? "",
      radiologist: report.radiologist ?? "",
      ordering_physician: report.ordering_physician ?? "",
    }));
}

export function selectNextDeadline(state) {
  const simNow = state?.simNow ?? 0;
  const waiting = listOf(state?.cases).filter(
    (item) =>
      item && (item.status === "notified" || item.status === "escalated"),
  );
  if (!waiting.length) return null;
  waiting.sort((a, b) => {
    const time = timeRemaining(a, simNow) - timeRemaining(b, simNow);
    if (time !== 0) return time;
    const rank =
      (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9);
    if (rank !== 0) return rank;
    return String(a.id).localeCompare(String(b.id));
  });
  const item = waiting[0];
  return {
    id: item.id,
    finding: item.finding,
    urgency: item.urgency,
    time_remaining_hours: timeRemaining(item, simNow),
  };
}

export function selectCases(
  state,
  { urgency, status, query, onlyUnflagged } = {},
) {
  const needle = fold((query ?? "").trim());
  return state.cases
    .filter((item) => {
      if (onlyUnflagged) {
        if (item.urgency !== "critical" && item.urgency !== "urgent")
          return false;
        if (item.flagged_by_radiologist !== false) return false;
      }
      if (urgency != null && item.urgency !== urgency) return false;
      if (status != null && item.status !== status) return false;
      if (!needle) return true;
      const target = currentTarget(item);
      const haystack = fold(`${item.finding} ${item.report_id} ${target}`);
      return haystack.includes(needle);
    })
    .map((item) => presentCase(item, state.simNow, reportFor(state, item)))
    .sort((a, b) => {
      const rank =
        (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3);
      if (rank !== 0) return rank;
      return a.time_remaining_hours - b.time_remaining_hours;
    });
}

export function selectCase(state, id) {
  const item = state.cases.find((entry) => entry.id === id);
  if (!item) return null;
  const presented = presentCase(item, state.simNow, reportFor(state, item));
  const report =
    state.reports.find((entry) => entry.report_id === item.report_id) ?? null;
  return {
    case: presented,
    report: report ? structuredClone(report) : null,
    events: presented.events.map((event) => structuredClone(event)),
  };
}

export function selectMissed(state) {
  return getMissed(state).map((item) =>
    presentCase(item, state.simNow, reportFor(state, item)),
  );
}

export function selectStats(state) {
  const stats = getStats(state);
  let awaitingRead = 0;
  let openCritical = 0;
  for (const item of state.cases) {
    if (item.status === "notified" || item.status === "escalated")
      awaitingRead += 1;
    if (item.urgency === "critical" && item.status !== "closed")
      openCritical += 1;
  }
  return { ...stats, awaitingRead, openCritical };
}
