import { currentTarget, getMissed, getStats as statsOf, timeRemaining } from "./engine/engine.js";
import { store } from "./store/store.js";

const URGENCY_RANK = { critical: 0, urgent: 1, actionable: 2 };

function presentCase(item, simNow) {
  const copy = structuredClone(item);
  copy.events.sort((a, b) => a.at - b.at);
  copy.time_remaining_hours = timeRemaining(item, simNow);
  copy.current_target = currentTarget(item);
  return copy;
}

function matches(item, urgency, status) {
  if (urgency != null && item.urgency !== urgency) return false;
  if (status != null && item.status !== status) return false;
  return true;
}

export async function listCases({ urgency, status } = {}) {
  const state = store.getState();
  return state.cases
    .filter((item) => matches(item, urgency, status))
    .map((item) => presentCase(item, state.simNow))
    .sort((a, b) => {
      const rank = (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3);
      if (rank !== 0) return rank;
      return a.time_remaining_hours - b.time_remaining_hours;
    });
}

export async function getCase(id) {
  const state = store.getState();
  const item = state.cases.find((entry) => entry.id === id);
  if (!item) throw new Error("Caso não encontrado.");
  const report = state.reports.find((entry) => entry.report_id === item.report_id) ?? null;
  const presented = presentCase(item, state.simNow);
  return {
    case: presented,
    report: report ? structuredClone(report) : null,
    events: presented.events.map((event) => structuredClone(event)),
  };
}

export async function acknowledge(id, by) {
  store.acknowledge(id, by);
  return (await getCase(id)).case;
}

export async function registerAction(id, action, close) {
  store.registerAction(id, action, close);
  return (await getCase(id)).case;
}

export async function advance(hours) {
  store.advance(hours);
  const state = store.getState();
  return {
    simNow: state.simNow,
    recentlyEscalated: state.recentlyEscalated.slice(),
    cases: state.cases.map((item) => presentCase(item, state.simNow)),
  };
}

export async function reset() {
  store.reset();
  const state = store.getState();
  return {
    simNow: state.simNow,
    recentlyEscalated: state.recentlyEscalated.slice(),
    cases: state.cases.map((item) => presentCase(item, state.simNow)),
  };
}

export async function listMissed() {
  const state = store.getState();
  return getMissed(state).map((item) => presentCase(item, state.simNow));
}

export async function getStats() {
  return structuredClone(statsOf(store.getState()));
}
