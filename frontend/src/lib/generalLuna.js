export function generalLunaReply(question, cases = []) {
  const query = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/^(oi|ola|bom dia|boa tarde|boa noite)[!.,\s]*$/.test(query))
    return "Olá! Posso ajudar a navegar pelo Brightline ou resumir os casos em acompanhamento. Qual é a sua dúvida?";
  if (/resumo|quant|casos|penden|critic|urgent|prioridade/.test(query)) {
    const open = cases.filter((item) => item.status !== "closed");
    const count = (level) =>
      open.filter((item) => item.urgency === level).length;
    return `Neste momento, há ${open.length} casos em aberto: ${count("critical")} críticos, ${count("urgent")} urgentes e ${count("actionable")} acionáveis. Abra a Visão geral para revisar a fila. Para discutir a evidência de um caso específico, abra o laudo e selecione “Converse com a Luna”.`;
  }
  if (/imagem|ponto|area|zoom/.test(query))
    return "No laudo, clique em Ampliar imagem. Use a roda do mouse para ajustar o zoom e C para alternar a navegação do plano. Nos controles da imagem, escolha a Luna para marcar um ponto ou o seletor de área para arrastar uma região e conversar sobre ela. As marcações são manuais; o chat demonstrativo não interpreta os pixels.";
  if (/perfil|foto|nome|configura/.test(query))
    return "Abra o menu com seu nome no canto superior direito e escolha Configurações. Lá você pode ajustar seu nome e sua foto de perfil.";
  if (/aba|menu|contato|e-mail|email/.test(query) && /comunic/.test(query))
    return "A aba Comunicação, no menu lateral, lista os médicos que aparecem nos laudos. Escolha um contato para registrar a conversa, indicar um laudo ou abrir um e-mail no programa do seu computador.";
  if (/notifica|comunica|escal|leitura|conduta/.test(query))
    return "A seção Comunicação de cada laudo mostra o responsável atual e as etapas de escalonamento. Confirme a leitura antes de registrar a conduta. O histórico registra as ações e notificações do caso.";
  if (/laudo|medic|clinica|navega|ajuda|plataforma/.test(query))
    return "Na Visão geral, os cards mostram achado, prioridade, prazo e médicos associados. Ver laudo abre o documento e a imagem. Não sinalizados reúne os achados críticos ou urgentes não sinalizados pelo radiologista. As opções identificadas como Em breve ainda estão em preparação.";
  return "Posso orientar você sobre a navegação, os casos em aberto, a comunicação, o perfil ou as ferramentas da imagem. Este é o chat geral demonstrativo do Brightline; para discutir um laudo, abra a conversa da Luna dentro dele. O que você gostaria de explorar?";
}
