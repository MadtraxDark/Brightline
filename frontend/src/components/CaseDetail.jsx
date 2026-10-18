import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, EyeOff } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acknowledge, registerAction } from "../api.js";
import { confidenceLabel, formatOffset, statusLabel } from "../format.js";
import { formatRemaining } from "../lib/formatRemaining.js";
import { splitEvidence } from "../lib/splitEvidence.js";
import { selectCase } from "../store/selectors.js";
import { useStore } from "../store/useStore.js";
import UrgencyBadge from "./UrgencyBadge.jsx";

function goBack(navigate) {
  const idx = window.history.state?.idx;
  if (typeof idx === "number" && idx > 0) navigate(-1);
  else navigate("/home");
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cases = useStore((state) => state.cases);
  const simNow = useStore((state) => state.simNow);
  const reports = useStore((state) => state.reports);
  const detail = useMemo(
    () => selectCase({ cases, simNow, reports }, id),
    [cases, simNow, reports, id],
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [note, setNote] = useState("");
  const [closeCase, setCloseCase] = useState(true);
  const noteRef = useRef(null);
  const openActionRef = useRef(null);

  const status = detail?.case.status;

  useEffect(() => {
    if (status !== "read") setActionOpen(false);
  }, [status]);

  useEffect(() => {
    if (actionOpen) noteRef.current?.focus();
  }, [actionOpen]);

  if (!detail) {
    return (
      <article className="panel detail">
        <p>Caso não encontrado.</p>
        <Link className="back-button" to="/home">
          <ArrowLeft size={17} aria-hidden="true" /> Voltar à fila
        </Link>
      </article>
    );
  }

  const item = detail.case;
  const reportText = detail.report?.text ?? item.text ?? "";
  const evidence = splitEvidence(reportText, item.evidence);
  const canConfirm = item.status === "notified" || item.status === "escalated";
  const canRegister = item.status === "read";
  const canClose = item.status === "action_taken";
  const confirmReason = canConfirm
    ? `Confirmando como ${item.current_target}`
    : item.status === "closed"
      ? "O caso já está fechado."
      : "A leitura já foi confirmada.";
  const registerReason = canRegister
    ? ""
    : item.status === "closed"
      ? "O caso já está fechado."
      : item.status === "action_taken"
        ? "A ação já foi registrada."
        : "Confirme a leitura antes de registrar a ação.";

  async function run(action) {
    setError("");
    setPending(true);
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "A ação não foi registrada.",
      );
    } finally {
      setPending(false);
    }
  }

  function openAction() {
    setNote("");
    setCloseCase(true);
    setError("");
    setActionOpen(true);
  }

  function submitAction(event) {
    event.preventDefault();
    if (!note.trim()) {
      setError("Descreva a ação tomada.");
      return;
    }
    run(async () => {
      await registerAction(item.id, note, closeCase);
      setNote("");
      setActionOpen(false);
    });
  }

  function onActionKeyDown(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setActionOpen(false);
    openActionRef.current?.focus();
  }

  return (
    <article className="panel detail" aria-label="Detalhe do caso">
      <button
        className="back-button"
        type="button"
        onClick={() => goBack(navigate)}
      >
        <ArrowLeft size={17} aria-hidden="true" /> Voltar
      </button>
      <header className="detail-title">
        <h2>{item.finding}</h2>
        <UrgencyBadge level={item.urgency} />
        <p className="confidence">
          Confiança da IA: {confidenceLabel(item.confidence)}
        </p>
      </header>
      <p className="detail-validate">A IA sugere. O médico valida.</p>
      <p className="detail-meta">
        {item.modality} · {item.radiologist} · {item.ordering_physician} ·{" "}
        {formatRemaining(item.time_remaining_hours)} ·{" "}
        {statusLabel(item.status)}
      </p>
      {item.flagged_by_radiologist ? null : (
        <p className="detail-flag">
          <EyeOff size={16} aria-hidden="true" /> Não sinalizado pelo
          radiologista
        </p>
      )}

      <h3 className="section-title">Laudo</h3>
      <p className="report">
        {evidence.found ? (
          <>
            {evidence.before}
            <mark className="evidence">{evidence.match}</mark>
            {evidence.after}
          </>
        ) : (
          reportText
        )}
      </p>
      {evidence.found ? null : (
        <p className="missing-evidence">
          Trecho de evidência não localizado no laudo
        </p>
      )}

      <h3 className="section-title">Linha do tempo</h3>
      <ol className="timeline">
        {detail.events.map((event, index) => (
          <li key={`${event.at}-${index}`}>
            <span>{event.label}</span>
            <time dateTime={`PT${event.at}H`}>{formatOffset(event.at)}</time>
          </li>
        ))}
      </ol>

      <div className="detail-actions">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="detail-action">
          <button
            className="btn-primary"
            type="button"
            disabled={!canConfirm || pending}
            onClick={() => run(() => acknowledge(item.id, item.current_target))}
          >
            Confirmar leitura
          </button>
          <p className="hint">{confirmReason}</p>
        </div>
        {actionOpen ? null : (
          <div className="detail-action">
            <button
              ref={openActionRef}
              className="btn-primary"
              type="button"
              disabled={!canRegister || pending}
              onClick={openAction}
            >
              Registrar ação
            </button>
            {registerReason ? <p className="hint">{registerReason}</p> : null}
          </div>
        )}
        {actionOpen ? (
          <form
            className="action-block"
            onSubmit={submitAction}
            onKeyDown={onActionKeyDown}
          >
            <label>
              Ação tomada
              <textarea
                ref={noteRef}
                name="clinical-action"
                autoComplete="off"
                value={note}
                disabled={pending}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <label className="detail-check">
              <input
                type="checkbox"
                checked={closeCase}
                disabled={pending}
                onChange={(event) => setCloseCase(event.target.checked)}
              />
              Fechar caso
            </label>
            <button className="btn-primary" type="submit" disabled={pending}>
              Registrar ação
            </button>
          </form>
        ) : null}
        {canClose ? (
          <div className="detail-action">
            <button
              className="btn-secondary"
              type="button"
              disabled={pending}
              onClick={() => run(() => registerAction(item.id, "", true))}
            >
              Fechar caso
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
