export const PATHOLOGY_COLORS = Object.freeze({
  Atelectasis: "#ef4444",
  Cardiomegaly: "#3b82f6",
  Effusion: "#f59e0b",
  Infiltration: "#a855f7",
  Mass: "#ec4899",
  Nodule: "#06b6d4",
  Pneumonia: "#f97316",
  Pneumothorax: "#22c55e",
  Consolidation: "#eab308",
  Edema: "#14b8a6",
  Emphysema: "#8b5cf6",
  Fibrosis: "#d946ef",
  Pleural_Thickening: "#84cc16",
  Hernia: "#60a5fa",
});

export function pathologyColor(pathology) {
  return PATHOLOGY_COLORS[pathology] ?? "#94a3b8";
}

export function validLocalizationMarkers(analysis) {
  if (!Array.isArray(analysis?.markers)) return [];
  return analysis.markers.filter(
    (marker) =>
      Object.hasOwn(PATHOLOGY_COLORS, marker?.pathology) &&
      Number.isFinite(marker.x) &&
      Number.isFinite(marker.y) &&
      marker.x >= 0 &&
      marker.x <= 1 &&
      marker.y >= 0 &&
      marker.y <= 1 &&
      Number.isFinite(marker.score) &&
      marker.score >= 0 &&
      marker.score <= 1 &&
      marker.localization_method === "gradcam" &&
      marker.localization_status === "estimated",
  );
}

export function visiblePathologyScores(probabilities, markers, limit = 5) {
  const entries = Object.entries(probabilities ?? {})
    .filter(
      ([pathology, score]) =>
        Object.hasOwn(PATHOLOGY_COLORS, pathology) &&
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 1,
    )
    .sort((a, b) => b[1] - a[1]);
  const localized = new Set(
    validLocalizationMarkers({ markers }).map((marker) => marker.pathology),
  );
  return [
    ...entries.slice(0, limit),
    ...entries.filter(([pathology]) => localized.has(pathology)),
  ].filter(
    ([pathology], index, all) =>
      all.findIndex(([candidate]) => candidate === pathology) === index,
  );
}
