import { useState } from "react";
import { FileText, Sparkles, History, ClipboardCheck, ScanLine } from "lucide-react";
import {
  confidenceLabel,
  formatOffset,
  formatRemaining,
  splitEvidence,
  statusLabel,
} from "../format.js";
import UrgencyBadge from "./UrgencyBadge.jsx";

export default function CaseDetail({ caseData, onRead, onRegister, onClose, onUpdated }) {
  const [tab, setTab] = useState("report");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState("");
  const [formError, setFormError] = useState("");

  if (!caseData) {
    return (
      <div className="panel">
        <div className="state-block">
          <p className="empty">Selecione um caso na fila.</p>
        </div>
      </div>
    );
  }

  const closed = caseData.status === "closed";
  const read =
    caseData.status === "read" || caseData.status === "action_recorded" || closed;
  const acted = caseData.status === "action_recorded" || closed;
  const evidence = splitEvidence(caseData.report_text, caseData.evidence);

  async function run(name, action) {
    setPending(name);
    setFormError("");
    try {
      await action();
      if (name === "action") setNote("");
      await onUpdated(caseData.id);
    } catch (error) {
      setFormError(error.message || "A ação não foi registrada.");
    } finally {
      setPending("");
    }
  }

  let readHint = "";
  if (closed) readHint = "O caso já está fechado";
  else if (read) readHint = "A leitura já foi confirmada";

  let actionHint = "";
  if (closed) actionHint = "O caso já está fechado";
  else if (!read) actionHint = "Confirme a leitura antes";
  else if (!note.trim()) actionHint = "Descreva a ação";

  let closeHint = "";
  if (closed) closeHint = "O caso já está fechado";
  else if (!acted) closeHint = "Registre a ação antes";

  return (
    <article className="panel detail" aria-label="Detalhes do caso">
      <div className="detail-topline"><span><FileText size={16} aria-hidden="true" /> Detalhes do achado</span><span>Laudo {caseData.id.toUpperCase().padStart(4, "0")}</span></div>
      <header className="detail-title">
        <h2>{caseData.finding_name}</h2>
        <UrgencyBadge level={caseData.urgency} />
        <p className="confidence">
          Confiança da IA: {confidenceLabel(caseData.confidence)} · Prazo: {formatRemaining(caseData.time_remaining_hours).text}
        </p>
      </header>
      <div className="detail-tabs" role="group" aria-label="Seções do laudo">
        <button type="button" aria-pressed={tab === "report"} onClick={() => setTab("report")}>Laudo</button>
        <button type="button" aria-pressed={tab === "history"} onClick={() => setTab("history")}>Histórico <span className="count">{caseData.timeline.length}</span></button>
        <button type="button" aria-pressed={tab === "action"} onClick={() => setTab("action")}>Conduta</button>
      </div>
      <div hidden={tab !== "report"}>
      <div className="people"><div><span>Exame</span><strong><ScanLine size={15} aria-hidden="true" />{caseData.modality}</strong></div><div><span>Radiologista</span><strong>{caseData.radiologist}</strong></div><div><span>Solicitante</span><strong>{caseData.requesting_physician}</strong></div><div><span>Situação</span><strong>{statusLabel(caseData.status)}</strong></div></div>

      <section className="report-section"><div className="section-heading"><h3><FileText size={17} aria-hidden="true" /> Laudo do exame</h3><span>Trecho em destaque: evidência da IA</span></div>
      <p className="report">
        {evidence.found ? (
          <>
            {evidence.before}
            <mark className="evidence">{evidence.match}</mark>
            {evidence.after}
          </>
        ) : (
          caseData.report_text
        )}
      </p>
      {evidence.found ? null : (
        <p className="missing-evidence">Trecho de evidência não localizado no laudo</p>
      )}
      </section>

      <div className="report-footer"><p><Sparkles size={14} aria-hidden="true" /> A IA sugere. O médico valida.</p><button type="button" className="btn-primary" onClick={() => setTab("action")}>Revisar conduta</button></div>
      </div>
      <div hidden={tab !== "history"}>
      <h3 className="section-title"><History size={17} aria-hidden="true" /> Histórico do caso</h3>
      <ol className="timeline">
        {caseData.timeline.map((event, index) => (
          <li key={`${event.label}-${index}`}>
            <span>
              {event.label}
              {event.note ? <span className="hint"> · {event.note}</span> : null}
            </span>
            <time dateTime={`PT${event.offset_hours}H`}>
              {formatOffset(event.offset_hours)}
            </time>
          </li>
        ))}
      </ol>

      </div>
      <div hidden={tab !== "action"}>
      <h3 className="section-title"><ClipboardCheck size={17} aria-hidden="true" /> Conduta e acompanhamento</h3>
      <form
        className="action-block"
        aria-busy={Boolean(pending)}
        onSubmit={(event) => {
          event.preventDefault();
          if (actionHint || pending) return;
          run("action", () => onRegister(caseData.id, note));
        }}
      >
        <label>
          Ação realizada
          <textarea
            name="clinical-action"
            autoComplete="off"
            placeholder="Descreva a conduta, o encaminhamento ou o contato realizado…"
            value={note}
            disabled={closed || pending !== ""}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="workflow-actions"><div className="action-row">
          <button
            type="button"
            className="btn-primary"
            disabled={Boolean(readHint) || pending !== ""}
            onClick={() => run("read", () => onRead(caseData.id))}
          >
            {pending === "read" ? "Confirmando…" : read ? "Leitura confirmada" : "Confirmar leitura"}
          </button>
          {readHint ? <p className="hint">{readHint}</p> : null}
        </div>
        <div className="action-row">
          <button
            type="submit"
            className="btn-primary"
            disabled={Boolean(actionHint) || pending !== ""}
          >
            {pending === "action" ? "Registrando…" : "Registrar ação"}
          </button>
          {actionHint ? <p className="hint">{actionHint}</p> : null}
        </div>
        <div className="action-row">
          <button
            type="button"
            className="btn-secondary"
            disabled={Boolean(closeHint) || pending !== ""}
            onClick={() => run("close", () => onClose(caseData.id))}
          >
            {pending === "close" ? "Fechando…" : closed ? "Caso fechado" : "Fechar caso"}
          </button>
          {closeHint ? <p className="hint">{closeHint}</p> : null}
        </div>
        </div>
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        <p className="sr-only" role="status">{pending ? "Salvando alteração…" : statusLabel(caseData.status)}</p>
      </form>
      </div>
    </article>
  );
}

