import assert from "node:assert/strict";
import test from "node:test";
import {
  isAuthenticated,
  login,
  logout,
  register,
  validateSession,
  SESSION_KEY,
  safeRedirectPath,
  validateLogin,
  validateRegistration,
} from "./session.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

test("sem nada no storage, isAuthenticated é false", () => {
  assert.equal(isAuthenticated(memoryStorage()), false);
});

const credentials = { email: "ana@example.test", password: "senha12345" };
const session = {
  access_token: "access",
  refresh_token: "refresh",
  user: { id: "test-user", email: credentials.email, name: "Ana Silva" },
};
function mockResponses(t, responses) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    assert.ok(next, "unexpected auth request");
    return {
      ok: next.status < 400,
      status: next.status,
      json: async () => next.data,
    };
  });
  return calls;
}

test("login real envia credenciais, valida sessão e logout revoga", async (t) => {
  const storage = memoryStorage();
  const calls = mockResponses(t, [
    { status: 200, data: session },
    { status: 200, data: session.user },
    { status: 204 },
  ]);
  await login(storage, credentials);
  assert.equal(isAuthenticated(storage), true);
  assert.deepEqual(await validateSession(storage), session.user);
  await logout(storage);
  assert.equal(isAuthenticated(storage), false);
  assert.deepEqual(JSON.parse(calls[0].options.body), credentials);
  assert.equal(calls[1].options.headers.Authorization, "Bearer access");
  assert.ok(calls[2].url.endsWith("/auth/logout"));
});

test("cadastro cria a conta sem autenticar; login explícito inicia a sessão", async (t) => {
  const storage = memoryStorage();
  const calls = mockResponses(t, [
    { status: 201, data: { user: session.user } },
    { status: 200, data: session },
  ]);
  await register({ ...credentials, name: " Ana Silva " });
  assert.equal(JSON.parse(calls[0].options.body).name, "Ana Silva");
  assert.equal(isAuthenticated(storage), false);
  assert.equal(storage.getItem(SESSION_KEY), null);
  await login(storage, credentials);
  assert.equal(isAuthenticated(storage), true);
});

test("falha de login não cria sessão", async (t) => {
  const storage = memoryStorage();
  mockResponses(t, [
    { status: 401, data: { detail: "E-mail ou senha inválidos." } },
  ]);
  await assert.rejects(login(storage, credentials), /inválidos/);
  assert.equal(isAuthenticated(storage), false);
});

test("access expirado renova uma única vez em validações concorrentes", async (t) => {
  const storage = memoryStorage();
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  const calls = mockResponses(t, [
    { status: 401 },
    { status: 200, data: { ...session, access_token: "new-access" } },
  ]);
  const [a, b] = await Promise.all([
    validateSession(storage),
    validateSession(storage),
  ]);
  assert.deepEqual(a, b);
  assert.equal(calls.length, 2);
  assert.equal(
    JSON.parse(storage.getItem(SESSION_KEY)).access_token,
    "new-access",
  );
});

test("refresh inválido encerra a sessão", async (t) => {
  const storage = memoryStorage();
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  mockResponses(t, [{ status: 401 }, { status: 401 }]);
  assert.equal(await validateSession(storage), null);
  assert.equal(isAuthenticated(storage), false);
});

test("falha de conexão preserva sessão e permite nova tentativa", async (t) => {
  const storage = memoryStorage();
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  mockResponses(t, [new Error("offline")]);
  await assert.rejects(validateSession(storage), /conectar/);
  assert.equal(isAuthenticated(storage), true);
});

test("marcador antigo de login demonstrativo não autentica", () => {
  const storage = memoryStorage();
  storage.setItem(SESSION_KEY, "1");
  assert.equal(isAuthenticated(storage), false);
});

test("cadastro exige nove caracteres", () => {
  assert.ok(
    validateRegistration("Ana Silva", credentials.email, "12345678", "12345678")
      .password,
  );
  assert.deepEqual(
    validateRegistration(
      "Ana Silva",
      credentials.email,
      "123456789",
      "123456789",
    ),
    {},
  );
});

test("safeRedirectPath só aceita caminho interno", () => {
  assert.equal(safeRedirectPath("/caso/R-001"), "/caso/R-001");
  assert.equal(
    safeRedirectPath("/nao-sinalizados?x=1"),
    "/nao-sinalizados?x=1",
  );
  assert.equal(safeRedirectPath("//evil.com"), "/home");
  assert.equal(safeRedirectPath("https://evil.com"), "/home");
  assert.equal(safeRedirectPath("/login"), "/home");
  assert.equal(safeRedirectPath(""), "/home");
  assert.equal(safeRedirectPath(null), "/home");
  assert.equal(safeRedirectPath(undefined), "/home");
});

test("validateLogin aponta e-mail e senha", () => {
  assert.deepEqual(validateLogin("a@b.co", "x"), {});
  assert.deepEqual(validateLogin("  a@b.co  ", "x"), {});
  assert.deepEqual(validateLogin("abc", "x"), {
    email: "Informe um e-mail válido.",
  });
  assert.deepEqual(validateLogin("a@b", "x"), {
    email: "Informe um e-mail válido.",
  });
  assert.deepEqual(validateLogin("a@b.co", ""), {
    password: "Informe a senha.",
  });
  assert.deepEqual(validateLogin("abc", ""), {
    email: "Informe um e-mail válido.",
    password: "Informe a senha.",
  });
});

test("cadastro valida nome, e-mail, tamanho da senha e confirmação", () => {
  const errors = validateRegistration("", "invalido", "curta", "outra");
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.ok(errors.confirmation);
});

test("cadastro exige confirmação e aceita dados válidos", () => {
  assert.ok(
    validateRegistration("Ana Silva", "ana@example.test", "senha-demo-123", "")
      .confirmation,
  );
  assert.deepEqual(
    validateRegistration(
      " Ana Silva ",
      "ana@example.test",
      "senha-demo-123",
      "senha-demo-123",
    ),
    {},
  );
});

test("redirecionamento após cadastro não retorna à tela de autenticação", () => {
  assert.equal(safeRedirectPath("/cadastro?from=login"), "/home");
});

test("login leva ao painel e preserva o destino de um caso", () => {
  assert.equal(safeRedirectPath("/"), "/home");
  assert.equal(safeRedirectPath("/login/"), "/home");
  assert.equal(safeRedirectPath("/cadastro/?from=login"), "/home");
  assert.equal(safeRedirectPath("/app"), "/home");
  assert.equal(
    safeRedirectPath("/caso/R-001?tab=historico"),
    "/caso/R-001?tab=historico",
  );
});
