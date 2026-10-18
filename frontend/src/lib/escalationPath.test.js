import assert from "node:assert/strict";
import test from "node:test";
import { escalationPath } from "./escalationPath.js";

const report = {
  ordering_physician: "Dr. Paulo Mendes",
  radiologist: "Dra. Ana Luz",
};

function path(status, level) {
  return escalationPath(
    {
      status,
      escalation_level: level,
      ordering_physician: "Nome do caso",
      radiologist: "Nome do caso",
    },
    report,
  );
}

test("notificado no nível 0 marca o solicitante como atual", () => {
  const steps = path("notified", 0);
  assert.deepEqual(
    steps.map((step) => step.state),
    ["Atual", "Próximo se não houver leitura", "Próximo se não houver leitura"],
  );
});

test("escalado no nível 1 deixa o solicitante como já notificado", () => {
  const steps = path("escalated", 1);
  assert.deepEqual(
    steps.map((step) => step.state),
    ["Já notificado", "Atual", "Próximo se não houver leitura"],
  );
});

test("escalado no nível 2 destaca a terceira etapa", () => {
  const steps = path("escalated", 2);
  assert.deepEqual(
    steps.map((step) => step.state),
    ["Já notificado", "Já notificado", "Atual"],
  );
});

test("lido no nível 1 confirma a leitura do radiologista", () => {
  const steps = path("read", 1);
  assert.deepEqual(
    steps.map((step) => step.state),
    ["Já notificado", "Leitura confirmada", "Não necessário"],
  );
});

test("fechado confirma quem leu e dispensa os passos seguintes", () => {
  const steps = path("closed", 0);
  assert.deepEqual(
    steps.map((step) => step.state),
    ["Leitura confirmada", "Não necessário", "Envio pendente"],
  );
});

test("name vem dos campos reais do laudo", () => {
  const steps = path("notified", 0);
  assert.equal(steps[0].name, "Dr. Paulo Mendes");
  assert.equal(steps[1].name, "Dra. Ana Luz");
  assert.equal(steps[2].name, "Dr. Paulo Mendes");
  assert.deepEqual(
    steps.map((step) => step.role),
    ["Médico solicitante", "Radiologista que assinou", "Médico solicitante"],
  );
});

test("envio concluído marca a etapa final como laudo fechado", () => {
  const steps = escalationPath(
    {
      status: "closed",
      escalation_level: 0,
      requester_sent_at: "2026-10-18T12:00:00Z",
    },
    report,
  );
  assert.equal(steps[2].state, "Laudo fechado");
});
