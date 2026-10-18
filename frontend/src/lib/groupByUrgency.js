const ORDER = ["critical", "urgent", "actionable"];

const RULES = {
  1: "Comunicar em até 1 hora",
  24: "Comunicar em até 24 horas",
  720: "Comunicar em até 30 dias",
};

export function communicationRule(deadlineHours) {
  return RULES[deadlineHours] ?? null;
}

export function groupByUrgency(cases) {
  const buckets = new Map(ORDER.map((urgency) => [urgency, []]));
  for (const item of cases) {
    if (buckets.has(item.urgency)) buckets.get(item.urgency).push(item);
  }
  return ORDER
    .filter((urgency) => buckets.get(urgency).length > 0)
    .map((urgency) => ({ urgency, items: buckets.get(urgency) }));
}
