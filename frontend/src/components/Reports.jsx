import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  X,
  ArrowUpRight,
  TriangleAlert,
  CheckCircle2,
  UploadCloud,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { useStore } from "../store/useStore.js";
import { authorizedRequest } from "../lib/session.js";
import { refreshWorkspace } from "../api.js";
import PhysicianSelect from "./PhysicianSelect.jsx";
import PhysicianAvatar from "./PhysicianAvatar.jsx";
import ExamViewer from "./ExamViewer.jsx";
import { classificationConfidence } from "../lib/classificationConfidence.js";
import luna from "../assets/luna.png";

function ReportClassification({ report, cases, classified }) {
  const findings = cases.filter((item) => item.report_id === report.report_id);
  return classified ? (
    <div className="report-confidence-summary">
      <span className="report-classified-label">
        <CheckCircle2 size={14} aria-hidden="true" />
        Classificado pela Luna
      </span>
      <div>
        {findings.map((item) => {
          const confidence = classificationConfidence(item);
          return (
            <span
              key={item.id}
              title={item.finding}
              className={`classification-confidence is-${confidence.tone}`}
            >
              {confidence.label}
            </span>
          );
        })}
      </div>
      {findings.some((item) => item.confidence_is_example) && (
        <small>Percentual simulado</small>
      )}
      {!findings.length && <small>Percentual não disponível</small>}
    </div>
  ) : (
    <div className="report-unclassified-alert">
      <TriangleAlert size={17} aria-hidden="true" />
      <span>
        Sem classificação<small>Análise da Luna não registrada</small>
      </span>
    </div>
  );
}

const blank = {
  report_id: "",
  modality: "",
  radiologist: "",
  ordering_physician: "",
  text: "",
  classify: false,
};
export default function Reports() {
  const reports = useStore((state) => state.reports),
    cases = useStore((state) => state.cases);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [form, setForm] = useState(blank),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(null);
  const [radiograph, setRadiograph] = useState(null),
    [imagePreview, setImagePreview] = useState(""),
    [fileError, setFileError] = useState("");
  const fileInput = useRef(null),
    uploaded = useRef(null);
  useEffect(() => {
    if (!radiograph) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(radiograph);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [radiograph]);
  function selectImage(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setFileError("Escolha uma imagem PNG ou JPEG.");
      return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      setFileError("A imagem deve ter entre 1 byte e 10 MB.");
      return;
    }
    setFileError("");
    setRadiograph(file);
    uploaded.current = null;
  }
  const dialog = useRef(null),
    detail = useRef(null),
    overflow = useRef("");
  const physicians = useMemo(
    () =>
      [
        ...new Set(
          reports
            .flatMap((r) => [r.radiologist, r.ordering_physician])
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [reports],
  );
  const fold = (value) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const classified = (report) =>
    report.classified === true ||
    cases.some((item) => item.report_id === report.report_id);
  const visible = reports.filter(
    (report) =>
      fold(
        `${report.report_id} ${report.modality} ${report.radiologist} ${report.ordering_physician}`,
      ).includes(fold(query.trim())) &&
      (filter === "all" ||
        (filter === "classified" ? classified(report) : !classified(report))),
  );
  function open(node) {
    overflow.current = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
  }
  function close(node) {
    if (!pending) node.close();
  }
  const set = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const payload = {
        ...form,
        report_id: form.report_id.trim(),
        modality: form.modality.trim(),
        text: form.text.trim(),
        flagged_by_radiologist: false,
      };
      if (!payload.report_id || !payload.modality || !payload.text)
        throw Error("Preencha nome, exame e texto do laudo.");
      if (!payload.radiologist || !payload.ordering_physician)
        throw Error("Selecione o radiologista e o médico solicitante.");
      if (fileError) throw Error(fileError);
      if (radiograph) {
        if (!uploaded.current)
          uploaded.current = await authorizedRequest("/files", {
            method: "POST",
            body: radiograph,
            timeoutMs: 60000,
          });
        payload.image_file_id = uploaded.current.file_id;
      }
      const result = await authorizedRequest("/reports", {
        method: "POST",
        body: payload,
        timeoutMs: 60000,
      });
      try {
        await refreshWorkspace();
      } catch {
        setNotice("Laudo salvo. Atualize a página para recarregar a lista.");
        dialog.current.close();
        return;
      }
      setNotice(
        result.classified
          ? "Laudo salvo e classificação concluída."
          : "Laudo salvo sem classificação da Luna.",
      );
      dialog.current.close();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="reports-page">
      <header className="reports-heading">
        <div>
          <h1>Laudos</h1>
          <p>Documentos, profissionais e classificações em um só lugar.</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            setForm(blank);
            setError("");
            setRadiograph(null);
            setFileError("");
            uploaded.current = null;
            open(dialog.current);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Adicionar laudo
        </button>
      </header>
      <div className="reports-overview">
        <span>
          <strong>{reports.length}</strong> documentos cadastrados
        </span>
        <span>
          <strong>{reports.filter(classified).length}</strong> classificados
        </span>
        <span>
          <strong>{reports.filter((r) => !classified(r)).length}</strong> sem
          classificação
        </span>
      </div>
      <div className="reports-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar laudo, exame ou médico…"
            aria-label="Buscar laudos"
          />
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filtrar classificação"
        >
          <option value="all">Todos os laudos</option>
          <option value="classified">Classificados</option>
          <option value="unclassified">Sem classificação</option>
        </select>
      </div>
      {notice && (
        <p role="status" className="reports-notice">
          {notice}
        </p>
      )}
      <div className="reports-grid">
        {visible.map((report) => (
          <article className="report-library-card" key={report.report_id}>
            <header>
              <span className="document-icon">
                <FileText size={23} />
              </span>
              <ReportClassification
                report={report}
                cases={cases}
                classified={classified(report)}
              />
            </header>
            <h2>{report.report_id}</h2>
            <span className="report-library-exam">{report.modality}</span>
            <p className="report-library-excerpt">{report.text}</p>
            <dl>
              {[
                ["Radiologista", report.radiologist],
                ["Solicitante", report.ordering_physician],
              ].map(([label, name]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <PhysicianAvatar name={name} />
                    <span>{name || "Não informado"}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className="report-library-open"
              onClick={() => {
                setPreview(report);
                open(detail.current);
              }}
            >
              Visualizar laudo
              <ArrowUpRight size={17} />
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="state-block empty">
          <FileText size={30} />
          <h2>
            {reports.length
              ? "Nenhum laudo encontrado"
              : "Seu acervo começa aqui"}
          </h2>
          <p>
            {reports.length
              ? "Ajuste a busca ou o filtro de classificação."
              : "Adicione o primeiro documento para organizar seus laudos."}
          </p>
        </div>
      )}
      <dialog
        className="report-form-dialog"
        ref={dialog}
        aria-labelledby="new-report-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => {
          document.body.style.overflow = overflow.current;
        }}
      >
        <header>
          <div>
            <h2 id="new-report-title">Adicionar laudo</h2>
            <p>Preencha os dados do documento e selecione os profissionais.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar cadastro de laudo"
            disabled={pending}
            onClick={() => close(dialog.current)}
          >
            <X size={22} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="report-form-grid">
            <label>
              Nome do laudo
              <input
                required
                maxLength={100}
                value={form.report_id}
                disabled={pending}
                onChange={(e) => set("report_id", e.target.value)}
                placeholder="Ex.: Radiografia de tórax — paciente 104"
              />
            </label>
            <label>
              Exame
              <input
                required
                maxLength={150}
                value={form.modality}
                disabled={pending}
                onChange={(e) => set("modality", e.target.value)}
                placeholder="Ex.: Radiografia de tórax"
              />
            </label>
            {[
              ["radiologist", "Radiologista"],
              ["ordering_physician", "Médico solicitante"],
            ].map(([key, label]) => (
              <PhysicianSelect
                key={key}
                label={label}
                value={form[key]}
                disabled={pending}
                options={physicians}
                onChange={(value) => set(key, value)}
              />
            ))}
          </div>
          <label className="report-text-label">
            Texto do laudo
            <textarea
              required
              maxLength={100000}
              rows={6}
              value={form.text}
              disabled={pending}
              onChange={(e) => set("text", e.target.value)}
              placeholder="Insira o conteúdo completo do laudo…"
            />
          </label>
          <section
            className="report-upload"
            aria-labelledby="report-upload-title"
          >
            <div className="report-upload-heading">
              <h3 id="report-upload-title">Imagem do exame</h3>
              <span>Opcional · PNG ou JPEG · Até 10 MB</span>
            </div>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg"
              disabled={pending}
              aria-label="Selecionar radiografia"
              onChange={(event) => {
                selectImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {radiograph ? (
              <div className="report-upload-preview">
                <img
                  src={imagePreview}
                  alt="Prévia da radiografia selecionada"
                />
                <div>
                  <strong>{radiograph.name}</strong>
                  <span>
                    {(radiograph.size / 1024 / 1024).toFixed(2)} MB · Pronta
                    para enviar
                  </span>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  disabled={pending}
                  aria-label="Remover radiografia"
                  onClick={() => {
                    setRadiograph(null);
                    setFileError("");
                    uploaded.current = null;
                  }}
                >
                  <Trash2 size={19} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="report-upload-dropzone"
                disabled={pending}
                onClick={() => fileInput.current.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!pending) selectImage(event.dataTransfer.files[0]);
                }}
              >
                <span className="report-upload-symbol">
                  <ImagePlus size={25} />
                </span>
                <strong>Arraste a radiografia para cá</strong>
                <span>ou clique para selecionar o arquivo</span>
                <span className="report-upload-action">
                  <UploadCloud size={16} />
                  Selecionar imagem
                </span>
              </button>
            )}
            {fileError && (
              <p className="form-error" role="alert">
                {fileError}
              </p>
            )}
          </section>
          <label className="report-luna-option">
            <img src={luna} width={40} height={40} alt="" />
            <span>
              <strong>Solicitar classificação da Luna</strong>
              <small>
                {form.classify
                  ? "A Luna analisará o texto antes de concluir o cadastro."
                  : "O documento será salvo sem análise automática."}
              </small>
            </span>
            <input
              type="checkbox"
              checked={form.classify}
              disabled={pending}
              onChange={(e) => set("classify", e.target.checked)}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <footer>
            <button
              className="btn-secondary"
              type="button"
              disabled={pending}
              onClick={() => close(dialog.current)}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              type="submit"
              disabled={pending || !physicians.length}
            >
              {pending
                ? form.classify
                  ? "Classificando e salvando…"
                  : "Salvando…"
                : form.classify
                  ? "Salvar e classificar"
                  : "Salvar laudo"}
            </button>
          </footer>
          {!physicians.length && (
            <p className="hint">
              É necessário ter médicos associados para cadastrar um laudo.
            </p>
          )}
        </form>
      </dialog>
      <dialog
        ref={detail}
        className="report-preview-dialog report-preview-rich"
        aria-label="Documento do laudo"
        onClose={() => {
          document.body.style.overflow = overflow.current;
        }}
      >
        {preview && (
          <>
            <header>
              <div>
                <h2>{preview.report_id}</h2>
                <p>{preview.modality}</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar documento"
                onClick={() => detail.current.close()}
              >
                <X size={22} />
              </button>
            </header>
            <div className="report-preview-layout">
              <section className="report-preview-content">
                <dl>
                  {[
                    ["Radiologista", preview.radiologist],
                    ["Médico solicitante", preview.ordering_physician],
                  ].map(([label, name]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <PhysicianAvatar name={name} />
                        <span>{name || "Não informado"}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="report-preview-classification">
                  <ReportClassification
                    report={preview}
                    cases={cases}
                    classified={classified(preview)}
                  />
                </div>
                <h3>Laudo radiológico</h3>
                <p>{preview.text}</p>
                {cases
                  .filter((item) => item.report_id === preview.report_id)
                  .map((item) => (
                    <Link
                      className="report-preview-case"
                      to={`/caso/${item.id}`}
                      key={item.id}
                      onClick={() => detail.current.close()}
                    >
                      <span>{item.finding}</span>Ver acompanhamento
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
              </section>
              <ExamViewer
                key={preview.report_id}
                report={preview}
                modality={preview.modality}
                item={cases.find(
                  (item) => item.report_id === preview.report_id,
                )}
              />
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
