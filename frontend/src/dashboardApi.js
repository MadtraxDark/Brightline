import * as api from "./api.js";

// Adapt the local engine's contract to the dashboard's presentation fields.
function dashboardCase(item) {
  return {
    ...item,
    finding_name: item.finding,
    requesting_physician: item.ordering_physician,
    report_text: item.text,
    confidence:
      { high: "alta", medium: "media", low: "baixa" }[item.confidence] ??
      item.confidence,
    status: item.status === "action_taken" ? "action_recorded" : item.status,
    timeline: item.events.map(({ at, ...event }) => ({
      ...event,
      offset_hours: at,
    })),
  };
}

export const NETWORK_ERROR =
  "Não foi possível carregar os dados da demonstração. Tente novamente.";

export async function getCases(view = "queue") {
  const cases =
    view === "unflagged" ? await api.listMissed() : await api.listCases();
  return cases.map(dashboardCase);
}

export async function getCase(id) {
  const detail = await api.getCase(id);
  return dashboardCase(detail.case);
}

export async function getStats() {
  const stats = await api.getStats();
  return {
    open: Object.entries(stats.status).reduce(
      (sum, [status, count]) => (status === "closed" ? sum : sum + count),
      0,
    ),
    critical: stats.urgency.critical,
    escalated: stats.status.escalated,
    avg_time_to_read_hours: stats.avg_time_to_read_hours,
  };
}

export const confirmRead = (id) =>
  api.acknowledge(id, "Profissional demonstrador");
export const registerAction = (id, text) => api.registerAction(id, text, false);
export const closeCase = (id) => api.registerAction(id, "", true);
