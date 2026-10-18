import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { askLuna } from "./client.js";

describe("askLuna", { concurrency: false }, () => {
  const context = {
    tipo: "caso",
    caso: {
      achado: "Achado de exemplo",
      evidencia: "trecho existente no laudo",
      urgencia: "urgent",
      regra_do_prazo: 24,
      confianca_da_ia: "média",
    },
    laudo: {
      texto: "O laudo contém trecho existente no laudo e nada além disso.",
      radiologista: "Dra. Ana Luz",
      solicitante: "Dr. Paulo Mendes",
      modalidade: "TC",
    },
  };

  function input(extra) {
    return {
      question: "Qual trecho sustenta o achado?",
      history: [],
      context,
      ...extra,
    };
  }

  test("sucesso devolve ia e citação conferida", async () => {
    let calls = 0;
    const result = await askLuna(
      input({
        fetchImpl: async () => {
          calls += 1;
          return {
            ok: true,
            json: async () => ({
              text: "O trecho é “trecho existente no laudo”.",
            }),
          };
        },
      }),
    );
    assert.equal(calls, 1);
    assert.equal(result.source, "ia");
    assert.equal(result.unverifiedQuote, undefined);
  });

  test("modo mock não chama a rede", async () => {
    let calls = 0;
    const result = await askLuna(
      input({
        mode: "mock",
        fetchImpl: async () => {
          calls += 1;
          return { ok: true, json: async () => ({ text: "não" }) };
        },
      }),
    );
    assert.equal(calls, 0);
    assert.equal(result.source, "predefinida");
    assert.equal(result.reason, "forced");
  });

  test("offline usa resposta pré-definida", async () => {
    let calls = 0;
    const result = await askLuna(
      input({
        online: false,
        fetchImpl: async () => {
          calls += 1;
          throw new Error("rede");
        },
      }),
    );
    assert.equal(calls, 0);
    assert.equal(result.source, "predefinida");
    assert.equal(result.reason, "offline");
  });

  test("cada código de erro vira pré-definida com o reason certo", async () => {
    for (const code of [
      "timeout",
      "no_credits",
      "rate_limited",
      "unauthorized",
      "upstream_unavailable",
      "not_configured",
      "bad_response",
      "bad_request",
    ]) {
      const result = await askLuna(
        input({
          mode: "mock",
        }),
      );
      assert.equal(result.reason, "forced");
      const failed = await askLuna(
        input({
          fetchImpl: async () => ({
            ok: false,
            status: 500,
            json: async () => ({ error: { code } }),
          }),
        }),
      );
      assert.equal(failed.source, "predefinida");
      assert.equal(failed.reason, code);
    }
  });

  test("cancelamento não aciona o fallback", async () => {
    const controller = new AbortController();
    const pending = askLuna(
      input({
        signal: controller.signal,
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
    controller.abort();
    const result = await pending;
    assert.deepEqual(result, { aborted: true });
  });

  test("o disjuntor abre, espera 60 segundos e fecha com sucesso ou ao voltar para automática", async () => {
    let clock = 1_000;
    const now = () => clock;
    const fail = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: { code: "not_configured" } }),
    });
    await askLuna(input({ mode: "mock", now }));
    const first = await askLuna(input({ fetchImpl: fail, now }));
    const second = await askLuna(input({ fetchImpl: fail, now }));
    assert.equal(first.reason, "not_configured");
    assert.equal(second.reason, "not_configured");
    let calls = 0;
    const skipped = await askLuna(
      input({
        now,
        fetchImpl: async () => {
          calls += 1;
          return { ok: true, json: async () => ({ text: "não devia" }) };
        },
      }),
    );
    assert.equal(calls, 0);
    assert.equal(skipped.reason, "circuit_open");
    clock += 60_000;
    const restored = await askLuna(
      input({
        now,
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ text: "Resposta da IA." }),
        }),
      }),
    );
    assert.equal(restored.source, "ia");
    await askLuna(input({ fetchImpl: fail, now }));
    await askLuna(input({ fetchImpl: fail, now }));
    await askLuna(input({ mode: "mock", now }));
    let after = 0;
    const reopened = await askLuna(
      input({
        now,
        fetchImpl: async () => {
          after += 1;
          return { ok: true, json: async () => ({ text: "de novo" }) };
        },
      }),
    );
    assert.equal(after, 1);
    assert.equal(reopened.source, "ia");
  });

  test("citação inventada é marcada e texto vazio cai no fallback", async () => {
    const invented = await askLuna(
      input({
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            text: "O laudo diz “frase inventada de doze”.",
          }),
        }),
      }),
    );
    assert.equal(invented.source, "ia");
    assert.equal(invented.unverifiedQuote, true);
    const empty = await askLuna(
      input({
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ text: "   " }),
        }),
      }),
    );
    assert.equal(empty.source, "predefinida");
    assert.equal(empty.reason, "bad_response");
  });
});
