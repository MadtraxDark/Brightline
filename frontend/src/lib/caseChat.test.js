import { test } from "node:test";
import assert from "node:assert/strict";
import { caseChatReply } from "./caseChat.js";
const item = {
  finding: "Achado de exemplo",
  evidence: "trecho existente",
  confidence: "medium",
  urgency: "actionable",
  deadline_hours: 720,
};
test("chat limits evidence to text actually present", () => {
  assert.match(
    caseChatReply("Qual trecho sustenta o achado?", item, {
      text: "Um trecho existente aqui.",
    }),
    /“trecho existente”/,
  );
  assert.match(
    caseChatReply("Qual trecho sustenta o achado?", item, {
      text: "Outro texto",
    }),
    /não foi localizado/,
  );
});
test("chat identifies simulated confidence and does not claim image analysis", () => {
  assert.match(
    caseChatReply("O que significa a porcentagem?", item, {}),
    /Não há percentual/,
  );
  assert.match(
    caseChatReply("Analise a imagem", item, {}),
    /não analisa imagens/,
  );
  assert.match(
    caseChatReply("Como a classificação foi registrada?", item, {}),
    /fornece essa classificação pronta/,
  );
});
