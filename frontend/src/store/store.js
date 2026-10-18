import {
  acknowledge as acknowledgeCase,
  advance as advanceClock,
  loadCases,
  registerAction as registerCaseAction,
} from "../engine/engine.js";

export const STORAGE_KEY = "brightline:v1";
const EMPTY_REPORTS = [];
const EMPTY_CACHE = {};

function dataSignature(sourceReports, sourceCache) {
  const text = JSON.stringify([sourceReports, sourceCache]);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

const defaultTimers = {
  setTimeout(fn, ms) {
    return setTimeout(fn, ms);
  },
  clearTimeout(id) {
    clearTimeout(id);
  },
};

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

export function createStore({ storage, timers = defaultTimers, data } = {}) {
  const sourceReports = data?.reports ?? EMPTY_REPORTS;
  const sourceCache = data?.cache ?? EMPTY_CACHE;
  const sig = dataSignature(sourceReports, sourceCache);

  function freshState() {
    const loaded = loadCases(sourceReports, sourceCache);
    return {
      v: 2,
      sig,
      simNow: loaded.simNow,
      cases: loaded.cases,
      reports: sourceReports,
      recentlyEscalated: [],
    };
  }

  function readState(currentStorage) {
    try {
      const raw = currentStorage.getItem(STORAGE_KEY);
      if (raw == null || raw === "") return freshState();
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        parsed.v !== 2 ||
        parsed.sig !== sig ||
        !Array.isArray(parsed.cases) ||
        typeof parsed.simNow !== "number"
      ) {
        return freshState();
      }
      return {
        v: 2,
        sig,
        simNow: parsed.simNow,
        cases: parsed.cases,
        reports: Array.isArray(parsed.reports) ? parsed.reports : sourceReports,
        recentlyEscalated: [],
      };
    } catch {
      return freshState();
    }
  }

  let state = readState(storage);
  let timerId = null;
  let timerGeneration = 0;
  const listeners = new Set();

  function persist(current) {
    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 2,
          sig: current.sig,
          simNow: current.simNow,
          cases: current.cases,
          reports: current.reports,
        }),
      );
    } catch {
      /* falha de gravação é ignorada */
    }
  }

  function emit() {
    for (const listener of [...listeners]) listener();
  }

  function cancelTimer() {
    timerGeneration += 1;
    if (timerId != null) {
      timers.clearTimeout(timerId);
      timerId = null;
    }
  }

  function commit(next) {
    state = next;
    persist(state);
    emit();
  }

  function runEngine(invoke) {
    try {
      return invoke();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw error;
    }
  }

  return {
    getState() {
      return state;
    },
    hydrateRemote({ cases: remoteCases, reports: remoteReports, simNow }) {
      cancelTimer();
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        /* Clinical data stays in the API, not in browser storage. */
      }
      state = {
        ...state,
        simNow,
        cases: remoteCases,
        reports: remoteReports,
        recentlyEscalated: [],
      };
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    advance(hours) {
      const result = runEngine(() => advanceClock(state, hours));
      cancelTimer();
      const generation = timerGeneration;
      commit({
        v: 2,
        sig,
        simNow: result.state.simNow,
        cases: result.state.cases,
        reports: state.reports,
        recentlyEscalated: result.escalatedIds.slice(),
      });
      timerId = timers.setTimeout(() => {
        if (generation !== timerGeneration) return;
        timerId = null;
        state = {
          v: state.v,
          sig: state.sig,
          simNow: state.simNow,
          cases: state.cases,
          reports: state.reports,
          recentlyEscalated: [],
        };
        emit();
      }, 1200);
    },
    acknowledge(id, by) {
      const next = runEngine(() => acknowledgeCase(state, id, by));
      commit({
        v: 2,
        sig,
        simNow: next.simNow,
        cases: next.cases,
        reports: state.reports,
        recentlyEscalated: state.recentlyEscalated,
      });
    },
    registerAction(id, action, close) {
      const next = runEngine(() =>
        registerCaseAction(state, id, action, close),
      );
      commit({
        v: 2,
        sig,
        simNow: next.simNow,
        cases: next.cases,
        reports: state.reports,
        recentlyEscalated: state.recentlyEscalated,
      });
    },
    replace(next) {
      cancelTimer();
      const reports = Array.isArray(next?.reports) ? next.reports : [];
      const cases = Array.isArray(next?.cases) ? next.cases : [];
      const nextSig = dataSignature(reports, cases);
      state = {
        v: 2,
        sig: nextSig,
        simNow: Number(next?.simNow) || 0,
        cases,
        reports,
        recentlyEscalated: [],
      };
      persist(state);
      emit();
    },
    reset() {
      cancelTimer();
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        /* falha de gravação é ignorada */
      }
      const loaded = runEngine(() => loadCases(sourceReports, sourceCache));
      state = {
        v: 2,
        sig,
        simNow: loaded.simNow,
        cases: loaded.cases,
        reports: sourceReports,
        recentlyEscalated: [],
      };
      emit();
    },
  };
}

export const store = createStore({ storage: browserStorage() });
