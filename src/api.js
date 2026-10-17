import { selectCase, selectCases, selectMissed, selectStats } from "./store/selectors.js";
import { store } from "./store/store.js";

export async function listCases(filters) {
  return selectCases(store.getState(), filters);
}

export async function getCase(id) {
  const detail = selectCase(store.getState(), id);
  if (!detail) throw new Error("Caso não encontrado.");
  return detail;
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
