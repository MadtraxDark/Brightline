import { caseChatReply } from "../caseChat.js";

export const OUT_OF_SCOPE =
  "Esta demonstração responde apenas às perguntas sugeridas.";

export const CASE_SUGGESTIONS = [
  "Qual trecho sustenta o achado?",
  "Como a classificação foi registrada?",
  "O que significa a porcentagem?",
  "Quem elaborou o laudo?",
];

export const QUEUE_SUGGESTIONS = [
  "Quantos casos estão atrasados?",
  "Qual o próximo prazo?",
  "O que é Sem alerta?",
];

const CONFIDENCE = { alta: "high", média: "medium", baixa: "low" };

function queueAnswer(question, context) {
  const summary = context?.resumo ?? {};
  if (question === "Quantos casos estão atrasados?") {
    return `Há ${Number(summary.atrasados) || 0} casos atrasados.`;
  }
  if (question === "Qual o próximo prazo?") {
    const next = context?.proximo_prazo;
    if (!next)
      return "Não há próximo prazo informado nos dados da fila (0 prazos em aberto).";
    return `O próximo prazo é ${next.achado}, com ${next.tempo_restante} horas restantes.`;
  }
  if (question === "O que é Sem alerta?") {
    return `Sem alerta reúne laudos sem caso aberto. Há ${Number(summary.sem_alerta) || 0} laudos sem alerta.`;
  }
  return OUT_OF_SCOPE;
}

export function mockAnswer(question, context) {
  const asked = String(question ?? "").trim();
  if (context?.tipo === "fila") return queueAnswer(asked, context);
  if (!CASE_SUGGESTIONS.includes(asked)) return OUT_OF_SCOPE;
  const item = context?.caso ?? {};
  const report = context?.laudo ?? {};
  const record = {
    finding: item.achado,
    evidence: item.evidencia,
    confidence: CONFIDENCE[item.confianca_da_ia],
    urgency: item.urgencia,
    deadline_hours: item.regra_do_prazo,
    modality: report.modalidade,
    radiologist: report.radiologista,
    ordering_physician: report.solicitante,
    text: report.texto,
  };
  return caseChatReply(asked, record, {
    text: report.texto,
    radiologist: report.radiologista,
    ordering_physician: report.solicitante,
  });
}
