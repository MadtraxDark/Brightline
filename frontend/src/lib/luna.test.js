import assert from "node:assert/strict";
import test from "node:test";
import { isLunaVisible } from "./luna.js";

test("isLunaVisible só nas páginas autenticadas", () => {
  assert.equal(isLunaVisible("/login"), false);
  assert.equal(isLunaVisible("/cadastro"), false);
  assert.equal(isLunaVisible("/home"), true);
  assert.equal(isLunaVisible("/caso/R-001-1"), true);
  assert.equal(isLunaVisible("/nao-sinalizados"), true);
  assert.equal(isLunaVisible("/avaliacao"), true);
  assert.equal(isLunaVisible("/comunicacao"), false);
  assert.equal(isLunaVisible("/comunicacao/"), false);
});
