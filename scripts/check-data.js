import { readFileSync } from "node:fs";
import { computeEvaluation } from "../frontend/src/lib/evaluate.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../frontend/src/data",
);
const urgencies = new Set(["critical", "urgent", "actionable"]);
const confidences = new Set(["high", "medium", "low"]);
const deadlines = { critical: 1, urgent: 24, actionable: 720 };
const locations = new Set(["Pronto-socorro", "Internado", "Ambulatório"]);
const errors = [];
const warnings = [];

function fail(id, message) {
  errors.push(`ERRO ${id}: ${message}`);
}

function warn(id, message) {
  warnings.push(`AVISO ${id}: ${message}`);
}

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() !== "";
}

const reports = readJson("reports.json");
const cache = readJson("extractions_cache.json");
const evaluation = readJson("evaluation.json");

if (!Array.isArray(reports)) {
  fail("reports.json", "precisa ser um array de laudos.");
} else {
  const seen = new Set();
  for (const report of reports) {
    const id = nonEmpty(report?.report_id) ? report.report_id : "(sem id)";
    if (!/^R-\d{3}$/.test(report?.report_id ?? "")) {
      fail(id, "report_id precisa ser único no formato R-001, com 3 dígitos.");
    } else if (seen.has(report.report_id)) {
      fail(id, "report_id repetido.");
    } else {
      seen.add(report.report_id);
    }
    for (const field of [
      "modality",
      "radiologist",
      "ordering_physician",
      "text",
    ]) {
      if (!nonEmpty(report?.[field]))
        fail(id, `${field} não pode ficar vazio.`);
    }
    if (typeof report?.flagged_by_radiologist !== "boolean") {
      fail(id, "flagged_by_radiologist precisa ser booleano.");
    }
    if (report?.patient != null) {
      if (!nonEmpty(report.patient?.name)) fail(id, "patient sem name.");
      const age = report.patient?.age;
      if (
        typeof age !== "number" ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > 120
      ) {
        fail(id, "patient.age precisa ser um número entre 0 e 120.");
      }
    }
    if (report?.location != null && !locations.has(report.location)) {
      fail(id, `location inválida: ${report.location}.`);
    }
    if (!Array.isArray(report?.ground_truth)) {
      fail(id, "ground_truth precisa ser um array.");
    } else {
      report.ground_truth.forEach((item, index) => {
        if (!nonEmpty(item?.finding))
          fail(id, `ground_truth[${index}] sem finding.`);
        if (!urgencies.has(item?.urgency)) {
          fail(
            id,
            `ground_truth[${index}] com urgência inválida: ${item?.urgency ?? "(vazia)"}.`,
          );
        }
      });
    }
  }
}

const reportList = Array.isArray(reports) ? reports : [];
const byId = new Map(
  reportList
    .filter((item) => item?.report_id)
    .map((item) => [item.report_id, item]),
);

if (cache == null || typeof cache !== "object" || Array.isArray(cache)) {
  fail(
    "extractions_cache.json",
    "precisa ser um objeto com um laudo por chave.",
  );
} else {
  for (const [key, entry] of Object.entries(cache)) {
    const id = nonEmpty(entry?.report_id) ? entry.report_id : key;
    if (!byId.has(key)) fail(id, `a chave ${key} não existe em reports.json.`);
    if (entry?.report_id !== key)
      fail(id, `a chave ${key} não bate com o report_id interno.`);
    const findings = Array.isArray(entry?.findings) ? entry.findings : null;
    if (!findings) {
      fail(id, "findings precisa ser um array.");
      continue;
    }
    const report = byId.get(key);
    findings.forEach((finding, index) => {
      if (!nonEmpty(finding?.finding))
        fail(id, `achado ${index + 1} sem finding.`);
      if (!nonEmpty(finding?.evidence))
        fail(id, `achado ${index + 1} sem evidence.`);
      if (!urgencies.has(finding?.urgency)) {
        fail(
          id,
          `achado ${index + 1} com urgência inválida: ${finding?.urgency ?? "(vazia)"}.`,
        );
      } else if (finding.deadline_hours !== deadlines[finding.urgency]) {
        fail(
          id,
          `achado ${index + 1} tem deadline_hours ${finding.deadline_hours}, incoerente com a urgência ${finding.urgency}.`,
        );
      }
      if (!confidences.has(finding?.confidence)) {
        fail(
          id,
          `achado ${index + 1} com confidence inválida: ${finding?.confidence ?? "(vazia)"}.`,
        );
      }
      if (report && nonEmpty(finding?.evidence)) {
        const occurrences = report.text.split(finding.evidence).length - 1;
        if (!report.text.includes(finding.evidence)) {
          fail(
            id,
            `a evidência "${finding.evidence}" não é trecho literal do laudo.`,
          );
        } else if (occurrences > 1) {
          warn(
            id,
            `a evidência "${finding.evidence}" aparece ${occurrences} vezes. Só a primeira será destacada.`,
          );
        }
      }
    });
  }
  for (const report of reportList) {
    if (report?.report_id && cache[report.report_id] == null) {
      fail(report.report_id, "não tem entrada em extractions_cache.json.");
    }
  }
}

function numberField(value) {
  return typeof value === "number" && Number.isFinite(value);
}

if (typeof evaluation?.example !== "boolean")
  fail("evaluation.json", 'falta "example" booleano.');
if (
  !nonEmpty(evaluation?.dataset?.description) ||
  !numberField(evaluation?.dataset?.reports)
) {
  fail("evaluation.json", "dataset precisa de reports numérico e description.");
}
for (const field of ["tp", "fp", "fn", "wrong_urgency"]) {
  if (!numberField(evaluation?.overall?.[field]))
    fail("evaluation.json", `overall.${field} precisa ser numérico.`);
}
for (const field of ["tp", "fp", "fn"]) {
  if (!numberField(evaluation?.critical?.[field]))
    fail("evaluation.json", `critical.${field} precisa ser numérico.`);
}

function checkList(name, items) {
  if (!Array.isArray(items)) {
    fail("evaluation.json", `${name} precisa ser um array.`);
    return [];
  }
  items.forEach((item, index) => {
    const id = nonEmpty(item?.report_id)
      ? item.report_id
      : `evaluation.json ${name}[${index}]`;
    if (!nonEmpty(item?.report_id))
      fail(id, `${name}[${index}] sem report_id.`);
    if (!nonEmpty(item?.finding)) fail(id, `${name}[${index}] sem finding.`);
    if (!urgencies.has(item?.urgency))
      fail(id, `${name}[${index}] com urgência inválida.`);
  });
  return items;
}

const falseNegatives = checkList(
  "false_negatives",
  evaluation?.false_negatives,
);
const falsePositives = checkList(
  "false_positives",
  evaluation?.false_positives,
);

if (
  numberField(evaluation?.overall?.fn) &&
  falseNegatives.length !== evaluation.overall.fn
) {
  fail(
    "evaluation.json",
    `overall.fn (${evaluation.overall.fn}) não bate com false_negatives (${falseNegatives.length}).`,
  );
}
if (
  numberField(evaluation?.overall?.fp) &&
  falsePositives.length !== evaluation.overall.fp
) {
  fail(
    "evaluation.json",
    `overall.fp (${evaluation.overall.fp}) não bate com false_positives (${falsePositives.length}).`,
  );
}
if (numberField(evaluation?.critical?.fn)) {
  const count = falseNegatives.filter(
    (item) => item?.urgency === "critical",
  ).length;
  if (evaluation.critical.fn !== count) {
    fail(
      "evaluation.json",
      `critical.fn (${evaluation.critical.fn}) não bate com os falsos negativos críticos (${count}).`,
    );
  }
}
if (numberField(evaluation?.critical?.fp)) {
  const count = falsePositives.filter(
    (item) => item?.urgency === "critical",
  ).length;
  if (evaluation.critical.fp !== count) {
    fail(
      "evaluation.json",
      `critical.fp (${evaluation.critical.fp}) não bate com os falsos positivos críticos (${count}).`,
    );
  }
}
if (
  numberField(evaluation?.overall?.fn) &&
  numberField(evaluation?.overall?.fp) &&
  numberField(evaluation?.overall?.wrong_urgency)
) {
  const limit = Math.min(evaluation.overall.fn, evaluation.overall.fp);
  if (evaluation.overall.wrong_urgency > limit) {
    fail(
      "evaluation.json",
      `wrong_urgency (${evaluation.overall.wrong_urgency}) passa de min(fn, fp) (${limit}).`,
    );
  }
}
if (
  numberField(evaluation?.dataset?.reports) &&
  evaluation.dataset.reports !== reportList.length
) {
  fail(
    "evaluation.json",
    `dataset.reports (${evaluation.dataset.reports}) não é o número de laudos (${reportList.length}).`,
  );
}
if (evaluation?.example === true)
  warn("evaluation.json", "example é true. Os números são de exemplo.");

if (Array.isArray(reports) && cache && typeof cache === "object") {
  const computed = computeEvaluation(reports, cache);
  const pairs = [
    ["dataset.reports", evaluation?.dataset?.reports, computed.dataset.reports],
    ["overall.tp", evaluation?.overall?.tp, computed.overall.tp],
    ["overall.fp", evaluation?.overall?.fp, computed.overall.fp],
    ["overall.fn", evaluation?.overall?.fn, computed.overall.fn],
    [
      "overall.wrong_urgency",
      evaluation?.overall?.wrong_urgency,
      computed.overall.wrong_urgency,
    ],
    ["critical.tp", evaluation?.critical?.tp, computed.critical.tp],
    ["critical.fp", evaluation?.critical?.fp, computed.critical.fp],
    ["critical.fn", evaluation?.critical?.fn, computed.critical.fn],
  ];
  for (const [label, actual, expected] of pairs) {
    if (actual !== expected) {
      fail(
        "evaluation.json",
        `${label} é ${actual} e o cálculo dá ${expected}. Rode npm run evaluate:data.`,
      );
    }
  }
  if (
    JSON.stringify(evaluation?.false_negatives) !==
    JSON.stringify(computed.false_negatives)
  ) {
    fail(
      "evaluation.json",
      "false_negatives diverge do cálculo. Rode npm run evaluate:data.",
    );
  }
  if (
    JSON.stringify(evaluation?.false_positives) !==
    JSON.stringify(computed.false_positives)
  ) {
    fail(
      "evaluation.json",
      "false_positives diverge do cálculo. Rode npm run evaluate:data.",
    );
  }
}

const byUrgency = { critical: 0, urgent: 0, actionable: 0 };
let withoutFindings = 0;
let unflagged = 0;
for (const report of reportList) {
  const findings = cache?.[report.report_id]?.findings;
  if (!Array.isArray(findings) || findings.length === 0) {
    withoutFindings += 1;
    warn(report.report_id ?? "(sem id)", "sem achados. Só informativo.");
    continue;
  }
  for (const finding of findings) {
    if (urgencies.has(finding.urgency)) byUrgency[finding.urgency] += 1;
    if (
      report.flagged_by_radiologist === false &&
      (finding.urgency === "critical" || finding.urgency === "urgent")
    ) {
      unflagged += 1;
    }
  }
}
if (unflagged < 3) {
  warn(
    "não sinalizados",
    `há ${unflagged} caso(s) crítico(s) ou urgente(s) sem sinalização, menos de 3. A tela Não sinalizados ficaria vazia na demo.`,
  );
}

const radiologists = new Set(
  reportList.map((item) => item.radiologist).filter(nonEmpty),
);
const physicians = new Set(
  reportList.map((item) => item.ordering_physician).filter(nonEmpty),
);
const doctors = new Set([...radiologists, ...physicians]);
let contacts = {};
try {
  contacts = readJson("contacts.json");
} catch {
  warn("contacts.json", "arquivo ausente.");
}
for (const doctor of doctors) {
  if (!nonEmpty(contacts?.[doctor]?.ramal)) {
    warn(doctor, "sem entrada em contacts.json.");
  }
}
if (radiologists.size > 8)
  warn("radiologistas", `${radiologists.size} radiologistas distintos.`);
if (physicians.size > 10)
  warn("solicitantes", `${physicians.size} solicitantes distintos.`);

for (const line of [...errors, ...warnings]) console.log(line);
console.log("");
console.log(`Laudos: ${reportList.length}`);
console.log(
  `Casos: ${byUrgency.critical} críticos, ${byUrgency.urgent} urgentes, ${byUrgency.actionable} acionáveis`,
);
console.log(`Laudos sem achado: ${withoutFindings}`);
console.log(`Não sinalizados críticos ou urgentes: ${unflagged}`);
console.log(`Médicos distintos: ${doctors.size}`);

if (errors.length > 0) process.exit(1);
