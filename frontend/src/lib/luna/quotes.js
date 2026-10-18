const QUOTED = /[“"]([^“"”\n]{12,})[”"]/g;

export function normalizeQuote(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractQuotes(text) {
  return [...String(text ?? "").matchAll(QUOTED)].map((match) => match[1]);
}

export function hasUnverifiedQuote(text, reportText) {
  const quotes = extractQuotes(text);
  if (!quotes.length) return false;
  const haystack = normalizeQuote(reportText);
  return quotes.some((quote) => !haystack.includes(normalizeQuote(quote)));
}
