import {
  selectCase,
  selectCases,
  selectMissed,
  selectStats,
} from "./store/selectors.js";
import { store } from "./store/store.js";
import { authenticatedRequest } from "./lib/session.js";

function reportFromCase(item) {
  return {
    report_id: item.report_id,
    modality: item.modality,
    radiologist: item.radiologist,
    ordering_physician: item.ordering_physician,
    text: item.text,
    flagged_by_radiologist: item.flagged_by_radiologist,
    ground_truth: [],
  };
}

function caseFromApi(item) {
  return {
    ...item,
    deadline_at: Number(item.deadline_at),
    notified_at: item.notified_at == null ? 0 : Number(item.notified_at),
    acknowledged_at:
      item.acknowledged_at == null ? null : Number(item.acknowledged_at),
    events: (item.events || []).map((event) => ({
      at: Number(event.at),
      label: event.label,
    })),
  };
}

export async function refreshDashboard() {
  const [items, clock] = await Promise.all([
    authenticatedRequest(sessionStorage, "/cases", { method: "GET" }),
    authenticatedRequest(sessionStorage, "/simulate", { method: "GET" }),
  ]);
  const cases = items.map(caseFromApi);
  const reportMap = new Map();
  for (const item of cases) reportMap.set(item.report_id, reportFromCase(item));
  store.hydrateRemote({
    cases,
    reports: [...reportMap.values()],
    simNow: Number(clock.sim_now),
  });
  return cases;
}

export async function listCases(filters) {
  return selectCases(store.getState(), filters);
}

export async function getCase(id) {
  const detail = selectCase(store.getState(), id);
  if (!detail) throw new Error("Caso não encontrado.");
  return detail;
}

export async function acknowledge(id, by) {
  await authenticatedRequest(sessionStorage, `/cases/${id}/acknowledge`, {
    body: { by },
  });
  await refreshDashboard();
  return (await getCase(id)).case;
}

export async function registerAction(id, action, close) {
  await authenticatedRequest(sessionStorage, `/cases/${id}/action`, {
    body: { action, close },
  });
  await refreshDashboard();
  return (await getCase(id)).case;
}

export async function advance(hours) {
  const result = await authenticatedRequest(
    sessionStorage,
    `/simulate/advance?hours=${encodeURIComponent(hours)}`,
  );
  await refreshDashboard();
  return {
    simNow: result.sim_now,
    recentlyEscalated: result.changed_cases.map((item) => item.id),
    cases: selectCases(store.getState()),
  };
}

export async function reset() {
  await authenticatedRequest(sessionStorage, "/simulate/reset");
  await refreshDashboard();
  const state = store.getState();
  return {
    simNow: state.simNow,
    recentlyEscalated: state.recentlyEscalated.slice(),
    cases: selectCases(state),
  };
}

export async function listMissed() {
  return selectMissed(store.getState());
}

export async function getStats() {
  return selectStats(store.getState());
}
