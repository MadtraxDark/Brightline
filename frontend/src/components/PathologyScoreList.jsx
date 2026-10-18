import {
  pathologyColor,
  validLocalizationMarkers,
  visiblePathologyScores,
} from "../lib/pathologyColors.js";

export default function PathologyScoreList({
  probabilities,
  markers,
  labels,
  formatLabel = (label) => label.replaceAll("_", " "),
  activePathology,
  onSelectPathology,
  onHoverPathology,
  limit = 5,
}) {
  const markerPathologies = new Set(
    validLocalizationMarkers({ markers }).map((marker) => marker.pathology),
  );
  const scores = labels
    ? labels
        .filter((label) => Number.isFinite(probabilities?.[label]))
        .map((label) => [label, probabilities[label]])
    : visiblePathologyScores(probabilities, markers, limit);

  return (
    <div className="pathology-score-list">
      {scores.map(([pathology, score]) => {
        const hasMarker = markerPathologies.has(pathology);
        const content = (
          <>
            {hasMarker && (
              <span
                className="pathology-color-dot"
                aria-hidden="true"
                style={{ backgroundColor: pathologyColor(pathology) }}
              />
            )}
            <span className="pathology-score-label">
              {formatLabel(pathology)}
            </span>
            <strong>{(score * 100).toFixed(1)}%</strong>
          </>
        );

        return hasMarker && onSelectPathology ? (
          <button
            key={pathology}
            className={`pathology-score${activePathology === pathology ? " is-selected" : ""}`}
            type="button"
            aria-pressed={activePathology === pathology}
            onMouseEnter={() => onHoverPathology?.(pathology)}
            onMouseLeave={() => onHoverPathology?.(null)}
            onFocus={() => onHoverPathology?.(pathology)}
            onBlur={() => onHoverPathology?.(null)}
            onClick={() => onSelectPathology(pathology)}
          >
            {content}
          </button>
        ) : (
          <div className="pathology-score" key={pathology}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
