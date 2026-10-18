import assert from "node:assert/strict";
import test from "node:test";
import { communicationRule, groupByUrgency } from "./groupByUrgency.js";

function item(id, urgency) {
  return { id, urgency };
}

test("groupByUrgency segue a ordem clínica e omite grupos vazios", () => {
  const grouped = groupByUrgency([
    item("c2", "critical"),
    item("c1", "critical"),
    item("a1", "actionable"),
    item("u1", "urgent"),
    item("x", "detected"),
  ]);
  assert.deepEqual(
    grouped.map((group) => group.urgency),
    ["critical", "urgent", "actionable"],
  );
  assert.deepEqual(grouped[0].items.map((entry) => entry.id), ["c2", "c1"]);
  assert.deepEqual(grouped[1].items.map((entry) => entry.id), ["u1"]);
  assert.equal(grouped.some((group) => group.items.length === 0), false);
});

test("groupByUrgency devolve lista vazia quando não há casos", () => {
  assert.deepEqual(groupByUrgency([]), []);
});

test("communicationRule usa o prazo do achado", () => {
  assert.equal(communicationRule(1), "Comunicar em até 1 hora");
  assert.equal(communicationRule(24), "Comunicar em até 24 horas");
  assert.equal(communicationRule(720), "Comunicar em até 30 dias");
  assert.equal(communicationRule(48), null);
});
