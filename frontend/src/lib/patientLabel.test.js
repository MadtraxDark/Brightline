import assert from "node:assert/strict";
import test from "node:test";
import { patientLabel, patientLine } from "./patientLabel.js";

test("patientLabel e patientLine completos", () => {
  const report = {
    patient: { name: "M. S. Andrade", age: 54, sex: "F", record: "PR-00123" },
  };
  assert.equal(patientLabel(report), "M. S. Andrade · 54a");
  assert.equal(patientLine(report), "M. S. Andrade, 54 anos, F · PR-00123");
});

test("patientLabel sem idade usa só o nome", () => {
  const report = {
    patient: { name: "M. S. Andrade", sex: "F", record: "PR-00123" },
  };
  assert.equal(patientLabel(report), "M. S. Andrade");
  assert.equal(patientLine(report), "M. S. Andrade, F · PR-00123");
});

test("sem patient devolve null", () => {
  assert.equal(patientLabel({}), null);
  assert.equal(patientLine(null), null);
});

test("patient inválido não lança erro", () => {
  for (const report of [
    undefined,
    { patient: "texto" },
    { patient: { name: 12, age: "54" } },
    { patient: { age: 200 } },
  ]) {
    assert.equal(patientLabel(report), null);
    assert.equal(patientLine(report), null);
  }
});
