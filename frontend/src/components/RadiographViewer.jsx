import { useState } from "react";
import {
  pathologyColor,
  validLocalizationMarkers,
} from "../lib/pathologyColors.js";

export default function RadiographViewer({
  src,
  alt,
  markers = [],
  heatmap,
  activePathology,
  onSelectPathology,
  onHoverPathology,
}) {
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const validMarkers = validLocalizationMarkers({ markers });
  return (
    <div className="radiograph-viewer">
      <div className="radiograph-viewer-controls">
        <label>
          <input
            type="checkbox"
            checked={showMarkers}
            onChange={(event) => setShowMarkers(event.target.checked)}
          />{" "}
          Marcadores estimados
        </label>
        {heatmap && (
          <label>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(event) => setShowHeatmap(event.target.checked)}
            />{" "}
            Heatmap
          </label>
        )}
      </div>
      <div className="radiograph-viewer-image">
        <img className="classifier-preview" src={src} alt={alt} />
        {showHeatmap && heatmap && (
          <img
            className="radiograph-heatmap"
            src={heatmap}
            alt="Mapa Grad-CAM estimado"
          />
        )}
        {showMarkers &&
          validMarkers.map((marker) => (
            <button
              key={marker.pathology}
              type="button"
              className={`radiograph-marker${activePathology === marker.pathology ? " is-active" : ""}`}
              style={{
                left: `${marker.x * 100}%`,
                top: `${marker.y * 100}%`,
                "--pathology-color": pathologyColor(marker.pathology),
              }}
              onMouseEnter={() => onHoverPathology?.(marker.pathology)}
              onMouseLeave={() => onHoverPathology?.(null)}
              onFocus={() => onHoverPathology?.(marker.pathology)}
              onBlur={() => onHoverPathology?.(null)}
              onClick={() => onSelectPathology?.(marker.pathology)}
              title={`${marker.pathology} · escore do modelo ${(marker.score * 100).toFixed(1)}% · localização estimada`}
              aria-label={`${marker.pathology}, localização estimada`}
            >
              <span>
                {marker.pathology} · escore {(marker.score * 100).toFixed(1)}% ·
                estimativa
              </span>
            </button>
          ))}
      </div>
      {validMarkers.length > 0 && (
        <small>
          Grad-CAM estima regiões que influenciaram o classificador; não
          confirma lesões.
        </small>
      )}
      {showMarkers && validMarkers.length === 0 && (
        <small>
          Nenhuma região pôde ser localizada com confiança suficiente. As
          classificações continuam disponíveis.
        </small>
      )}
    </div>
  );
}
