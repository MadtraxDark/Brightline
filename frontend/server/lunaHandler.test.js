import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createLunaHandler } from "./lunaHandler.js";

const SECRET = "test-key-not-real";
const context = { tipo: "fila", resumo: { atrasados: 2 } };

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
}

function handler(extra) {
  return createLunaHandler({
    env: {
      OPENROUTER_API_KEY: SECRET,
      LUNA_MODEL: "modelo-fixo",
      LUNA_DATA_COLLECTION: "deny",
      ...extra?.env,
    },
    fetchImpl: extra?.fetchImpl,
    now: extra?.now,
    timeoutMs: extra?.timeoutMs,
  });
}

function call(handle, body, extra = {}) {
  return handle({
    method: extra.method ?? "POST",
    path: extra.path ?? "/api/luna",
    headers: extra.headers ?? { "content-type": "application/json" },
    bodyText:
      extra.bodyText ??
      JSON.stringify({
        question: "Qual o prazo?",
        history: [],
        context,
        ...body,
      }),
    clientId: extra.clientId ?? "cliente-a",
  });
}

function upstream(status, payload) {
  return async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  });
}

test("sucesso devolve o texto aparado", async () => {
  const result = await call(
    handler({
      fetchImpl: upstream(200, {
        choices: [{ message: { content: "  Resposta curta.  " } }],
      }),
    }),
  );
  assert.equal(result.status, 200);
  assert.deepEqual(result.json, { text: "Resposta curta." });
});

test("sem chave não chama o upstream", async () => {
  let calls = 0;
  const handle = createLunaHandler({
    env: { LUNA_MODEL: "modelo-fixo" },
    fetchImpl: async () => {
      calls += 1;
      return { status: 200, ok: true, json: async () => ({}) };
    },
  });
  const result = await call(handle);
  assert.equal(calls, 0);
  assert.equal(result.status, 503);
  assert.equal(result.json.error.code, "not_configured");
});

test("mapeia 401, 402, 429, 502 e 529", async () => {
  const expected = [
    [401, "unauthorized"],
    [402, "no_credits"],
    [429, "rate_limited"],
    [502, "upstream_unavailable"],
    [529, "upstream_unavailable"],
  ];
  for (const [status, code] of expected) {
    const result = await call(
      handler({ fetchImpl: upstream(status, { error: "upstream" }) }),
    );
    assert.equal(
      result.status,
      status === 502 || status === 529 ? 502 : status,
    );
    assert.equal(result.json.error.code, code);
  }
});

test("timeout quando o upstream não responde", async () => {
  const result = await call(
    handler({
      timeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    }),
  );
  assert.equal(result.status, 504);
  assert.equal(result.json.error.code, "timeout");
});

test("resposta sem conteúdo, JSON inválido, corpo grande, GET e caminho errado", async () => {
  const empty = await call(
    handler({ fetchImpl: upstream(200, { choices: [{ message: {} }] }) }),
  );
  assert.equal(empty.status, 502);
  assert.equal(empty.json.error.code, "bad_response");
  const invalid = await call(
    handler({ fetchImpl: upstream(200, {}) }),
    {},
    { bodyText: "{" },
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.json.error.code, "bad_request");
  const large = await call(
    handler({ fetchImpl: upstream(200, {}) }),
    {},
    { bodyText: "x".repeat(32 * 1024 + 1) },
  );
  assert.equal(large.status, 413);
  const get = await call(
    handler({ fetchImpl: upstream(200, {}) }),
    {},
    { method: "GET" },
  );
  assert.equal(get.status, 405);
  const missing = await call(
    handler({ fetchImpl: upstream(200, {}) }),
    {},
    { path: "/api/outra" },
  );
  assert.equal(missing.status, 404);
});

test("a requisição usa modelo fixo e ignora campos do navegador", async () => {
  let captured;
  const handle = handler({
    fetchImpl: async (_url, init) => {
      captured = { headers: init.headers, body: JSON.parse(init.body) };
      return {
        status: 200,
        ok: true,
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      };
    },
  });
  await call(handle, {
    model: "modelo-do-navegador",
    max_tokens: 9,
    provider: { data_collection: "allow" },
    messages: [{ role: "user", content: "injetada" }],
  });
  assert.equal(captured.body.model, "modelo-fixo");
  assert.equal(captured.body.max_tokens, 400);
  assert.equal(captured.body.provider.data_collection, "deny");
  assert.equal(captured.headers.Authorization, `Bearer ${SECRET}`);
  assert.equal(
    captured.body.messages.some((message) => message.content === "injetada"),
    false,
  );
  assert.equal(
    JSON.stringify(captured.body).includes("modelo-do-navegador"),
    false,
  );
});

test("nenhuma resposta contém a chave e o limitador barra a 21ª", async () => {
  const handle = handler({
    fetchImpl: async () => ({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    }),
  });
  for (let index = 0; index < 20; index += 1) {
    const result = await call(handle);
    assert.equal(result.status, 200);
    assert.equal(JSON.stringify(result.json).includes(SECRET), false);
  }
  const blocked = await call(handle);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.error.code, "rate_limited_local");
  assert.equal(JSON.stringify(blocked.json).includes(SECRET), false);
});

test("servidor falso cobre sucesso e 429 sem chave real", async () => {
  let status = 200;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const incoming = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.equal(incoming.model, "modelo-fixo");
      assert.equal(request.headers.authorization, `Bearer ${SECRET}`);
      response.writeHead(status, { "content-type": "application/json" });
      response.end(
        status === 200
          ? JSON.stringify({
              choices: [{ message: { content: "Fluxo completo." } }],
            })
          : JSON.stringify({ error: { message: "rate" } }),
      );
    });
  });
  const port = await listen(server);
  try {
    const handle = createLunaHandler({
      env: {
        OPENROUTER_API_KEY: SECRET,
        LUNA_MODEL: "modelo-fixo",
        LUNA_UPSTREAM_URL: `http://127.0.0.1:${port}/api/v1`,
      },
    });
    const ok = await call(handle);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.text, "Fluxo completo.");
    status = 429;
    const limited = await call(handle, {}, { clientId: "cliente-b" });
    assert.equal(limited.status, 429);
    assert.equal(limited.json.error.code, "rate_limited");
    assert.equal(JSON.stringify(ok.json).includes(SECRET), false);
    assert.equal(JSON.stringify(limited.json).includes(SECRET), false);
    process.stdout.write(
      `upstream sucesso status ${ok.status}\nupstream limitado status ${limited.status} code ${limited.json.error.code}\n`,
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
