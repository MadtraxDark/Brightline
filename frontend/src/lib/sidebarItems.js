import { selectLanes, selectMissed, selectNextDeadline } from "../store/selectors.js";
import { buildSearch } from "./viewState.js";

const PRIORITY = [
  ["critical", "Crítico"],
  ["urgent", "Urgente"],
  ["actionable", "Acionável"],
  ["noAlert", "Sem alerta"],
];

function missedCount(state) {
  if (!Array.isArray(state?.cases)) return 0;
  return selectMissed(state).length;
}

export function buildSidebarItems(state) {
  const safe = state ?? {};
  const lanes = selectLanes(safe);
  const open = lanes.critical.open + lanes.urgent.open + lanes.actionable.open;
  return {
    sections: [
      {
        id: "reports",
        label: "Gestão de laudos",
        items: [
          { id: "overview", label: "Visão geral", count: open, to: "/home" },
          { id: "missed", label: "Não sinalizados", count: missedCount(safe), to: "/nao-sinalizados" },
        ],
      },
      {
        id: "priority",
        label: "Por prioridade",
        items: PRIORITY.map(([id, label]) => ({
          id,
          label,
          count: id === "noAlert" ? lanes.noAlert.count : lanes[id].open,
          to: `/home${buildSearch({ lane: id, showResolved: false })}`,
        })),
      },
      {
        id: "quality",
        label: "Qualidade da IA",
        items: [{ id: "evaluation", label: "Avaliação da IA", count: null, to: "/avaliacao" }],
      },
    ],
    next: buildNextDeadlineCard(safe),
  };
}

export function buildNextDeadlineCard(state) {
  const next = selectNextDeadline(state);
  if (!next) return null;
  const item = Array.isArray(state?.cases) ? state.cases.find((entry) => entry.id === next.id) : null;
  const escalation = item?.status === "escalated" ? `Escalado · nível ${item.escalation_level}` : null;
  return { ...next, escalation };
}
