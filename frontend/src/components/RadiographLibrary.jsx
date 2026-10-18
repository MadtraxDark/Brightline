import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Image } from "lucide-react";
import {
  classifyRadiographById,
  getRadiographAnalysis,
  getRadiographImageUrl,
  listRadiographs,
} from "../radiographApi.js";
import "../styles/classifier.css";

const PAGE_SIZE = 24;
const PATHOLOGIES = [
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

export default function RadiographLibrary() {
  const [filterType, setFilterType] = useState("pathology");
  const [filterLabel, setFilterLabel] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadPage = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setPage(
        await listRadiographs({
          offset,
          limit: PAGE_SIZE,
          pathology: filterType === "pathology" ? filterLabel : "",
          classification: filterType === "classification" ? filterLabel : "",
        }),
      );
    } catch (caught) {
      setError(caught.message || "Não foi possível carregar o catálogo.");
    } finally {
      setBusy(false);
    }
  }, [offset, filterType, filterLabel]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function chooseImage(item) {
    setSelected(item);
    setAnalysis(null);
    setImageUrl("");
    setError("");
    try {
      const [url, savedAnalysis] = await Promise.all([
        getRadiographImageUrl(item.id),
        getRadiographAnalysis(item.id).catch(() => null),
      ]);
      setImageUrl(url);
      setAnalysis(savedAnalysis);
    } catch (caught) {
      setError(caught.message || "Não foi possível abrir a imagem.");
    }
  }

  async function classifySelected() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setAnalysis(await classifyRadiographById(selected.id));
      await loadPage();
    } catch (caught) {
      setError(caught.message || "Não foi possível classificar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="classifier-page">
      <div className="classifier-top">
        <Link to="/home" className="classifier-back">
          <ArrowLeft size={17} /> Voltar ao painel
        </Link>
        <Link to="/classificar">Enviar uma radiografia</Link>
      </div>
      <section className="classifier-card">
        <div className="classifier-heading">
          <span className="classifier-icon">
            <Image size={22} />
          </span>
          <div>
            <p className="classifier-eyebrow">NIH CHESTX-RAY14</p>
            <h1>Catálogo de radiografias</h1>
            <p>
              Metadados e arquivos são carregados pela API autenticada. Os
              rótulos são anotações do dataset.
            </p>
          </div>
        </div>
        <div className="library-controls">
          <label htmlFor="radiograph-filter-type">Tipo de filtro</label>
          <select
            id="radiograph-filter-type"
            value={filterType}
            onChange={(event) => {
              setFilterType(event.target.value);
              setFilterLabel("");
              setOffset(0);
            }}
          >
            <option value="pathology">Rótulo NIH</option>
            <option value="classification">Previsão salva</option>
          </select>
          <label htmlFor="radiograph-filter-label">Classe</label>
          <select
            id="radiograph-filter-label"
            value={filterLabel}
            onChange={(event) => {
              setFilterLabel(event.target.value);
              setOffset(0);
            }}
          >
            <option value="">Todas</option>
            {PATHOLOGIES.map((label) => (
              <option key={label} value={label}>
                {label.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <span>
            {page ? `${page.pagination.total} imagens` : "Carregando…"}
          </span>
        </div>
        {error && (
          <p className="classifier-error" role="alert">
            {error}
          </p>
        )}
        <div className="radiograph-library">
          <div className="radiograph-grid" aria-busy={busy}>
            {page?.items.map((item) => (
              <button
                type="button"
                className={`radiograph-item${selected?.id === item.id ? " is-selected" : ""}`}
                key={item.id}
                onClick={() => chooseImage(item)}
              >
                <strong>{item.id}</strong>
                <span>{item.patient_id}</span>
                <small>{item.finding_labels.join(", ") || "Sem rótulos"}</small>
                {item.has_analysis && <em>Análise salva</em>}
              </button>
            ))}
            {!busy && page?.items.length === 0 && (
              <p>Nenhuma imagem corresponde ao filtro.</p>
            )}
          </div>
          <nav
            className="library-pagination"
            aria-label="Paginação do catálogo"
          >
            <button
              type="button"
              disabled={offset === 0 || busy}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft size={17} /> Anterior
            </button>
            <span>
              {page
                ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, page.pagination.total)}`
                : "—"}
            </span>
            <button
              type="button"
              disabled={!page?.pagination.next_offset || busy}
              onClick={() => setOffset(page.pagination.next_offset)}
            >
              Próxima <ChevronRight size={17} />
            </button>
          </nav>
        </div>
        {selected && (
          <section className="radiograph-detail" aria-live="polite">
            <div>
              <h2>{selected.id}</h2>
              <p>
                Rótulos NIH: {selected.finding_labels.join(", ") || "nenhum"}
              </p>
            </div>
            {imageUrl && (
              <img
                className="classifier-preview"
                src={imageUrl}
                alt={`Radiografia ${selected.id}`}
              />
            )}
            <button
              className="classifier-button"
              type="button"
              disabled={busy}
              onClick={classifySelected}
            >
              {busy ? "Analisando…" : "Executar e salvar análise exploratória"}
            </button>
            {analysis && (
              <div className="classifier-results">
                <h3>Probabilidades exploratórias</h3>
                {Object.entries(analysis.probabilities).map(
                  ([label, score]) => (
                    <p key={label}>
                      {label}: {(score * 100).toFixed(1)}%
                    </p>
                  ),
                )}
                <p>
                  Modelo {analysis.model_version}. Revisão profissional
                  obrigatória; resultado não diagnóstico.
                </p>
              </div>
            )}
          </section>
        )}
      </section>
      <p className="classifier-disclaimer">
        As previsões são experimentais, não são diagnósticos e exigem revisão
        por profissional qualificado.
      </p>
    </main>
  );
}
