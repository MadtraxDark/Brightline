import assert from "node:assert/strict";
import test from "node:test";
import { authorizedRequest, SESSION_KEY } from "./session.js";

function setup(t, fetch) {
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  t.after(() =>
    previous
      ? Object.defineProperty(globalThis, "sessionStorage", previous)
      : delete globalThis.sessionStorage,
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    value: {
      getItem: (key) =>
        key === SESSION_KEY
          ? JSON.stringify({
              access_token: "test",
              refresh_token: "refresh",
              user: { id: "test" },
            })
          : null,
    },
    configurable: true,
  });
  t.mock.method(globalThis, "fetch", fetch);
}

test("timeout covers a pending JSON body after headers arrive", async (t) => {
  setup(t, async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        ),
      ),
  }));
  await assert.rejects(
    authorizedRequest("/reports/test/reclassify", {
      method: "POST",
      timeoutMs: 20,
    }),
    /tempo de resposta/,
  );
});

test("request cancellation interrupts reading the response", async (t) => {
  const controller = new AbortController();
  setup(t, async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: async () => {
      controller.abort();
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
    },
  }));
  await assert.rejects(
    authorizedRequest("/reports/test/reclassify", {
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
});

test("API errors and invalid JSON remain errors", async (t) => {
  setup(t, async () => ({
    ok: false,
    status: 503,
    json: async () => ({ detail: "Modelo indisponível" }),
  }));
  await assert.rejects(
    authorizedRequest("/reports/test/reclassify"),
    /Modelo indisponível/,
  );
});

test("invalid JSON is never treated as successful classification", async (t) => {
  setup(t, async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("invalid JSON");
    },
  }));
  await assert.rejects(
    authorizedRequest("/reports/test/reclassify"),
    /resposta inválida/,
  );
});

test("timeout also cancels a pending authentication refresh", async (t) => {
  let calls = 0;
  setup(t, async (_url, { signal }) => {
    if (++calls === 1) return { ok: false, status: 401 };
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      ),
    );
  });
  await assert.rejects(
    authorizedRequest("/reports/test/reclassify", { timeoutMs: 20 }),
    /tempo de resposta/,
  );
  assert.equal(calls, 2);
});
