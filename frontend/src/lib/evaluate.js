export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function sameFinding(truth, extracted) {
  const extractedName = normalizeName(extracted?.finding);
  if (normalizeName(truth?.finding) === extractedName) return true;
  const aliases = Array.isArray(truth?.aliases) ? truth.aliases : [];
  return aliases.some((alias) => normalizeName(alias) === extractedName);
}

function listItem(reportId, finding, urgency) {
  return { report_id: reportId, finding, urgency };
}

function byReportId(left, right) {
  return String(left.report_id).localeCompare(String(right.report_id));
}

export function computeEvaluation(reports, cache) {
  const source = Array.isArray(reports) ? reports : [];
  const extractions = cache ?? {};
  let tp = 0;
  let wrongUrgency = 0;
  let criticalTp = 0;
  let criticalFn = 0;
  let criticalFp = 0;
  const falseNegatives = [];
  const falsePositives = [];

  for (const report of source) {
    const reportId = report?.report_id;
    const truths = Array.isArray(report?.ground_truth) ? report.ground_truth : [];
    const found = Array.isArray(extractions[reportId]?.findings) ? extractions[reportId].findings : [];
    const used = new Set();

    truths.forEach((truth) => {
      let match = found.findIndex((item, index) => !used.has(index) && sameFinding(truth, item) && item?.urgency === truth?.urgency);
      if (match === -1) {
        match = found.findIndex((item, index) => !used.has(index) && sameFinding(truth, item));
      }
      if (match === -1) {
        falseNegatives.push(listItem(reportId, truth?.finding, truth?.urgency));
        if (truth?.urgency === "critical") criticalFn += 1;
        return;
      }
      used.add(match);
      const extracted = found[match];
      if (extracted?.urgency === truth?.urgency) {
        tp += 1;
        if (truth?.urgency === "critical") criticalTp += 1;
        return;
      }
      wrongUrgency += 1;
      falseNegatives.push(listItem(reportId, truth?.finding, truth?.urgency));
      falsePositives.push(listItem(reportId, extracted?.finding, extracted?.urgency));
      if (truth?.urgency === "critical") criticalFn += 1;
      if (extracted?.urgency === "critical") criticalFp += 1;
    });

    found.forEach((item, index) => {
      if (used.has(index)) return;
      falsePositives.push(listItem(reportId, item?.finding, item?.urgency));
      if (item?.urgency === "critical") criticalFp += 1;
    });
  }

  falseNegatives.sort(byReportId);
  falsePositives.sort(byReportId);

  return {
    dataset: { reports: source.length },
    overall: {
      tp,
      fp: falsePositives.length,
      fn: falseNegatives.length,
      wrong_urgency: wrongUrgency,
    },
    critical: { tp: criticalTp, fp: criticalFp, fn: criticalFn },
    false_negatives: falseNegatives,
    false_positives: falsePositives,
  };
}
