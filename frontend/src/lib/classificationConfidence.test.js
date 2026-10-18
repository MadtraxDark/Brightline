import assert from "node:assert/strict";
import test from "node:test";
import {
  classificationConfidence,
  topProbabilityPercent,
} from "./classificationConfidence.js";

test("numeric confidence uses the requested thresholds", () => {
  for (const [value, tone] of [
    [0, "low"],
    [19.99, "low"],
    [20, "medium"],
    [80, "medium"],
    [80.01, "high"],
    [100, "high"],
  ]) {
    assert.equal(
      classificationConfidence({ confidence_percent: value }).tone,
      tone,
    );
  }
  assert.equal(
    classificationConfidence({ confidence_percent: 96 }).label,
    "96%",
  );
  assert.equal(
    classificationConfidence({ confidence_percent: 76 }).label,
    "76%",
  );
});

test("invalid percent falls back to the categorical label", () => {
  for (const value of [undefined, null, "90", NaN, -1, 101]) {
    assert.equal(
      classificationConfidence({
        confidence_percent: value,
        confidence: "high",
      }).numeric,
      false,
    );
  }
  assert.equal(classificationConfidence({ confidence: "high" }).label, "Alta");
});

test("top score becomes a 0–100 confidence", () => {
  assert.equal(topProbabilityPercent({ Nodule: 0.519, Fibrosis: 0.502 }), 51.9);
  assert.equal(topProbabilityPercent({}), null);
  assert.equal(topProbabilityPercent({ Nodule: 1.4 }), null);
});
