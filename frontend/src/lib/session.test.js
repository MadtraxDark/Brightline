import assert from "node:assert/strict";
import test from "node:test";
import {
  isAuthenticated,
  login,
  logout,
  resetSessionMemoryForTests,
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

test("login autentica e logout encerra", () => {
  const storage = memoryStorage();
  login(storage);
  assert.equal(isAuthenticated(storage), true);
  logout(storage);
  assert.equal(isAuthenticated(storage), false);
});

test("storage que lança erro usa a memória e não propaga", () => {
  resetSessionMemoryForTests();
  const storage = {
    getItem() {
      throw new Error("get");
    },
    setItem() {
      throw new Error("set");
    },
    removeItem() {
      throw new Error("remove");
    },
  };
  assert.doesNotThrow(() => login(storage));
  assert.doesNotThrow(() => {
    assert.equal(isAuthenticated(storage), true);
  });
  resetSessionMemoryForTests();
  assert.equal(isAuthenticated(storage), false);
});

test("safeRedirectPath só aceita caminho interno", () => {
  assert.equal(safeRedirectPath("/caso/R-001"), "/caso/R-001");
  assert.equal(safeRedirectPath("/nao-sinalizados?x=1"), "/nao-sinalizados?x=1");
  assert.equal(safeRedirectPath("//evil.com"), "/");
  assert.equal(safeRedirectPath("https://evil.com"), "/");
  assert.equal(safeRedirectPath("/login"), "/");
  assert.equal(safeRedirectPath(""), "/");
  assert.equal(safeRedirectPath(null), "/");
  assert.equal(safeRedirectPath(undefined), "/");
});

test("validateLogin aponta e-mail e senha", () => {
  assert.deepEqual(validateLogin("a@b.co", "x"), {});
  assert.deepEqual(validateLogin("  a@b.co  ", "x"), {});
  assert.deepEqual(validateLogin("abc", "x"), { email: "Informe um e-mail válido." });
  assert.deepEqual(validateLogin("a@b", "x"), { email: "Informe um e-mail válido." });
  assert.deepEqual(validateLogin("a@b.co", ""), { password: "Informe a senha." });
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
  assert.ok(validateRegistration("Ana Silva", "ana@example.test", "senha-demo-123", "").confirmation);
  assert.deepEqual(validateRegistration(" Ana Silva ", "ana@example.test", "senha-demo-123", "senha-demo-123"), {});
});

test("redirecionamento após cadastro não retorna à tela de autenticação", () => {
  assert.equal(safeRedirectPath("/cadastro?from=login"), "/");
});
