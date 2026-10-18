import assert from "node:assert/strict";
import test from "node:test";
import cache from "../fixtures/extractions_cache.json" with { type: "json" };
import reports from "../fixtures/reports.json" with { type: "json" };
import { acknowledge, advance, loadCases, registerAction } from "../engine/engine.js";
import { buildSidebarItems } from "./sidebarItems.js";

function exampleState() {
  return { ...loadCases(reports, cache), reports };
}

function item(menu, sectionId, itemId) {
  return menu.sections.find((section) => section.id === sectionId).items.find((entry) => entry.id === itemId);
}

test("buildSidebarItems descreve seções, contagens e destinos", () => {
  const initial = buildSidebarItems(exampleState());
  assert.deepEqual(initial.sections.map((section) => section.label), ["Gestão de laudos", "Por prioridade", "Qualidade da IA"]);
  assert.equal(item(initial, "reports", "overview").count, 6);
  assert.equal(item(initial, "reports", "overview").to, "/home");
  assert.equal(item(initial, "reports", "missed").count, 3);
  assert.equal(item(initial, "reports", "missed").to, "/nao-sinalizados");
  assert.equal(item(initial, "priority", "critical").count, 2);
  assert.equal(item(initial, "priority", "critical").to, "/home?prioridade=critical");
  assert.equal(item(initial, "priority", "urgent").count, 2);
  assert.equal(item(initial, "priority", "urgent").to, "/home?prioridade=urgent");
  assert.equal(item(initial, "priority", "actionable").count, 2);
  assert.equal(item(initial, "priority", "actionable").to, "/home?prioridade=actionable");
  assert.equal(item(initial, "priority", "noAlert").count, 2);
  assert.equal(item(initial, "priority", "noAlert").to, "/home?prioridade=sem-alerta");
  assert.equal(item(initial, "quality", "evaluation").to, "/avaliacao");
  assert.equal(initial.next.id, "R-001-1");
  assert.equal(initial.next.escalation, null);

  const moved = buildSidebarItems(advance(exampleState(), 1).state);
  assert.equal(moved.next.escalation, "Escalado · nível 1");

  let state = exampleState();
  const critical = state.cases.find((entry) => entry.urgency === "critical");
  state = acknowledge(state, critical.id, "Dra. Ana Luz");
  state = registerAction(state, critical.id, "Contato com o solicitante", true);
  const closed = buildSidebarItems(state);
  assert.equal(item(closed, "reports", "overview").count, 5);
  assert.equal(item(closed, "priority", "critical").count, 1);
  assert.equal(item(closed, "priority", "noAlert").count, 2);
  assert.equal(closed.next.id, state.cases.filter((entry) => entry.urgency === "critical")[1].id);

  const empty = buildSidebarItems({});
  assert.equal(item(empty, "reports", "overview").count, 0);
  assert.equal(item(empty, "reports", "missed").count, 0);
  assert.equal(item(empty, "priority", "noAlert").count, 0);
  assert.equal(empty.next, null);
});
