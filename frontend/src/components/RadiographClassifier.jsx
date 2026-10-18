import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Upload } from "lucide-react";
import "../styles/classifier.css";
import { classifyUploadedRadiograph } from "../radiographApi.js";

const LABELS = [
  "Atelectasis",
  "Cardiomegaly",
  "Effusion",
  "Infiltration",
  "Mass",
  "Nodule",
  "Pneumonia",
  "Pneumothorax",
  "Consolidation",
  "Edema",
  "Emphysema",
  "Fibrosis",
  "Pleural_Thickening",
  "Hernia",
];
const PT = {
  Atelectasis: "Atelectasia",
  Cardiomegaly: "Cardiomegalia",
  Effusion: "Derrame pleural",
  Infiltration: "Infiltração",
  Mass: "Massa",
  Nodule: "Nódulo",
  Pneumonia: "Pneumonia",
  Pneumothorax: "Pneumotórax",
  Consolidation: "Consolidação",
  Edema: "Edema",
  Emphysema: "Enfisema",
  Fibrosis: "Fibrose",
  Pleural_Thickening: "Espessamento pleural",
  Hernia: "Hérnia",
};

async function readError(response) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.detail === "string"
    ? payload.detail
    : "Não foi possível concluir a solicitação.";
}

export default function RadiographClassifier() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function classify(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await classifyUploadedRadiograph(file));
    } catch (caught) {
      setError(caught.message || "Falha ao classificar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="classifier-page">
      <div className="classifier-top">
        <Link to="/" className="classifier-back">
          <ArrowLeft size={17} /> Voltar ao Brightline
        </Link>
        <Link to="/radiografias">Abrir catálogo NIH</Link>
        <span>Brightline · demonstração</span>
      </div>
      <section className="classifier-card">
        <div className="classifier-heading">
          <span className="classifier-icon">
            <Activity size={22} />
          </span>
          <div>
            <p className="classifier-eyebrow">MODELO NIH CHESTX-RAY14</p>
            <h1>Classificar radiografia</h1>
            <p>
              Envie uma radiografia de tórax em PNG ou JPEG para obter
              probabilidades exploratórias.
            </p>
          </div>
        </div>
        <form className="classifier-form" onSubmit={classify}>
          <label className="classifier-upload">
            <Upload size={20} />
            <span>
              {file ? file.name : "Escolha uma radiografia PNG ou JPEG"}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
            />
          </label>
          {file && (
            <img
              className="classifier-preview"
              src={preview}
              alt="Prévia da radiografia selecionada"
            />
          )}
          <button className="classifier-button" disabled={busy || !file}>
            {busy ? "Analisando…" : "Classificar imagem"}
          </button>
        </form>
        {error && (
          <p className="classifier-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <section className="classifier-results" aria-live="polite">
            <h2>Probabilidades do modelo</h2>
            <p>
              As probabilidades não são diagnósticos. Todas as imagens e classes
              precisam de revisão profissional.
            </p>
            {LABELS.map((label) => (
              <div className="classifier-score" key={label}>
                <span>{PT[label]}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max(0, Math.min(100, result.probabilities[label] * 100))}%`,
                    }}
                  />
                </div>
                <strong>
                  {(result.probabilities[label] * 100).toFixed(1)}%
                </strong>
              </div>
            ))}
            <small>
              Modelo: {result.model_version} · Corte exploratório:{" "}
              {(result.threshold * 100).toFixed(0)}%
            </small>
            {result.model_metadata && (
              <p>
                <small>
                  TorchXRayVision{" "}
                  {result.model_metadata.torchxrayvision_version} · Pesos:{" "}
                  {result.model_metadata.weights}
                </small>
              </p>
            )}
            <p>
              {result.predictions.length
                ? `Classes acima do corte exploratório: ${result.predictions.map((label) => PT[label] || label).join(", ")}.`
                : "Nenhuma classe atingiu o corte exploratório. Isso não significa ausência de alterações."}
            </p>
          </section>
        )}
      </section>
      <p className="classifier-disclaimer">
        Ferramenta experimental treinada em ChestX-ray14. Não substitui
        avaliação médica nem deve orientar decisões clínicas.
      </p>
    </main>
  );
}
