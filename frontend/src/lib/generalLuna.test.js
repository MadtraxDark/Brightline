import { test } from "node:test";
import assert from "node:assert/strict";
import { generalLunaReply } from "./generalLuna.js";
test("general overview counts only open cases", () => {
  const reply = generalLunaReply("Resumo dos casos", [
    { status: "closed", urgency: "critical" },
    { status: "notified", urgency: "urgent" },
  ]);
  assert.match(reply, /1 casos em aberto/);
  assert.match(reply, /0 críticos/);
  assert.match(reply, /1 urgentes/);
});
test("image guidance makes analysis limitation explicit", () =>
  assert.match(
    generalLunaReply("Como marcar imagem?"),
    /não interpreta os pixels/,
  ));
