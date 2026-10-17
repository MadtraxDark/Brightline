import assert from "node:assert/strict";
import test from "node:test";
import { computeEvaluation } from "./evaluate.js";

function report(id, groundTruth) {
  return { report_id: id, ground_truth: groundTruth };
}

function extracted(id, findings) {
  return { [id]: { report_id: id, findings } };
}

function checkLengths(result) {
  assert.equal(result.overall.fn, result.false_negatives.length);
  assert.equal(result.overall.fp, result.false_positives.length);
}

test("cache igual ao gabarito conta só acertos", () => {
  const result = computeEvaluation(
    [
      report("R-001", [
        { finding: "Pneumotórax hipertensivo", urgency: "critical" },
      ]),
    ],
    extracted("R-001", [
      { finding: "Pneumotórax hipertensivo", urgency: "critical" },
    ]),
  );
  assert.equal(result.overall.tp, 1);
  assert.equal(result.overall.fp, 0);
  assert.equal(result.overall.fn, 0);
  assert.equal(result.overall.wrong_urgency, 0);
  assert.deepEqual(result.false_negatives, []);
  assert.deepEqual(result.false_positives, []);
  assert.equal(result.critical.tp, 1);
  checkLengths(result);
});

test("achado do gabarito ausente no cache é falso negativo", () => {
  const result = computeEvaluation(
    [
      report("R-002", [
        { finding: "Hemorragia subaracnóidea aguda", urgency: "critical" },
      ]),
    ],
    extracted("R-002", []),
  );
  assert.equal(result.overall.fn, 1);
  assert.equal(result.overall.fp, 0);
  assert.deepEqual(result.false_negatives, [
    {
      report_id: "R-002",
      finding: "Hemorragia subaracnóidea aguda",
      urgency: "critical",
    },
  ]);
  checkLengths(result);
});

test("achado extra sem par é falso positivo", () => {
  const result = computeEvaluation(
    [report("R-008", [])],
    extracted("R-008", [
      { finding: "Hemorragia subaracnóidea", urgency: "urgent" },
    ]),
  );
  assert.equal(result.overall.fp, 1);
  assert.equal(result.overall.fn, 0);
  assert.deepEqual(result.false_positives, [
    {
      report_id: "R-008",
      finding: "Hemorragia subaracnóidea",
      urgency: "urgent",
    },
  ]);
  checkLengths(result);
});

test("urgência trocada entra nas duas listas", () => {
  const result = computeEvaluation(
    [
      report("R-001", [
        { finding: "Pneumotórax hipertensivo", urgency: "critical" },
      ]),
    ],
    extracted("R-001", [
      { finding: "Pneumotórax hipertensivo", urgency: "urgent" },
    ]),
  );
  assert.equal(result.overall.fp, 1);
  assert.equal(result.overall.fn, 1);
  assert.equal(result.overall.tp, 0);
  assert.equal(result.overall.wrong_urgency, 1);
  assert.equal(result.critical.fn, 1);
  assert.equal(result.critical.tp, 0);
  assert.equal(result.critical.fp, 0);
  assert.deepEqual(result.false_negatives, [
    {
      report_id: "R-001",
      finding: "Pneumotórax hipertensivo",
      urgency: "critical",
    },
  ]);
  assert.deepEqual(result.false_positives, [
    {
      report_id: "R-001",
      finding: "Pneumotórax hipertensivo",
      urgency: "urgent",
    },
  ]);
  checkLengths(result);
});

test("acento e maiúsculas não separam o mesmo achado", () => {
  const result = computeEvaluation(
    [
      report("R-002", [
        { finding: "Hemorragia Subaracnóidea", urgency: "critical" },
      ]),
    ],
    extracted("R-002", [
      { finding: "hemorragia subaracnoidea", urgency: "critical" },
    ]),
  );
  assert.equal(result.overall.tp, 1);
  assert.equal(result.overall.fp, 0);
  assert.equal(result.overall.fn, 0);
  checkLengths(result);
});

test("alias casa o nome extraído com o gabarito", () => {
  const result = computeEvaluation(
    [
      report("R-001", [
        {
          finding: "Pneumotórax hipertensivo",
          urgency: "critical",
          aliases: ["pneumotórax sob tensão"],
        },
      ]),
    ],
    extracted("R-001", [
      { finding: "Pneumotórax sob tensão", urgency: "critical" },
    ]),
  );
  assert.equal(result.overall.tp, 1);
  assert.equal(result.overall.fp, 0);
  assert.equal(result.overall.fn, 0);
  checkLengths(result);
});

test("laudo sem achado no gabarito e no cache não conta", () => {
  const result = computeEvaluation(
    [report("R-007", [])],
    extracted("R-007", []),
  );
  assert.equal(result.dataset.reports, 1);
  assert.equal(result.overall.tp, 0);
  assert.equal(result.overall.fp, 0);
  assert.equal(result.overall.fn, 0);
  assert.deepEqual(result.false_negatives, []);
  assert.deepEqual(result.false_positives, []);
  checkLengths(result);
});

test("o mesmo nome em laudos diferentes não se mistura", () => {
  const result = computeEvaluation(
    [
      report("R-010", [{ finding: "Nódulo", urgency: "actionable" }]),
      report("R-011", []),
    ],
    {
      ...extracted("R-010", []),
      ...extracted("R-011", [{ finding: "Nódulo", urgency: "actionable" }]),
    },
  );
  assert.equal(result.overall.tp, 0);
  assert.equal(result.overall.fn, 1);
  assert.equal(result.overall.fp, 1);
  assert.deepEqual(
    result.false_negatives.map((item) => item.report_id),
    ["R-010"],
  );
  assert.deepEqual(
    result.false_positives.map((item) => item.report_id),
    ["R-011"],
  );
  checkLengths(result);
});
