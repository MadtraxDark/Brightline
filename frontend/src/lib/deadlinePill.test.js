import assert from "node:assert/strict";
import test from "node:test";
import { formatRemaining } from "./formatRemaining.js";
import { deadlinePill } from "./deadlinePill.js";

function item(urgency, hours) {
  return { urgency, time_remaining_hours: hours };
}

test("deadlinePill distingue prazo, atraso e urgência", () => {
  const critical = deadlinePill(item("critical", 1));
  assert.deepEqual(critical, { kind: "critical", text: formatRemaining(1) });

  const criticalLate = deadlinePill(item("critical", -2));
  assert.deepEqual(criticalLate, { kind: "overdue", text: formatRemaining(-2) });
  assert.equal(criticalLate.text, "Atrasado há 2h");

  assert.equal(deadlinePill(item("urgent", 5)).kind, "plain");
  assert.equal(deadlinePill(item("urgent", 5)).text, formatRemaining(5));

  const urgentLate = deadlinePill(item("urgent", -1));
  assert.equal(urgentLate.kind, "overdue");
  assert.equal(urgentLate.text, formatRemaining(-1));

  const actionable = deadlinePill(item("actionable", 48));
  assert.deepEqual(actionable, { kind: "plain", text: formatRemaining(48) });

  const exact = deadlinePill(item("critical", 0));
  assert.equal(exact.kind, "critical");
  assert.equal(exact.text, formatRemaining(0));
  assert.equal(deadlinePill(item("urgent", 0)).kind, "plain");
});
