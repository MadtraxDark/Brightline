import assert from "node:assert/strict";
import test from "node:test";
import { buildSearch, parseView } from "./viewState.js";

test("parseView e buildSearch preservam a visão da lista", () => {
  assert.deepEqual(parseView(""), { lane: "all", showResolved: false });
  assert.deepEqual(parseView("?prioridade=critical"), { lane: "critical", showResolved: false });
  assert.deepEqual(parseView("prioridade=urgent"), { lane: "urgent", showResolved: false });
  assert.deepEqual(parseView("?prioridade=actionable"), { lane: "actionable", showResolved: false });
  assert.deepEqual(parseView("?prioridade=sem-alerta"), { lane: "noAlert", showResolved: false });
  assert.deepEqual(parseView("?prioridade=normal"), { lane: "all", showResolved: false });
  assert.deepEqual(parseView("?prioridade=critical&resolvidos=1"), { lane: "critical", showResolved: true });
  assert.deepEqual(parseView("?resolvidos=1"), { lane: "all", showResolved: true });
  assert.deepEqual(parseView("?prioridade=verde&resolvidos=1"), { lane: "all", showResolved: false });

  assert.equal(buildSearch({ lane: "all", showResolved: false }), "");
  assert.equal(buildSearch({ lane: "critical", showResolved: false }), "?prioridade=critical");
  assert.equal(buildSearch({ lane: "noAlert", showResolved: true }), "?prioridade=sem-alerta&resolvidos=1");

  for (const view of [
    { lane: "all", showResolved: false },
    { lane: "critical", showResolved: false },
    { lane: "urgent", showResolved: true },
    { lane: "actionable", showResolved: false },
    { lane: "noAlert", showResolved: true },
  ]) {
    assert.deepEqual(parseView(buildSearch(view)), view);
  }
});
