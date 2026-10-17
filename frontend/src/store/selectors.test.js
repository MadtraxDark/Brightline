import assert from "node:assert/strict";
import test from "node:test";
import { acknowledge } from "../engine/engine.js";
import {
  selectCase,
  selectCases,
  selectMissed,
  selectStats,
} from "./selectors.js";

function caso(overrides) {
  return {
    id: overrides.id,
    report_id: overrides.report_id ?? "R-001",
    finding: overrides.finding ?? "Achado",
    evidence: "trecho",
    urgency: overrides.urgency ?? "urgent",
    confidence: "high",
    deadline_hours: 1,
    deadline_at: overrides.deadline_at ?? 1,
    escalation_level: overrides.escalation_level ?? 0,
    status: overrides.status ?? "notified",
    modality: "TC",
    radiologist: "Dra. Ana Luz",
    ordering_physician: overrides.ordering_physician ?? "Dr. Paulo Mendes",
    text: "texto",
    flagged_by_radiologist: overrides.flagged_by_radiologist ?? true,
    notified_at: 0,
    acknowledged_at: overrides.acknowledged_at ?? null,
    coordination_overdue_logged: false,
    events: [{ at: 0, label: "Notificação enviada a Dr. Paulo Mendes" }],
  };
}

function estado(cases, simNow = 0) {
  return { v: 1, simNow, cases, reports: [], recentlyEscalated: [] };
}

test("selectCases ordena por urgência e, dentro dela, pelo menor tempo restante", () => {
  const state = estado(
    [
      caso({ id: "a-tarde", urgency: "actionable", deadline_at: 100 }),
      caso({ id: "u-cedo", urgency: "urgent", deadline_at: 8 }),
      caso({ id: "c-positivo", urgency: "critical", deadline_at: 12 }),
      caso({ id: "a-cedo", urgency: "actionable", deadline_at: 9 }),
      caso({ id: "c-negativo", urgency: "critical", deadline_at: 5 }),
      caso({ id: "u-positivo", urgency: "urgent", deadline_at: 20 }),
    ],
    10,
  );
  assert.deepEqual(
    selectCases(state).map((item) => item.id),
    ["c-negativo", "c-positivo", "u-cedo", "u-positivo", "a-cedo", "a-tarde"],
  );
  const times = selectCases(state).map((item) => item.time_remaining_hours);
  assert.deepEqual(times, [-5, 2, -2, 10, -1, 90]);
});

test("a busca ignora maiúsculas e acentos", () => {
  const state = estado([
    caso({
      id: "h",
      finding: "Hemorragia subaracnóidea aguda",
      urgency: "critical",
    }),
    caso({
      id: "n",
      finding: "Nódulo pulmonar suspeito",
      urgency: "actionable",
    }),
  ]);
  assert.deepEqual(
    selectCases(state, { query: "hemorragia" }).map((item) => item.id),
    ["h"],
  );
  assert.deepEqual(
    selectCases(state, { query: "subaracnoidea" }).map((item) => item.id),
    ["h"],
  );
});

test("urgência, status e busca juntos devolvem só a interseção", () => {
  const state = estado([
    caso({
      id: "ok",
      finding: "Hemorragia subaracnóidea",
      urgency: "critical",
      status: "notified",
    }),
    caso({
      id: "outra-busca",
      finding: "Pneumotórax",
      urgency: "critical",
      status: "notified",
    }),
    caso({
      id: "outro-status",
      finding: "Hemorragia antiga",
      urgency: "critical",
      status: "escalated",
    }),
    caso({
      id: "outra-urgencia",
      finding: "Hemorragia leve",
      urgency: "urgent",
      status: "notified",
    }),
  ]);
  assert.deepEqual(
    selectCases(state, {
      urgency: "critical",
      status: "notified",
      query: "hemorragia",
    }).map((item) => item.id),
    ["ok"],
  );
});

test("selectMissed devolve só críticos e urgentes não sinalizados", () => {
  const state = estado([
    caso({ id: "c", urgency: "critical", flagged_by_radiologist: false }),
    caso({ id: "u", urgency: "urgent", flagged_by_radiologist: false }),
    caso({ id: "u-flag", urgency: "urgent", flagged_by_radiologist: true }),
    caso({ id: "a", urgency: "actionable", flagged_by_radiologist: false }),
  ]);
  const missed = selectMissed(state);
  assert.deepEqual(
    missed.map((item) => item.id),
    ["c", "u"],
  );
  for (const item of missed) {
    assert.ok(item.urgency === "critical" || item.urgency === "urgent");
    assert.equal(item.flagged_by_radiologist, false);
  }
});

test("onlyUnflagged restringe a críticos e urgentes não sinalizados e aceita busca", () => {
  const state = estado([
    caso({
      id: "c",
      urgency: "critical",
      flagged_by_radiologist: false,
      finding: "Hemorragia",
    }),
    caso({
      id: "fechado",
      urgency: "urgent",
      flagged_by_radiologist: false,
      status: "closed",
      finding: "Apendicite",
    }),
    caso({
      id: "sinalizado",
      urgency: "urgent",
      flagged_by_radiologist: true,
      finding: "Derrame",
    }),
    caso({
      id: "acionavel",
      urgency: "actionable",
      flagged_by_radiologist: false,
      finding: "Nódulo",
    }),
  ]);
  assert.deepEqual(
    selectCases(state, { onlyUnflagged: true }).map((item) => item.id),
    ["c", "fechado"],
  );
  assert.deepEqual(
    selectCases(state, { onlyUnflagged: true, query: "hemorragia" }).map(
      (item) => item.id,
    ),
    ["c"],
  );
});

test("selectStats deixa de ter tempo médio nulo depois do acknowledge", () => {
  let state = estado([caso({ id: "c1", urgency: "critical" })]);
  assert.equal(selectStats(state).avg_time_to_read_hours, null);
  state = acknowledge(state, "c1", "Dra. Ana Luz");
  assert.notEqual(selectStats(state).avg_time_to_read_hours, null);
});

test("selectCases inclui radiologista e solicitante sem perder os campos atuais", () => {
  const state = estado([
    caso({
      id: "c1",
      radiologist: "Dra. Ana Luz",
      ordering_physician: "Dr. Paulo Mendes",
    }),
  ]);
  const [item] = selectCases(state);
  assert.equal(item.radiologist, "Dra. Ana Luz");
  assert.equal(item.ordering_physician, "Dr. Paulo Mendes");
  assert.equal(item.id, "c1");
  assert.equal(item.finding, "Achado");
  assert.equal(item.current_target, "Dr. Paulo Mendes");
});

test("selectCase de id inexistente devolve null", () => {
  const state = estado([caso({ id: "c1" })]);
  assert.doesNotThrow(() => selectCase(state, "nao-existe"));
  assert.equal(selectCase(state, "nao-existe"), null);
});
