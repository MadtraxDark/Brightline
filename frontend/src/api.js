import { authorizedRequest } from "./lib/session.js";
import {
  selectCase,
  selectCases,
  selectMissed,
  selectStats,
} from "./store/selectors.js";
import { store } from "./store/store.js";

export async function refreshWorkspace() {
  const data = await authorizedRequest("/workspace");
  store.replace({
    simNow: data.sim_now,
    reports: data.reports,
    cases: data.cases,
  });
  return store.getState();
}

export async function listCases(filters) {
  return selectCases(store.getState(), filters);
}

export async function getCase(id) {
  const detail = selectCase(store.getState(), id);
  if (!detail) throw new Error("Caso não encontrado.");
  return detail;
}

export async function acknowledge(id) {
  await authorizedRequest(`/cases/${id}/acknowledge`, {
    method: "POST",
    body: { by: "Revisão" },
  });
  await refreshWorkspace();
  return (await getCase(id)).case;
}

export async function registerAction(id, action, close) {
  await authorizedRequest(`/cases/${id}/action`, {
    method: "POST",
    body: { action: action?.trim() || "Caso encerrado", close: Boolean(close) },
  });
  await refreshWorkspace();
  return (await getCase(id)).case;
}

export async function advance(hours) {
  store.advance(hours);
  const state = store.getState();
  return {
    simNow: state.simNow,
    recentlyEscalated: state.recentlyEscalated.slice(),
    cases: selectCases(state),
  };
}

export async function reset() {
  store.reset();
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
