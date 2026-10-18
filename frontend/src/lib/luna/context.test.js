import assert from "node:assert/strict";
import test from "node:test";
import reports from "../../fixtures/reports.json" with { type: "json" };
import cache from "../../fixtures/extractions_cache.json" with { type: "json" };
import contacts from "../../data/contacts.json" with { type: "json" };
import { loadCases } from "../../engine/engine.js";
import { selectLanes, selectNextDeadline } from "../../store/selectors.js";
import { buildLunaContext } from "./context.js";

const state = { ...loadCases(reports, cache), reports };

test("o caso só leva os campos da lista e omite nome, prontuário e ramal", () => {
  const context = buildLunaContext(state, { caseId: "R-001-1" });
  const encoded = JSON.stringify(context);
  assert.equal(context.tipo, "caso");
  assert.deepEqual(Object.keys(context).sort(), [
    "caso",
    "laudo",
    "paciente",
    "tipo",
  ]);
  assert.deepEqual(Object.keys(context.caso).sort(), [
    "achado",
    "confianca_da_ia",
    "evidencia",
    "nao_sinalizado",
    "nivel_de_escalonamento",
    "regra_do_prazo",
    "responsavel_atual",
    "status",
    "tempo_restante",
    "urgencia",
  ]);
  assert.deepEqual(Object.keys(context.paciente).sort(), ["idade", "sexo"]);
  assert.equal(context.paciente.idade, 54);
  assert.equal(context.paciente.sexo, "F");
  for (const report of reports) {
    assert.equal(encoded.includes(report.patient.name), false);
    assert.equal(encoded.includes(report.patient.record), false);
  }
  for (const contact of Object.values(contacts)) {
    assert.equal(encoded.includes(contact.ramal), false);
  }
});

test("corta o texto do laudo e remove caracteres de controle", () => {
  const reportsCopy = structuredClone(reports);
  reportsCopy[0].text = `A\u0001B${"x".repeat(4000)}`;
  const local = { ...loadCases(reportsCopy, cache), reports: reportsCopy };
  const context = buildLunaContext(local, { caseId: "R-001-1" });
  assert.equal(context.laudo.texto.length, 3000);
  assert.equal(context.laudo.texto.includes("\u0001"), false);
  assert.ok(context.laudo.texto.startsWith("ABx"));
});

test("a fila usa os números dos selectors", () => {
  const context = buildLunaContext(state, {});
  const lanes = selectLanes(state);
  const next = selectNextDeadline(state);
  assert.equal(context.tipo, "fila");
  assert.equal(context.resumo.criticos_abertos, lanes.critical.open);
  assert.equal(context.resumo.urgentes_abertos, lanes.urgent.open);
  assert.equal(context.resumo.acionaveis_abertos, lanes.actionable.open);
  assert.equal(context.resumo.sem_alerta, lanes.noAlert.count);
  assert.equal(
    context.resumo.atrasados,
    lanes.critical.overdue + lanes.urgent.overdue + lanes.actionable.overdue,
  );
  assert.equal(
    context.resumo.resolvidos,
    lanes.critical.resolved + lanes.urgent.resolved + lanes.actionable.resolved,
  );
  assert.deepEqual(context.proximo_prazo, {
    achado: next.finding,
    tempo_restante: next.time_remaining_hours,
  });
});

test("caso inexistente devolve null", () => {
  assert.equal(buildLunaContext(state, { caseId: "nao-existe" }), null);
});

test("reading remoto entra e reading local fica de fora", () => {
  const reportsCopy = structuredClone(reports);
  reportsCopy[0].reading = {
    remote: true,
    performed_at: "2026-01-01T10:00:00Z",
    reported_at: "2026-01-01T12:00:00Z",
  };
  reportsCopy[1].reading = {
    remote: false,
    performed_at: "local-realizado",
    reported_at: "local-laudado",
  };
  const local = { ...loadCases(reportsCopy, cache), reports: reportsCopy };
  const remote = buildLunaContext(local, { caseId: "R-001-1" });
  assert.equal(remote.a_distancia, true);
  assert.equal(remote.realizado_em, "2026-01-01T10:00:00Z");
  assert.equal(remote.laudado_em, "2026-01-01T12:00:00Z");
  const onSite = buildLunaContext(local, { caseId: "R-002-1" });
  assert.equal("a_distancia" in onSite, false);
  assert.equal(JSON.stringify(onSite).includes("local-realizado"), false);
  assert.equal(JSON.stringify(onSite).includes("local-laudado"), false);
});
