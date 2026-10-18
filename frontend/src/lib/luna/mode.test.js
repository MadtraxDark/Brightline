import assert from "node:assert/strict";
import test from "node:test";
import { LUNA_MODE_KEY, getLunaMode, setLunaMode } from "./mode.js";

function memory() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("o padrão é automática e valor inválido volta para automática", () => {
  const storage = memory();
  assert.equal(getLunaMode(storage), "auto");
  storage.setItem(LUNA_MODE_KEY, "talvez");
  assert.equal(getLunaMode(storage), "auto");
  setLunaMode(storage, "mock");
  assert.equal(getLunaMode(storage), "mock");
  setLunaMode(storage, "auto");
  assert.equal(storage.getItem(LUNA_MODE_KEY), "auto");
});

test("storage que lança erro devolve automática e não propaga a falha", () => {
  const storage = {
    getItem() {
      throw new Error("bloqueado");
    },
    setItem() {
      throw new Error("bloqueado");
    },
  };
  assert.equal(getLunaMode(storage), "auto");
  assert.doesNotThrow(() => setLunaMode(storage, "mock"));
});
