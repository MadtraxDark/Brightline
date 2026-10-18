import { mockAnswer } from "./mock.js";
import { hasUnverifiedQuote } from "./quotes.js";

const CLIENT_TIMEOUT_MS = 12_000;
const CIRCUIT_MS = 60_000;

let failures = 0;
let openedAt = 0;
let lastMode = "auto";

function reportText(context) {
  return context?.laudo?.texto ?? "";
}

function pack(text, source, context, reason) {
  const result = { text, source };
  if (reason) result.reason = reason;
  if (hasUnverifiedQuote(text, reportText(context)))
    result.unverifiedQuote = true;
  return result;
}

function predefined(question, context, reason) {
  return pack(mockAnswer(question, context), "predefinida", context, reason);
}

function trip(clock) {
  failures += 1;
  if (failures >= 2) openedAt = clock;
}

export async function askLuna({
  question,
  history,
  context,
  mode = "auto",
  fetchImpl = globalThis.fetch,
  signal,
  now = Date.now,
  timeoutMs = CLIENT_TIMEOUT_MS,
  online,
}) {
  if (mode === "auto" && lastMode !== "auto") {
    failures = 0;
    openedAt = 0;
  }
  lastMode = mode;
  if (signal?.aborted) return { aborted: true };
  if (mode === "mock") return predefined(question, context, "forced");
  const connected =
    typeof online === "boolean"
      ? online
      : globalThis.navigator?.onLine !== false;
  if (!connected) return predefined(question, context, "offline");

  const clock = now();
  if (failures >= 2 && clock - openedAt < CIRCUIT_MS) {
    return predefined(question, context, "circuit_open");
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetchImpl("/api/luna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history, context }),
      signal: timeout.signal,
    });
    if (signal?.aborted) return { aborted: true };
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      trip(now());
      const code = payload?.error?.code || "network";
      return predefined(question, context, code);
    }
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text) {
      trip(now());
      return predefined(question, context, "bad_response");
    }
    failures = 0;
    openedAt = 0;
    return pack(text, "ia", context);
  } catch {
    if (signal?.aborted) return { aborted: true };
    trip(now());
    return predefined(
      question,
      context,
      timeout.signal.aborted ? "timeout" : "network",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
