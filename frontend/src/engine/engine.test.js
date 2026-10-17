import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  acknowledge,
  advance,
  currentTarget,
  getMissed,
  getStats,
  loadCases,
  registerAction,
} from "./engine.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../data");

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

const reports = readJson("reports.json");
const cache = readJson("extractions_cache.json");

function fresh() {
  return loadCases(reports, cache);
}

function byId(state, id) {
  return state.cases.find((item) => item.id === id);
}

function criticalCase(state) {
  return state.cases.find((item) => item.urgency === "critical");
}

function actionableCase(state) {
  return state.cases.find((item) => item.urgency === "actionable");
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

test("loadCases gera 6 casos notificados no nível 0 e ignora laudo normal e negação", () => {
  const state = fresh();
  assert.equal(state.cases.length, 6);
  for (const item of state.cases) {
    assert.equal(item.status, "notified");
    assert.equal(item.escalation_level, 0);
    assert.deepEqual(item.events, [
      { at: 0, label: `Notificação enviada a ${item.ordering_physician}` },
    ]);
  }

  const silent = reports.filter(
    (report) => (cache[report.report_id]?.findings ?? []).length === 0,
  );
  assert.equal(silent.length, 2);
  const silentText = silent.map((report) => report.text).join("\n");
  assert.match(silentText, /sem alterações/);
  assert.match(silentText, /sem sinais de hemorragia/);
  for (const report of silent) {
    assert.equal(
      state.cases.some((item) => item.report_id === report.report_id),
      false,
    );
  }
});

test("caso crítico não escala em 0,5h e escala ao completar 1h", () => {
  const item = criticalCase(fresh());
  const first = advance(fresh(), 0.5);
  const untouched = byId(first.state, item.id);
  assert.equal(first.escalatedIds.includes(item.id), false);
  assert.equal(untouched.escalation_level, 0);
  assert.equal(untouched.status, "notified");

  const second = advance(first.state, 0.5);
  const escalated = byId(second.state, item.id);
  assert.equal(escalated.escalation_level, 1);
  assert.equal(escalated.status, "escalated");
  assert.equal(currentTarget(escalated), escalated.radiologist);
  assert.equal(escalated.deadline_at, second.state.simNow + 1);
  assert.ok(second.escalatedIds.includes(item.id));
});

test("caso crítico chega à coordenação e o prazo estourado é registrado uma vez", () => {
  let state = fresh();
  const id = criticalCase(state).id;
  state = advance(state, 0.5).state;
  state = advance(state, 0.5).state;

  const toCoordination = advance(state, 1);
  const atLevelTwo = byId(toCoordination.state, id);
  assert.equal(atLevelTwo.escalation_level, 2);
  assert.equal(atLevelTwo.status, "escalated");
  assert.equal(currentTarget(atLevelTwo), "Coordenação de Radiologia");

  const once = advance(toCoordination.state, 1);
  const twice = advance(once.state, 1);
  const finalCase = byId(twice.state, id);
  assert.equal(finalCase.escalation_level, 2);
  const bursts = finalCase.events.filter(
    (event) => event.label === "Prazo estourado na coordenação",
  );
  assert.equal(bursts.length, 1);
});

test("advance de 24h em caso crítico sobe apenas um nível", () => {
  const state = fresh();
  const id = criticalCase(state).id;
  const next = advance(state, 24);
  const item = byId(next.state, id);
  assert.equal(item.escalation_level, 1);
  assert.equal(item.status, "escalated");
  assert.equal(next.escalatedIds.filter((caseId) => caseId === id).length, 1);
});

test("caso acionável não escala com advance de 24h", () => {
  const state = fresh();
  const id = actionableCase(state).id;
  const next = advance(state, 24);
  const item = byId(next.state, id);
  assert.equal(item.escalation_level, 0);
  assert.equal(item.status, "notified");
  assert.equal(next.escalatedIds.includes(id), false);
});

test("acknowledge em caso escalado muda para lido e impede nova escalação", () => {
  let state = advance(fresh(), 1).state;
  const id = state.cases.find((item) => item.status === "escalated").id;
  state = acknowledge(state, id, "Dra. Ana Luz");
  assert.equal(byId(state, id).status, "read");

  const next = advance(state, 48);
  assert.equal(byId(next.state, id).status, "read");
  assert.equal(byId(next.state, id).escalation_level, 1);
  assert.equal(next.escalatedIds.includes(id), false);
});

test("registerAction exige leitura e fecha o caso quando close é verdadeiro", () => {
  const state = fresh();
  const id = state.cases[0].id;
  assert.throws(() => registerAction(state, id, "Encaminhar ao plantão", false), Error);

  const read = acknowledge(state, id, "Dr. Paulo Mendes");
  const recorded = registerAction(read, id, "Encaminhar ao plantão", false);
  assert.equal(byId(recorded, id).status, "action_taken");
  assert.equal(
    byId(recorded, id).events.at(-1).label,
    "Ação registrada: Encaminhar ao plantão",
  );

  const closed = registerAction(read, id, "Encaminhar ao plantão", true);
  assert.equal(byId(closed, id).status, "closed");
});

test("acknowledge em caso fechado lança erro de caso fechado", () => {
  const state = fresh();
  const id = state.cases[0].id;
  const read = acknowledge(state, id, "Dr. Paulo Mendes");
  const closed = registerAction(read, id, "Alta da fila", true);
  assert.throws(
    () => acknowledge(closed, id, "Dr. Paulo Mendes"),
    (error) => error instanceof Error && error.message === "O caso já está fechado.",
  );
});

test("getMissed devolve só críticos e urgentes não sinalizados", () => {
  const missed = getMissed(fresh());
  const expected = [];
  for (const report of reports) {
    if (report.flagged_by_radiologist !== false) continue;
    for (const finding of cache[report.report_id]?.findings ?? []) {
      if (finding.urgency === "critical" || finding.urgency === "urgent") {
        expected.push(report.report_id);
      }
    }
  }
  assert.equal(missed.length, expected.length);
  assert.ok(expected.length > 0);
  for (const item of missed) {
    assert.ok(item.urgency === "critical" || item.urgency === "urgent");
    assert.equal(item.flagged_by_radiologist, false);
    assert.ok(expected.includes(item.report_id));
  }
});

test("getStats calcula tempo médio até leitura de 2h após advance(2)", () => {
  let state = advance(fresh(), 2).state;
  const id = state.cases[0].id;
  state = acknowledge(state, id, "Dra. Marina Lopes");
  const stats = getStats(state);
  assert.equal(stats.avg_time_to_read_hours, 2);
});

test("advance, acknowledge e registerAction não mutam o estado recebido", () => {
  const base = fresh();
  const baseSnapshot = structuredClone(base);
  deepFreeze(base);
  advance(base, 1);
  assert.deepEqual(base, baseSnapshot);

  const toRead = fresh();
  const readSnapshot = structuredClone(toRead);
  deepFreeze(toRead);
  acknowledge(toRead, toRead.cases[0].id, "Dra. Ana Luz");
  assert.deepEqual(toRead, readSnapshot);

  let readState = fresh();
  readState = acknowledge(readState, readState.cases[0].id, "Dra. Ana Luz");
  const actionSnapshot = structuredClone(readState);
  deepFreeze(readState);
  registerAction(readState, readState.cases[0].id, "Observação clínica", false);
  assert.deepEqual(readState, actionSnapshot);
});

test("toda evidência do cache é substring do laudo", () => {
  for (const report of reports) {
    for (const finding of cache[report.report_id]?.findings ?? []) {
      assert.equal(
        report.text.includes(finding.evidence),
        true,
        `${report.report_id}: ${finding.evidence}`,
      );
    }
  }
});
