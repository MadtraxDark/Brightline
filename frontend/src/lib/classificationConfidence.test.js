import assert from "node:assert/strict";
import test from "node:test";
import { classificationConfidence } from "./classificationConfidence.js";

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
