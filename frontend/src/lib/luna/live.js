export function buildCaseContext(item, report, extra = {}) {
  return {
    tipo: "caso",
    caso: {
      id: item?.id ?? null,
      laudo: item?.report_id ?? report?.report_id ?? null,
      achado: item?.finding ?? null,
      evidencia: item?.evidence ?? null,
      urgencia: item?.urgency ?? null,
      status: item?.status ?? null,
      confianca: item?.confidence ?? null,
      prazo_horas: item?.deadline_hours ?? null,
      modalidade: item?.modality ?? report?.modality ?? null,
    },
    laudo: {
      id: report?.report_id ?? item?.report_id ?? null,
      modalidade: report?.modality ?? item?.modality ?? null,
      texto: report?.text ?? "",
      radiologista: report?.radiologist ?? item?.radiologist ?? null,
      solicitante:
        report?.ordering_physician ?? item?.ordering_physician ?? null,
      sinalizado_pelo_radiologista: report?.flagged_by_radiologist ?? null,
    },
    ...extra,
  };
}

const FAILURES = {
  not_configured: "A Luna não está configurada para consultar o modelo.",
  offline: "Sem conexão. A mensagem não foi enviada.",
  timeout: "A consulta demorou demais. Tente de novo.",
  rate_limited: "A Luna está recebendo muitas perguntas. Espere um instante.",
  rate_limited_local:
    "A Luna está recebendo muitas perguntas. Espere um instante.",
  no_credits: "A conta do modelo está sem créditos.",
  circuit_open: "A Luna pausou as consultas por um instante. Tente de novo.",
  unauthorized: "A chave do modelo foi recusada.",
};

export function lunaReplyText(result) {
  if (!result || result.aborted) return null;
  if (result.source === "ia" || result.reason === "forced") return result.text;
  return (
    FAILURES[result.reason] ||
    "Não foi possível consultar a Luna agora. Tente de novo."
  );
}
