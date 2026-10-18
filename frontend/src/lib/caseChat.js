export function caseChatReply(question, item, report) {
  const query = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const text = report?.text ?? item.text ?? "";
  const evidence =
    item.evidence && text.includes(item.evidence) ? item.evidence : null;
  if (/imagem|raio|tomografia|foto/.test(query))
    return "Este chat não analisa imagens. A imagem demonstrativa exibida não corresponde ao caso; minhas respostas usam somente os dados e o texto deste laudo.";
  if (/confianca|porcent|percent|certeza|\%/.test(query)) {
    const level =
      item.confidence === "high"
        ? "alto"
        : item.confidence === "medium"
          ? "médio"
          : item.confidence === "low"
            ? "baixo"
            : "não informado";
    return `O nível de confiança registrado é ${level}. Não há percentual neste laudo.`;
  }
  if (/classific|prioridade|prazo|urgencia/.test(query))
    return `O caso está registrado como ${{ critical: "crítico", urgent: "urgente", actionable: "acionável" }[item.urgency] ?? item.urgency}, com prazo de comunicação configurado de ${item.deadline_hours} horas. O achado associado é “${item.finding}”. O conjunto demonstrativo fornece essa classificação pronta; não contém uma justificativa clínica adicional ou o processo interno do modelo.`;
  if (/feito|autor|medic|assin|origem|elabor/.test(query))
    return `O laudo informa ${report?.radiologist || item.radiologist || "radiologista não informado"} como radiologista e ${report?.ordering_physician || item.ordering_physician || "solicitante não informado"} como médico solicitante. Modalidade: ${item.modality || "não informada"}. Não há dados sobre o processo de elaboração além dessas informações e do texto apresentado.`;
  if (/evidencia|trecho|achado|identific|resum|explique/.test(query))
    return evidence
      ? `O achado registrado é “${item.finding}”. O trecho do laudo associado a ele é: “${evidence}”. Esse trecho foi localizado no texto original e está destacado no documento. Não foi realizada uma nova interpretação do exame neste chat.`
      : `O achado registrado é “${item.finding}”, mas o trecho de evidência não foi localizado no laudo disponível. É necessário conferir o documento original.`;
  return `Posso explorar os dados deste laudo: o achado “${item.finding}”, a evidência textual, a classificação, a confiança e a autoria. Esta conversa é demonstrativa e não gera uma avaliação clínica nova. Você pode perguntar “Qual trecho sustenta o achado?” ou “Como a classificação foi registrada?”.`;
}
