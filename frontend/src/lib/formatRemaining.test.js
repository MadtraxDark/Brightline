import assert from "node:assert/strict";
import test from "node:test";
import { formatRemaining } from "./formatRemaining.js";

const cases = [
  [0.7, "42 min"],
  [5.1667, "5h 10m"],
  [698, "29d 2h"],
  [48, "2d 0h"],
  [1, "1h 0m"],
  [0.9999, "1h 0m"],
  [0, "0 min"],
  [-2, "Atrasado há 2h"],
  [-0.5833, "Atrasado há 35 min"],
];

for (const [hours, expected] of cases) {
  test(`${hours} -> ${expected}`, () => {
    assert.equal(formatRemaining(hours), expected);
  });
}
