export function splitEvidence(text, evidence) {
  if (evidence == null || String(evidence).trim() === "") {
    return { before: text, match: "", after: "", found: false };
  }
  const needle = String(evidence);
  const source = text ?? "";
  const index = source.indexOf(needle);
  if (index === -1) {
    return { before: text, match: "", after: "", found: false };
  }
  const match = source.slice(index, index + needle.length);
  const before = source.slice(0, index);
  const after = source.slice(index + needle.length);
  return { before, match, after, found: true };
}
