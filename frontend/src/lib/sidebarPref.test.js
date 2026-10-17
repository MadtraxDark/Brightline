import assert from "node:assert/strict";
import test from "node:test";
import { readSidebarCollapsed, SIDEBAR_KEY, writeSidebarCollapsed } from "./sidebarPref.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

test("sem nada, a sidebar começa expandida", () => {
  assert.equal(readSidebarCollapsed(memoryStorage()), false);
});

test("gravar true e ler devolve true", () => {
  const storage = memoryStorage();
  writeSidebarCollapsed(storage, true);
  assert.equal(readSidebarCollapsed(storage), true);
  assert.equal(storage.getItem(SIDEBAR_KEY), JSON.stringify({ v: 1, sidebarCollapsed: true }));
});

test("JSON inválido devolve false", () => {
  const storage = memoryStorage({ [SIDEBAR_KEY]: "{não é json" });
  assert.equal(readSidebarCollapsed(storage), false);
});

test("versão diferente de 1 devolve false", () => {
  const storage = memoryStorage({
    [SIDEBAR_KEY]: JSON.stringify({ v: 2, sidebarCollapsed: true }),
  });
  assert.equal(readSidebarCollapsed(storage), false);
});

test("valor que não é booleano devolve false", () => {
  const storage = memoryStorage({
    [SIDEBAR_KEY]: JSON.stringify({ v: 1, sidebarCollapsed: "true" }),
  });
  assert.equal(readSidebarCollapsed(storage), false);
});

test("storage que lança erro não propaga e a leitura é false", () => {
  const storage = {
    getItem() {
      throw new Error("get");
    },
    setItem() {
      throw new Error("set");
    },
  };
  assert.doesNotThrow(() => writeSidebarCollapsed(storage, true));
  assert.equal(readSidebarCollapsed(storage), false);
});

test("escrever preserva os outros campos do objeto", () => {
  const storage = memoryStorage({
    [SIDEBAR_KEY]: JSON.stringify({ v: 1, sidebarCollapsed: false, theme: "claro" }),
  });
  writeSidebarCollapsed(storage, true);
  assert.deepEqual(JSON.parse(storage.getItem(SIDEBAR_KEY)), {
    v: 1,
    sidebarCollapsed: true,
    theme: "claro",
  });
});
