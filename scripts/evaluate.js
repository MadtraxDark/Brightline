import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeEvaluation } from "../src/lib/evaluate.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../src/data");
const write = process.argv.includes("--write");

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

const reports = readJson("reports.json");
const cache = readJson("extractions_cache.json");
const current = readJson("evaluation.json");
const computed = computeEvaluation(reports, cache);

function differences(actual, expected) {
  const lines = [];
  for (const key of ["tp", "fp", "fn", "wrong_urgency"]) {
    if (actual.overall?.[key] !== expected.overall[key]) {
      lines.push(`overall.${key}: arquivo ${actual.overall?.[key]} · cálculo ${expected.overall[key]}`);
    }
  }
  for (const key of ["tp", "fp", "fn"]) {
    if (actual.critical?.[key] !== expected.critical[key]) {
      lines.push(`critical.${key}: arquivo ${actual.critical?.[key]} · cálculo ${expected.critical[key]}`);
    }
  }
  if (actual.dataset?.reports !== expected.dataset.reports) {
    lines.push(`dataset.reports: arquivo ${actual.dataset?.reports} · cálculo ${expected.dataset.reports}`);
  }
  if (JSON.stringify(actual.false_negatives) !== JSON.stringify(expected.false_negatives)) {
    lines.push("false_negatives diverge do cálculo");
  }
  if (JSON.stringify(actual.false_positives) !== JSON.stringify(expected.false_positives)) {
    lines.push("false_positives diverge do cálculo");
  }
  return lines;
}

const found = differences(current, computed);
console.log(JSON.stringify(computed, null, 2));
console.log("");
console.log(found.length ? found.join("\n") : "Nenhuma diferença em relação ao evaluation.json atual.");
console.log(`Resumo: ${computed.dataset.reports} laudos, ${computed.overall.tp} acertos, ${computed.overall.fp} falsos positivos, ${computed.overall.fn} falsos negativos, ${computed.overall.wrong_urgency} urgências trocadas.`);

if (!write) process.exit(0);

const next = {
  example: typeof current.example === "boolean" ? current.example : true,
  dataset: {
    reports: computed.dataset.reports,
    description: current.dataset?.description ?? "",
  },
  overall: computed.overall,
  critical: computed.critical,
  false_negatives: computed.false_negatives,
  false_positives: computed.false_positives,
};
writeFileSync(join(dataDir, "evaluation.json"), `${JSON.stringify(next, null, 2)}\n`);
console.log("Gravou src/data/evaluation.json.");
