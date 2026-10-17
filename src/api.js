/**
 * Única porta da API. Componentes não usam fetch.
 *
 * Mock no formato do contrato abaixo. Para usar o backend, troque USE_MOCK
 * para false. Nada fora deste arquivo precisa mudar.
 *
 * GET  /stats
 * GET  /cases?view=queue|unflagged
 * GET  /cases/:id
 * POST /cases/:id/read
 * POST /cases/:id/actions   { text }
 * POST /cases/:id/close
 * GET  /simulation
 * POST /simulation/advance  { hours }
 * POST /simulation/reset
 *
 * Caso (lista): id, finding_name, urgency, current_target,
 * time_remaining_hours, flagged_by_radiologist, status, times_escalated.
 * Detalhe acrescenta: confidence (alta|media|baixa), modality, radiologist,
 * requesting_physician, report_text, evidence, timeline[{label, offset_hours}].
 * status: detected | notified | read | action_recorded | closed | escalated.
 * Stats: { open, critical, escalated, avg_time_to_read_hours }.
 * Relógio: { offset_hours }. Advance devolve também escalated_ids.
 */

const USE_MOCK = true;
const BASE = "http://localhost:8000";

const NETWORK_ERROR =
  "Não foi possível carregar os casos. Verifique se o backend está rodando em localhost:8000 e tente de novo.";

const SEED = [
  {
    id: "c1",
    finding_name: "Nódulo pulmonar suspeito",
    urgency: "critical",
    confidence: "alta",
    current_target: "Dra. Helena Costa",
    time_remaining_hours: 0.7,
    flagged_by_radiologist: true,
    status: "notified",
    times_escalated: 0,
    modality: "TC de tórax",
    radiologist: "Dra. Ana Luz",
    requesting_physician: "Dr. Paulo Mendes",
    _chain: ["Dra. Helena Costa", "Dr. Paulo Mendes", "Coordenação do pronto-socorro"],
    _step: 0,
    report_text:
      "TC de tórax com contraste. Observa-se nódulo espiculado de 2,4 cm no lobo superior direito, com contato pleural e broncograma ausente no interior da lesão. Os demais campos pulmonares estão sem consolidações. Mediastino centrado, sem linfonodomegalia evidente. A comparação com exame anterior não está disponível nesta unidade.\n\nConclusão: achado suspeito, com indicação de avaliação em caráter imediato pelo médico assistente.",
    evidence: "nódulo espiculado de 2,4 cm no lobo superior direito",
    timeline: [
      { label: "Detectado", offset_hours: 0 },
      { label: "Notificado", offset_hours: 0 },
    ],
  },
  {
    id: "c2",
    finding_name: "Hemorragia subaracnóidea",
    urgency: "urgent",
    confidence: "alta",
    current_target: "Plantão de neurocirurgia",
    time_remaining_hours: 5 + 10 / 60,
    flagged_by_radiologist: true,
    status: "notified",
    times_escalated: 0,
    modality: "TC de crânio",
    radiologist: "Dr. Caio Ribeiro",
    requesting_physician: "Dra. Silvia Nogueira",
    _chain: ["Plantão de neurocirurgia", "Coordenação do pronto-socorro"],
    _step: 0,
    report_text:
      "TC de crânio sem contraste. Hiperdensidade espontânea nos sulcos da convexidade, compatível com hemorragia subaracnóidea aguda. O sistema ventricular tem dimensões preservadas e não há desvio da linha média. Não se identifica coleção extra-axial de maior volume neste estudo.\n\nConclusão: hemorragia subaracnóidea. O plantão de neurocirurgia precisa tomar ciência ainda neste turno.",
    evidence: "hemorragia subaracnóidea aguda",
    timeline: [
      { label: "Detectado", offset_hours: 0 },
      { label: "Notificado", offset_hours: 0 },
    ],
  },
  {
    id: "c3",
    finding_name: "Lesão óssea a esclarecer",
    urgency: "actionable",
    confidence: "media",
    current_target: "Dr. Ricardo Alves",
    time_remaining_hours: 30,
    flagged_by_radiologist: true,
    status: "detected",
    times_escalated: 0,
    modality: "Radiografia de joelho",
    radiologist: "Dra. Helena Costa",
    requesting_physician: "Dr. Ricardo Alves",
    _chain: ["Dr. Ricardo Alves", "Ortopedia"],
    _step: 0,
    report_text:
      "Radiografia de joelho em duas incidências. Lesão lítica na metáfise distal do fêmur, de limites parcialmente definidos, sem reação periosteal evidente neste exame. Não há traço de fratura. As demais estruturas ósseas visualizadas estão sem alteração grosseira.\n\nConclusão: lesão a esclarecer com ressonância e avaliação da ortopedia, sem caráter imediato.",
    evidence: "Lesão lítica na metáfise distal do fêmur",
    timeline: [{ label: "Detectado", offset_hours: 0 }],
  },
  {
    id: "c4",
    finding_name: "Massa renal indeterminada",
    urgency: "urgent",
    confidence: "baixa",
    current_target: "Dra. Marina Lopes",
    time_remaining_hours: 18,
    flagged_by_radiologist: false,
    status: "detected",
    times_escalated: 0,
    modality: "TC de abdome",
    radiologist: "Dr. Caio Ribeiro",
    requesting_physician: "Dra. Marina Lopes",
    _chain: ["Dra. Marina Lopes", "Urologia"],
    _step: 0,
    report_text:
      "TC de abdome com contraste. Rim esquerdo com formação expansiva no polo superior, medindo cerca de 3,8 cm, de contornos lobulados. O rim direito é habitual. Não há dilatação da via excretora.\n\nConclusão: formação renal a caracterizar. O laudo ainda não foi sinalizado pelo radiologista para a fila de achados críticos.",
    evidence: "realce heterogêneo do polo superior",
    timeline: [{ label: "Detectado", offset_hours: 0 }],
  },
  {
    id: "c5",
    finding_name: "Derrame pleural volumoso",
    urgency: "critical",
    confidence: "alta",
    current_target: "Coordenação do pronto-socorro",
    time_remaining_hours: -2,
    flagged_by_radiologist: true,
    status: "escalated",
    times_escalated: 1,
    modality: "TC de tórax",
    radiologist: "Dra. Ana Luz",
    requesting_physician: "Dr. Paulo Mendes",
    _chain: ["Dr. Paulo Mendes", "Coordenação do pronto-socorro"],
    _step: 1,
    report_text:
      "TC de tórax sem contraste. Derrame pleural volumoso à direita, com desvio do mediastino para a esquerda. O pulmão direito está parcialmente colapsado. Não há pneumotórax neste corte.\n\nConclusão: derrame sob tensão relativa. A coordenação já foi acionada porque o prazo do destinatário anterior se esgotou.",
    evidence: "Derrame pleural volumoso à direita, com desvio do mediastino",
    timeline: [
      { label: "Detectado", offset_hours: 0 },
      { label: "Notificado", offset_hours: 0 },
      { label: "Escalado para Coordenação do pronto-socorro", offset_hours: 0 },
    ],
  },
  {
    id: "c6",
    finding_name: "Nódulo de tireoide",
    urgency: "actionable",
    confidence: "media",
    current_target: "Dra. Lúcia Ferreira",
    time_remaining_hours: 29 * 24 + 2,
    flagged_by_radiologist: true,
    status: "notified",
    times_escalated: 0,
    modality: "Ultrassom de tireoide",
    radiologist: "Dra. Helena Costa",
    requesting_physician: "Dra. Lúcia Ferreira",
    _chain: ["Dra. Lúcia Ferreira", "Endocrinologia"],
    _step: 0,
    report_text:
      "Ultrassom de tireoide. Nódulo sólido hipoecoico de 1,1 cm no lobo esquerdo, mais alto do que largo, sem calcificação grosseira. O lobo direito é homogêneo. Não há linfonodo cervical suspeito neste estudo.\n\nConclusão: nódulo a acompanhar. Pode seguir no fluxo ambulatorial da endocrinologia.",
    evidence: "Nódulo sólido hipoecoico de 1,1 cm no lobo esquerdo",
    timeline: [
      { label: "Detectado", offset_hours: 0 },
      { label: "Notificado", offset_hours: 0 },
    ],
  },
];

let clock = 0;
let cases = structuredClone(SEED);
let readSamples = [4, 6.5, 2];

function delay(ms = 180) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function publicCase(item, detail) {
  const base = {
    id: item.id,
    finding_name: item.finding_name,
    urgency: item.urgency,
    current_target: item.current_target,
    time_remaining_hours: item.time_remaining_hours,
    flagged_by_radiologist: item.flagged_by_radiologist,
    status: item.status,
    times_escalated: item.times_escalated,
  };
  if (!detail) return base;
  return {
    ...base,
    confidence: item.confidence,
    modality: item.modality,
    radiologist: item.radiologist,
    requesting_physician: item.requesting_physician,
    report_text: item.report_text,
    evidence: item.evidence,
    timeline: item.timeline.map((event) => ({ ...event })),
  };
}

function openCases() {
  return cases.filter((item) => item.status !== "closed");
}

function statsOf() {
  const open = openCases();
  const average =
    readSamples.reduce((sum, value) => sum + value, 0) / readSamples.length;
  return {
    open: open.length,
    critical: open.filter((item) => item.urgency === "critical").length,
    escalated: open.filter((item) => item.times_escalated > 0).length,
    avg_time_to_read_hours: average,
  };
}

function escalate(item, escalatedIds) {
  let changed = false;
  while (
    item.status !== "closed" &&
    item.time_remaining_hours <= 0 &&
    item._step < item._chain.length - 1
  ) {
    const deficit = -item.time_remaining_hours;
    item._step += 1;
    item.current_target = item._chain[item._step];
    item.time_remaining_hours = 6 - deficit;
    item.times_escalated += 1;
    if (item.status === "detected" || item.status === "notified") {
      item.status = "escalated";
    }
    item.timeline.push({
      label: `Escalado para ${item.current_target}`,
      offset_hours: clock,
    });
    changed = true;
  }
  if (changed) escalatedIds.push(item.id);
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  if (!response.ok) {
    let message = "A ação não foi registrada.";
    try {
      const body = await response.json();
      if (body && body.message) message = body.message;
    } catch {
      /* mantém a mensagem padrão */
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function getStats() {
  if (!USE_MOCK) return request("/stats");
  await delay();
  return statsOf();
}

export async function getCases(view) {
  if (!USE_MOCK) return request(`/cases?view=${view}`);
  await delay();
  const list =
    view === "unflagged"
      ? openCases().filter((item) => !item.flagged_by_radiologist)
      : openCases();
  return list.map((item) => publicCase(item, false));
}

export async function getCase(id) {
  if (!USE_MOCK) return request(`/cases/${id}`);
  await delay(80);
  const item = cases.find((entry) => entry.id === id);
  if (!item) throw new Error("Caso não encontrado.");
  return publicCase(item, true);
}

export async function confirmRead(id) {
  if (!USE_MOCK) return request(`/cases/${id}/read`, { method: "POST" });
  await delay();
  const item = cases.find((entry) => entry.id === id);
  if (!item) throw new Error("Caso não encontrado.");
  if (item.status === "closed") throw new Error("O caso já está fechado.");
  if (item.status === "read" || item.status === "action_recorded") {
    throw new Error("A leitura já foi confirmada.");
  }
  item.status = "read";
  readSamples.push(Math.max(clock, 0.5));
  item.timeline.push({ label: "Leitura confirmada", offset_hours: clock });
  return publicCase(item, true);
}

export async function registerAction(id, text) {
  if (!USE_MOCK) {
    return request(`/cases/${id}/actions`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }
  await delay();
  const item = cases.find((entry) => entry.id === id);
  if (!item) throw new Error("Caso não encontrado.");
  if (item.status === "closed") throw new Error("O caso já está fechado.");
  if (item.status !== "read" && item.status !== "action_recorded") {
    throw new Error("Confirme a leitura antes.");
  }
  const note = (text || "").trim();
  if (!note) throw new Error("Descreva a ação.");
  item.status = "action_recorded";
  item.timeline.push({ label: "Ação registrada", offset_hours: clock, note });
  return publicCase(item, true);
}

export async function closeCase(id) {
  if (!USE_MOCK) return request(`/cases/${id}/close`, { method: "POST" });
  await delay();
  const item = cases.find((entry) => entry.id === id);
  if (!item) throw new Error("Caso não encontrado.");
  if (item.status === "closed") throw new Error("O caso já está fechado.");
  if (item.status !== "action_recorded") throw new Error("Registre a ação antes.");
  item.status = "closed";
  item.timeline.push({ label: "Caso fechado", offset_hours: clock });
  return publicCase(item, true);
}

export async function getClock() {
  if (!USE_MOCK) return request("/simulation");
  return { offset_hours: clock };
}

export async function advanceClock(hours) {
  if (!USE_MOCK) {
    return request("/simulation/advance", {
      method: "POST",
      body: JSON.stringify({ hours }),
    });
  }
  await delay(120);
  clock += hours;
  const escalatedIds = [];
  for (const item of cases) {
    if (item.status === "closed") continue;
    item.time_remaining_hours -= hours;
    escalate(item, escalatedIds);
  }
  return { offset_hours: clock, escalated_ids: escalatedIds };
}

export async function resetDemo() {
  if (!USE_MOCK) return request("/simulation/reset", { method: "POST" });
  await delay(120);
  clock = 0;
  cases = structuredClone(SEED);
  readSamples = [4, 6.5, 2];
  return { offset_hours: clock, escalated_ids: [] };
}

export { NETWORK_ERROR };
