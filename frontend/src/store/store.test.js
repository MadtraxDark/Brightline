import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createStore, STORAGE_KEY } from "./store.js";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function readFixture(name) {
  return JSON.parse(readFileSync(join(fixtureDir, name), "utf8"));
}

const fixtureData = {
  reports: readFixture("reports.json"),
  cache: readFixture("extractions_cache.json"),
};

function memoryStorage(entries) {
  const map = new Map(entries);
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

function fakeTimers() {
  let seq = 0;
  const scheduled = [];
  return {
    scheduled,
    timers: {
      setTimeout(fn, ms) {
        const id = ++seq;
        scheduled.push({ id, fn, ms, cleared: false });
        return id;
      },
      clearTimeout(id) {
        const entry = scheduled.find((item) => item.id === id);
        if (entry) entry.cleared = true;
      },
    },
  };
}

function openStore(storage = memoryStorage()) {
  const clock = fakeTimers();
  return {
    storage,
    clock,
    store: createStore({ storage, timers: clock.timers, data: fixtureData }),
  };
}

test("estado inicial sem nada no storage tem 6 casos", () => {
  const { store } = openStore();
  assert.equal(store.getState().cases.length, 6);
  assert.equal(store.getState().simNow, 0);
});

test("advance persiste simNow e casos para um store novo no mesmo storage", () => {
  const storage = memoryStorage();
  const clock = fakeTimers();
  const first = createStore({
    storage,
    timers: clock.timers,
    data: fixtureData,
  });
  first.advance(1);
  const saved = first.getState();

  const second = createStore({
    storage,
    timers: fakeTimers().timers,
    data: fixtureData,
  });
  assert.equal(second.getState().simNow, saved.simNow);
  assert.deepEqual(second.getState().cases, saved.cases);
});

test("texto inválido ou versão diferente cai no estado inicial sem lançar", () => {
  const invalid = memoryStorage([[STORAGE_KEY, "{não é json"]]);
  const fromText = createStore({
    storage: invalid,
    timers: fakeTimers().timers,
    data: fixtureData,
  });
  assert.equal(fromText.getState().cases.length, 6);
  assert.equal(fromText.getState().simNow, 0);

  const wrongVersion = memoryStorage([
    [STORAGE_KEY, JSON.stringify({ v: 2, simNow: 9, cases: [] })],
  ]);
  const fromVersion = createStore({
    storage: wrongVersion,
    timers: fakeTimers().timers,
    data: fixtureData,
  });
  assert.equal(fromVersion.getState().cases.length, 6);
  assert.equal(fromVersion.getState().simNow, 0);
});

test("sig diferente cai no estado inicial sem lançar", () => {
  const storage = memoryStorage([
    [
      STORAGE_KEY,
      JSON.stringify({ v: 1, sig: "outra", simNow: 9, cases: [], reports: [] }),
    ],
  ]);
  const store = createStore({
    storage,
    timers: fakeTimers().timers,
    data: fixtureData,
  });
  assert.equal(store.getState().cases.length, 6);
  assert.equal(store.getState().simNow, 0);
});

test("acknowledge em caso fechado lança erro e mantém a mesma referência", () => {
  const { store } = openStore();
  const id = store.getState().cases[0].id;
  store.acknowledge(id, "Dra. Ana Luz");
  store.registerAction(id, "Alta da fila", true);
  const closed = store.getState();

  assert.throws(
    () => store.acknowledge(id, "Dra. Ana Luz"),
    (error) =>
      error instanceof Error && error.message === "O caso já está fechado.",
  );
  assert.equal(store.getState(), closed);
});

test("advance destaca ids escalados, o timer limpa a lista e o seguinte cancela o anterior", () => {
  const { store, clock } = openStore();
  const before = new Set(
    store
      .getState()
      .cases.filter((item) => item.status === "escalated")
      .map((item) => item.id),
  );
  store.advance(1);
  const escalatedNow = store
    .getState()
    .cases.filter((item) => item.status === "escalated")
    .map((item) => item.id);
  const newly = escalatedNow.filter((id) => !before.has(id));
  assert.deepEqual(store.getState().recentlyEscalated, newly);
  assert.ok(newly.length > 0);
  assert.equal(clock.scheduled[0].ms, 1200);
  clock.scheduled[0].fn();
  assert.deepEqual(store.getState().recentlyEscalated, []);

  const next = openStore();
  next.store.advance(1);
  const previous = next.clock.scheduled[0];
  next.store.advance(1);
  const highlighted = next.store.getState().recentlyEscalated.slice();
  assert.equal(previous.cleared, true);
  assert.ok(highlighted.length > 0);
  previous.fn();
  assert.deepEqual(next.store.getState().recentlyEscalated, highlighted);
});

test("reset volta a 6 casos notificados no nível 0 e apaga a chave", () => {
  const { store, storage } = openStore();
  store.advance(5);
  assert.notEqual(storage.getItem(STORAGE_KEY), null);

  store.reset();
  const state = store.getState();
  assert.equal(state.simNow, 0);
  assert.equal(state.cases.length, 6);
  assert.deepEqual(state.recentlyEscalated, []);
  for (const item of state.cases) {
    assert.equal(item.status, "notified");
    assert.equal(item.escalation_level, 0);
  }
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("getState devolve outro objeto depois de uma mudança bem-sucedida", () => {
  const { store } = openStore();
  const initial = store.getState();
  store.advance(1);
  const advanced = store.getState();
  assert.notEqual(advanced, initial);

  const id = advanced.cases.find((item) => item.status === "notified").id;
  store.acknowledge(id, "Dr. Paulo Mendes");
  const read = store.getState();
  assert.notEqual(read, advanced);

  store.registerAction(id, "Encaminhar ao plantão", false);
  const acted = store.getState();
  assert.notEqual(acted, read);

  store.reset();
  assert.notEqual(store.getState(), acted);
});
