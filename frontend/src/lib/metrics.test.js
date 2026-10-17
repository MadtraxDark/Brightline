import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatPercent, precision, recall } from "./metrics.js";

test("precisão e recall em casos normais", () => {
  assert.equal(precision(8, 2), 0.8);
  assert.equal(recall(5, 5), 0.5);
  assert.equal(formatPercent(0.8), "80%");
  assert.equal(formatPercent(1), "100%");
});

test("denominador zero devolve null e travessão", () => {
  assert.equal(precision(0, 0), null);
  assert.equal(recall(0, 0), null);
  assert.equal(formatPercent(precision(0, 0)), "—");
  assert.equal(formatPercent(recall(0, 0)), "—");
  assert.equal(formatPercent(null), "—");
  assert.notEqual(formatPercent(precision(0, 0)), "NaN%");
  assert.equal(Number.isFinite(precision(1, 0)), true);
});

test("2 de 2 dá 100% e 1 de 3 dá 33%", () => {
  assert.equal(formatPercent(precision(2, 0)), "100%");
  assert.equal(formatPercent(recall(2, 0)), "100%");
  assert.equal(formatPercent(recall(1, 2)), "33%");
  assert.equal(formatPercent(precision(1, 2)), "33%");
});

function readJson(name) {
  const file = join(dirname(fileURLToPath(import.meta.url)), "../data", name);
  return JSON.parse(readFileSync(file, "utf8"));
}

test("evaluation.json tem fp e fn iguais ao tamanho das listas", () => {
  const data = readJson("evaluation.json");
  assert.equal(data.false_positives.length, data.overall.fp);
  assert.equal(data.false_negatives.length, data.overall.fn);
});

test("a avaliação de exemplo é consistente com os laudos", () => {
  const data = readJson("evaluation.json");
  const reports = readJson("reports.json");
  const criticalFn = data.false_negatives.filter((item) => item.urgency === "critical").length;
  const criticalFp = data.false_positives.filter((item) => item.urgency === "critical").length;
  assert.equal(data.critical.fn, criticalFn);
  assert.equal(data.critical.fp, criticalFp);
  assert.ok(data.overall.wrong_urgency <= Math.min(data.overall.fn, data.overall.fp));
  assert.equal(data.dataset.reports, reports.length);
  assert.ok(data.critical.tp + data.critical.fn <= data.overall.tp + data.overall.fn);
});
