import { buildMessages, validateLunaInput } from "../src/lib/luna/prompt.js";

const BODY_LIMIT = 32 * 1024;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const TEXT_LIMIT = 1200;

function error(status, code) {
  return { status, json: { error: { code } } };
}

function upstreamBase(env) {
  return String(
    env.LUNA_UPSTREAM_URL || "https://openrouter.ai/api/v1",
  ).replace(/\/$/, "");
}

export function createLunaHandler({
  env = {},
  fetchImpl = fetch,
  now = Date.now,
  timeoutMs = 10_000,
} = {}) {
  const hits = new Map();

  function limited(clientId, clock) {
    const recent = (hits.get(clientId) ?? []).filter(
      (at) => clock - at < RATE_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT) {
      hits.set(clientId, recent);
      return true;
    }
    recent.push(clock);
    hits.set(clientId, recent);
    return false;
  }

  return async function handle({ method, path, headers, bodyText, clientId }) {
    if (path !== "/api/luna") return error(404, "not_found");
    if (method !== "POST") return error(405, "method_not_allowed");
    const type = String(
      headers?.["content-type"] ?? headers?.["Content-Type"] ?? "",
    );
    if (!type.toLowerCase().startsWith("application/json"))
      return error(400, "bad_request");
    if (Buffer.byteLength(String(bodyText ?? "")) > BODY_LIMIT)
      return error(413, "payload_too_large");

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return error(400, "bad_request");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return error(400, "bad_request");
    const input = {
      question: body.question,
      history: body.history,
      context: body.context,
    };
    if (!validateLunaInput(input)) return error(400, "bad_request");
    if (limited(String(clientId ?? "anonymous"), now()))
      return error(429, "rate_limited_local");

    const key = env.OPENROUTER_API_KEY;
    const model = env.LUNA_MODEL;
    if (!key || !model) return error(503, "not_configured");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(
        `${upstreamBase(env)}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.LUNA_SITE_URL || "http://localhost",
            "X-OpenRouter-Title": "Brightline",
          },
          body: JSON.stringify({
            model,
            messages: buildMessages(input),
            max_tokens: 400,
            temperature: 0.2,
            provider: { data_collection: env.LUNA_DATA_COLLECTION || "deny" },
          }),
          signal: controller.signal,
        },
      );
      if (response.status === 401) return error(401, "unauthorized");
      if (response.status === 402) return error(402, "no_credits");
      if (response.status === 429) return error(429, "rate_limited");
      if (response.status >= 500 || response.status === 529)
        return error(502, "upstream_unavailable");
      if (!response.ok) return error(502, "bad_response");
      const payload = await response.json().catch(() => null);
      const text = payload?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim())
        return error(502, "bad_response");
      return { status: 200, json: { text: text.trim().slice(0, TEXT_LIMIT) } };
    } catch (cause) {
      if (cause?.name === "AbortError" || controller.signal.aborted)
        return error(504, "timeout");
      return error(502, "upstream_unavailable");
    } finally {
      clearTimeout(timer);
    }
  };
}
