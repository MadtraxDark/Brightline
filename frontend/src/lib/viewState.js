const URL_LANES = {
  critical: "critical",
  urgent: "urgent",
  actionable: "actionable",
  "sem-alerta": "noAlert",
};

const LANE_URL = {
  critical: "critical",
  urgent: "urgent",
  actionable: "actionable",
  noAlert: "sem-alerta",
};

export function parseView(search) {
  const params = new URLSearchParams(String(search ?? "").replace(/^\?/, ""));
  const raw = params.get("prioridade");
  if (raw != null && !Object.hasOwn(URL_LANES, raw)) return { lane: "all", showResolved: false };
  return {
    lane: raw == null ? "all" : URL_LANES[raw],
    showResolved: params.get("resolvidos") === "1",
  };
}

export function buildSearch(view) {
  const params = new URLSearchParams();
  const lane = LANE_URL[view?.lane];
  if (lane) params.set("prioridade", lane);
  if (view?.showResolved) params.set("resolvidos", "1");
  const text = params.toString();
  return text ? `?${text}` : "";
}
