import assert from "node:assert/strict";
import test from "node:test";

import {
  PATHOLOGY_COLORS,
  pathologyColor,
  validLocalizationMarkers,
  visiblePathologyScores,
} from "./pathologyColors.js";

test("every model pathology has one stable color", () => {
  assert.equal(Object.keys(PATHOLOGY_COLORS).length, 14);
  assert.equal(pathologyColor("Fibrosis"), "#d946ef");
  assert.equal(pathologyColor("Unknown"), "#94a3b8");
});

test("only valid Grad-CAM estimates can be displayed as pins", () => {
  const valid = {
    pathology: "Fibrosis",
    score: 0.486,
    x: 0.4,
    y: 0.6,
    localization_method: "gradcam",
    localization_status: "estimated",
  };
  const markers = validLocalizationMarkers({
    markers: [
      valid,
      { ...valid, pathology: "Unknown" },
      { ...valid, x: 1.2 },
      { ...valid, localization_status: "unavailable" },
      { ...valid, localization_method: "fixed" },
      { ...valid, score: Number.NaN },
    ],
  });
  assert.deepEqual(markers, [valid]);
});

test("missing Grad-CAM data does not invent pins", () => {
  assert.deepEqual(
    validLocalizationMarkers({ probabilities: { Fibrosis: 0.8 } }),
    [],
  );
});

test("score list keeps every pathology with a valid pin beyond the top five", () => {
  const probabilities = Object.fromEntries(
    Object.keys(PATHOLOGY_COLORS).map((label, index) => [
      label,
      0.9 - index * 0.04,
    ]),
  );
  const markers = [
    {
      pathology: "Hernia",
      score: probabilities.Hernia,
      x: 0.5,
      y: 0.5,
      localization_method: "gradcam",
      localization_status: "estimated",
    },
  ];
  const scores = visiblePathologyScores(probabilities, markers);
  assert.equal(scores.length, 6);
  assert.ok(scores.some(([label]) => label === "Hernia"));
});
