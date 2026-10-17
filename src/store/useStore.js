import { useSyncExternalStore } from "react";
import { store } from "./store.js";

export function useStore(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

let escalatedIds = null;
let escalatedSet = new Set();

function getRecentlyEscalated() {
  const ids = store.getState().recentlyEscalated;
  if (ids !== escalatedIds) {
    escalatedIds = ids;
    escalatedSet = new Set(ids);
  }
  return escalatedSet;
}

export function useRecentlyEscalated() {
  return useSyncExternalStore(
    store.subscribe,
    getRecentlyEscalated,
    getRecentlyEscalated,
  );
}
