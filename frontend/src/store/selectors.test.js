import assert from "node:assert/strict";
import test from "node:test";
import cache from "../fixtures/extractions_cache.json" with { type: "json" };
import reports from "../fixtures/reports.json" with { type: "json" };
import {
  acknowledge,
  advance,
  loadCases,
  registerAction,
} from "../engine/engine.js";
import {
  selectCase,
  selectCases,
  selectLanes,
  selectMissed,
  selectNextDeadline,
  selectReportsWithoutAlert,
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
  assert.equal(item.modality, "TC");
  assert.equal(item.id, "c1");
  assert.equal(item.finding, "Achado");
  assert.equal(item.current_target, "Dr. Paulo Mendes");
  assert.equal(item.patient, null);
  assert.equal(item.contact.ramal, "4101");
});

test("selectCases e selectCase acrescentam paciente, local e ramal", () => {
  const report = {
    report_id: "R-001",
    patient: { name: "M. S. Andrade", age: 54, sex: "F", record: "PR-10441" },
    location: "Pronto-socorro",
    indication: "Dor torácica súbita",
  };
  const state = {
    ...estado([caso({ id: "c1" })]),
    reports: [report],
  };
  const [item] = selectCases(state);
  assert.equal(item.patient.name, "M. S. Andrade");
  assert.equal(item.location, "Pronto-socorro");
  assert.equal(item.indication, "Dor torácica súbita");
  assert.deepEqual(item.contact, { ramal: "4101" });
  const detail = selectCase(state, "c1");
  assert.equal(detail.case.patient.record, "PR-10441");
  assert.equal(detail.report.location, "Pronto-socorro");
});

test("selectStats acrescenta sem leitura e críticos em aberto", () => {
  let state = loadCases(reports, cache);
  const initial = selectStats(state);
  assert.equal(state.cases.length, 6);
  assert.equal(initial.awaitingRead, 6);
  assert.equal(initial.openCritical, 2);
  assert.equal(initial.avg_time_to_read_hours, null);
  assert.equal(initial.status.notified, 6);
  const critical = state.cases.find((item) => item.urgency === "critical");
  state = acknowledge(state, critical.id, "Dra. Ana Luz");
  assert.equal(selectStats(state).awaitingRead, 5);
  state = registerAction(state, critical.id, "Contato com o solicitante", true);
  assert.equal(selectStats(state).openCritical, 1);
});

function exampleState() {
  return { ...loadCases(reports, cache), reports };
}

function tick(state, hours) {
  const result = advance(state, hours);
  return { ...state, ...result.state, reports: state.reports };
}

test("selectLanes no exemplo conta abertos, resolvidos e laudos sem alerta", () => {
  let state = exampleState();
  const initial = selectLanes(state);
  assert.equal(initial.critical.open, 2);
  assert.equal(initial.urgent.open, 2);
  assert.equal(initial.actionable.open, 2);
  for (const lane of ["critical", "urgent", "actionable"]) {
    assert.equal(initial[lane].overdue, 0);
    assert.equal(initial[lane].resolved, 0);
  }
  assert.equal(initial.noAlert.count, 2);

  const critical = state.cases.find((item) => item.urgency === "critical");
  state = acknowledge(state, critical.id, "Dra. Ana Luz");
  state = registerAction(state, critical.id, "Contato com o solicitante", true);
  const closed = selectLanes(state);
  assert.equal(closed.critical.open, 1);
  assert.equal(closed.critical.resolved, 1);
  assert.equal(closed.noAlert.count, 2);

  state = exampleState();
  state = tick(state, 1);
  state = tick(state, 1);
  state = tick(state, 1);
  state = tick(state, 5);
  const late = selectLanes(state);
  assert.equal(late.critical.overdue, 2);
  assert.equal(late.urgent.overdue, 0);
});

test("selectNextDeadline segue o menor prazo e some quando não há leitura pendente", () => {
  let state = exampleState();
  const first = state.cases.find((item) => item.urgency === "critical");
  assert.equal(selectNextDeadline(state).id, first.id);
  state = acknowledge(state, first.id, "Dra. Ana Luz");
  const second = state.cases.filter((item) => item.urgency === "critical")[1];
  assert.equal(selectNextDeadline(state).id, second.id);
  for (const item of [...state.cases]) {
    if (item.status === "notified" || item.status === "escalated") {
      state = acknowledge(state, item.id, "Dra. Ana Luz");
    }
  }
  assert.equal(selectNextDeadline(state), null);
});

test("selectors novos aceitam estado sem reports", () => {
  const empty = {};
  assert.deepEqual(selectLanes(empty), {
    critical: { open: 0, overdue: 0, resolved: 0 },
    urgent: { open: 0, overdue: 0, resolved: 0 },
    actionable: { open: 0, overdue: 0, resolved: 0 },
    noAlert: { count: 0 },
  });
  assert.deepEqual(selectReportsWithoutAlert(empty), []);
  assert.equal(selectNextDeadline(empty), null);
  assert.deepEqual(
    selectReportsWithoutAlert(exampleState()).map((item) => item.id),
    ["R-007", "R-008"],
  );
});

test("selectCase de id inexistente devolve null", () => {
  const state = estado([caso({ id: "c1" })]);
  assert.doesNotThrow(() => selectCase(state, "nao-existe"));
  assert.equal(selectCase(state, "nao-existe"), null);
});
