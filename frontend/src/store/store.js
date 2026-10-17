import cache from "../data/extractions_cache.json" with { type: "json" };
import reports from "../data/reports.json" with { type: "json" };
import {
  acknowledge as acknowledgeCase,
  advance as advanceClock,
  loadCases,
  registerAction as registerCaseAction,
} from "../engine/engine.js";

export const STORAGE_KEY = "brightline:v1";

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

function freshState() {
  const loaded = loadCases(reports, cache);
  return {
    v: 1,
    simNow: loaded.simNow,
    cases: loaded.cases,
    reports,
    recentlyEscalated: [],
  };
}

function readState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return freshState();
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.v !== 1 ||
      !Array.isArray(parsed.cases) ||
      typeof parsed.simNow !== "number"
    ) {
      return freshState();
    }
    return {
      v: 1,
      simNow: parsed.simNow,
      cases: parsed.cases,
      reports: Array.isArray(parsed.reports) ? parsed.reports : reports,
      recentlyEscalated: [],
    };
  } catch {
    return freshState();
  }
}

export function createStore({ storage, timers = defaultTimers }) {
  let state = readState(storage);
  let timerId = null;
  let timerGeneration = 0;
  const listeners = new Set();

  function persist(current) {
    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: current.v,
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
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    advance(hours) {
      const result = runEngine(() => advanceClock(state, hours));
      cancelTimer();
      const generation = timerGeneration;
      commit({
        v: 1,
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
        v: 1,
        simNow: next.simNow,
        cases: next.cases,
        reports: state.reports,
        recentlyEscalated: state.recentlyEscalated,
      });
    },
    registerAction(id, action, close) {
      const next = runEngine(() => registerCaseAction(state, id, action, close));
      commit({
        v: 1,
        simNow: next.simNow,
        cases: next.cases,
        reports: state.reports,
        recentlyEscalated: state.recentlyEscalated,
      });
    },
    reset() {
      cancelTimer();
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        /* falha de gravação é ignorada */
      }
      const loaded = runEngine(() => loadCases(reports, cache));
      state = {
        v: 1,
        simNow: loaded.simNow,
        cases: loaded.cases,
        reports,
        recentlyEscalated: [],
      };
      emit();
    },
  };
}

export const store = createStore({ storage: browserStorage() });
