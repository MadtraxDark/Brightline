import assert from "node:assert/strict";
import test from "node:test";
import { splitEvidence } from "./splitEvidence.js";

function joined(text, evidence) {
  const parts = splitEvidence(text, evidence);
  assert.equal(parts.before + parts.match + parts.after, text);
  return parts;
}

test("trecho no meio do texto", () => {
  const parts = joined("Há pneumotórax à direita.", "pneumotórax");
  assert.equal(parts.found, true);
  assert.equal(parts.before, "Há ");
  assert.equal(parts.match, "pneumotórax");
  assert.equal(parts.after, " à direita.");
});

test("trecho no início e no fim", () => {
  const start = joined("pneumotórax à direita.", "pneumotórax");
  assert.equal(start.before, "");
  assert.equal(start.match, "pneumotórax");
  assert.equal(start.after, " à direita.");
  assert.equal(start.found, true);

  const end = joined("Há pneumotórax", "pneumotórax");
  assert.equal(end.before, "Há ");
  assert.equal(end.match, "pneumotórax");
  assert.equal(end.after, "");
  assert.equal(end.found, true);
});

test("trecho repetido destaca só a primeira ocorrência", () => {
  const parts = joined("nódulo e outro nódulo", "nódulo");
  assert.equal(parts.found, true);
  assert.equal(parts.before, "");
  assert.equal(parts.match, "nódulo");
  assert.equal(parts.after, " e outro nódulo");
});

test("trecho inexistente devolve o texto inteiro", () => {
  const text = "Exame sem o achado citado.";
  const parts = joined(text, "hemorragia");
  assert.equal(parts.found, false);
  assert.equal(parts.before, text);
  assert.equal(parts.match, "");
  assert.equal(parts.after, "");
});

test("trecho com caracteres especiais é literal", () => {
  const samples = ["(2,3 cm)", "a.b", "[x]", "$1", "a+b*c"];
  for (const sample of samples) {
    const text = `antes ${sample} depois`;
    const parts = joined(text, sample);
    assert.equal(parts.found, true);
    assert.equal(parts.match, sample);
    assert.equal(parts.before, "antes ");
    assert.equal(parts.after, " depois");
  }
});

test("evidência vazia ou só espaços não destaca", () => {
  const text = "Laudo completo.";
  for (const evidence of ["", " ", "   ", "\n", "\t", null, undefined]) {
    const parts = joined(text, evidence);
    assert.equal(parts.found, false);
    assert.equal(parts.before, text);
    assert.equal(parts.match, "");
    assert.equal(parts.after, "");
  }
});

test("before, match e after recompõem o texto", () => {
  const cases = [
    ["Há pneumotórax à direita.", "pneumotórax"],
    ["pneumotórax à direita.", "pneumotórax"],
    ["Há pneumotórax", "pneumotórax"],
    ["nódulo e outro nódulo", "nódulo"],
    ["Exame sem o achado citado.", "hemorragia"],
    ["antes (2,3 cm) depois", "(2,3 cm)"],
    ["antes a.b depois", "a.b"],
    ["antes [x] depois", "[x]"],
    ["antes $1 depois", "$1"],
    ["antes a+b*c depois", "a+b*c"],
    ["Laudo completo.", ""],
    ["Laudo completo.", "   "],
    ["Hemorragia subaracnóidea aguda.", "subaracnóidea"],
    ["Hemorragia subaracnóidea aguda.", "subaracnoidea"],
  ];
  for (const [text, evidence] of cases) joined(text, evidence);
});

test("acento é literal e não é normalizado", () => {
  const text = "Hemorragia subaracnóidea aguda.";
  const found = joined(text, "subaracnóidea");
  assert.equal(found.found, true);
  assert.equal(found.match, "subaracnóidea");

  const missed = joined(text, "subaracnoidea");
  assert.equal(missed.found, false);
  assert.equal(missed.before, text);
  assert.equal(missed.match, "");
  assert.equal(missed.after, "");
});
