import PhysicianAvatar from "./PhysicianAvatar.jsx";
import { classificationConfidence } from "../lib/classificationConfidence.js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Check,
  UserRound,
  Stethoscope,
  Building2,
  Eye,
  ClipboardCheck,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acknowledge, registerAction } from "../api.js";
import { authorizedRequest } from "../lib/session.js";
import { formatOffset, statusLabel } from "../format.js";
import { deadlinePill } from "../lib/deadlinePill.js";
import { escalationPath } from "../lib/escalationPath.js";
import { formatRemaining } from "../lib/formatRemaining.js";
import { splitEvidence } from "../lib/splitEvidence.js";
import { validLocalizationMarkers } from "../lib/pathologyColors.js";
import { selectCase } from "../store/selectors.js";
import { useStore } from "../store/useStore.js";
import ExamViewer from "./ExamViewer.jsx";
import PathologyScoreList from "./PathologyScoreList.jsx";
import CaseChatModal from "./luna/CaseChatModal.jsx";
import UrgencyBadge from "./UrgencyBadge.jsx";

const STEP_ICONS = [UserRound, Stethoscope, Building2];

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
  const [reclassificationNotice, setReclassificationNotice] = useState(false);
  const [reclassification, setReclassification] = useState(null);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassificationError, setReclassificationError] = useState("");
  const [selectedPathology, setSelectedPathology] = useState(null);
  const [hoveredPathology, setHoveredPathology] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [note, setNote] = useState("");
  const [closeCase, setCloseCase] = useState(true);
  const noteRef = useRef(null);
  const openActionRef = useRef(null);
  const analysisFetch = useRef(0);
  const reclassificationRequest = useRef(null);
  const status = detail?.case.status;
  const reportId = detail?.case.report_id;
  useEffect(() => {
    reclassificationRequest.current?.abort();
    reclassificationRequest.current = null;
    setReclassifying(false);
    setReclassificationNotice(false);
    setReclassification(null);
    setReclassificationError("");
    setSelectedPathology(null);
    setHoveredPathology(null);
    if (!reportId) return undefined;
    let active = true;
    const requestId = ++analysisFetch.current;
    authorizedRequest(`/reports/${encodeURIComponent(reportId)}/analysis`)
      .then((saved) => {
        if (active && requestId === analysisFetch.current)
          setReclassification(saved);
      })
      .catch(() => {
        if (active && requestId === analysisFetch.current)
          setReclassification(null);
      });
    return () => {
      active = false;
      reclassificationRequest.current?.abort();
    };
  }, [id, reportId]);

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
  const confidence = classificationConfidence(item);
  const localizationMarkers = validLocalizationMarkers(reclassification);
  const reportText = detail.report?.text ?? item.text ?? "";
  const evidence = splitEvidence(reportText, item.evidence);
  const pill = deadlinePill(item);
  const steps = escalationPath(item, detail.report);
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
        ? "A aá§ão já foi registrada."
        : "Confirme a leitura antes de registrar a aá§ão.";

  async function reclassify() {
    if (
      reclassificationRequest.current ||
      !reportId ||
      !detail.report?.image_file_id
    )
      return;
    const controller = new AbortController();
    reclassificationRequest.current = controller;
    analysisFetch.current += 1;
    setReclassificationError("");
    setReclassificationNotice(false);
    setSelectedPathology(null);
    setHoveredPathology(null);
    setReclassification(null);
    setReclassifying(true);
    try {
      const result = await authorizedRequest(
        `/reports/${encodeURIComponent(reportId)}/reclassify`,
        { method: "POST", timeoutMs: 120000, signal: controller.signal },
      );
      if (
        reclassificationRequest.current !== controller ||
        controller.signal.aborted
      )
        return;
      if (
        !result?.probabilities ||
        !Object.values(result.probabilities).every(Number.isFinite)
      ) {
        throw new Error("O servidor retornou scores invá¡lidos.");
      }
      setReclassification(result);
      setReclassificationNotice(true);
    } catch (caught) {
      if (
        reclassificationRequest.current !== controller ||
        controller.signal.aborted
      )
        return;
      setReclassificationError(
        caught instanceof Error
          ? caught.message
          : "Não foi possá­vel reclassificar a radiografia.",
      );
    } finally {
      if (reclassificationRequest.current === controller) {
        reclassificationRequest.current = null;
        setReclassifying(false);
      }
    }
  }

  async function run(action) {
    setError("");
    setPending(true);
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "A aá§ão não foi registrada.",
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
      setError("Descreva a aá§ão tomada.");
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
    <article
      key={id}
      className="detail report-detail report-enter"
      aria-label="Detalhe do caso"
    >
      <button
        className="back-button"
        type="button"
        onClick={() => goBack(navigate)}
      >
        <ArrowLeft size={17} aria-hidden="true" /> Voltar
      </button>
      <header className="detail-title report-case-heading">
        <h2>{item.finding}</h2>
        <UrgencyBadge level={item.urgency} />
        <CaseChatModal key={item.id} item={item} report={detail.report} />
      </header>
      <section className="communication" aria-labelledby="communication-title">
        <div className="communication-head">
          <h3 id="communication-title">Comunicaá§ão</h3>
          <span className={`deadline-pill is-${pill.kind}`}>{pill.text}</span>
        </div>
        <ol className="escalation-path">
          {steps.map((step) => {
            const done =
              step.state === "Já¡ notificado" ||
              step.state === "Leitura confirmada";
            const Icon = STEP_ICONS[step.level];
            return (
              <li
                key={step.level}
                className={
                  step.state === "Atual"
                    ? "is-current"
                    : done
                      ? "is-done"
                      : "is-pending"
                }
                aria-current={step.state === "Atual" ? "step" : undefined}
              >
                <span className="escalation-connector" aria-hidden="true">
                  <span />
                </span>
                <span className="escalation-node">
                  {step.level < 2 ? (
                    <PhysicianAvatar name={step.name} />
                  ) : (
                    <Icon size={24} aria-hidden="true" />
                  )}
                  {done && (
                    <Check
                      className="escalation-check"
                      size={12}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <div className="escalation-copy">
                  <span className="escalation-role">{step.role}</span>
                  {step.name ? <strong>{step.name}</strong> : null}
                  <span className="escalation-state">{step.state}</span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="detail-actions">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="detail-action communication-action">
            <div className="communication-action-copy">
              <span className="communication-action-icon">
                <Eye size={19} aria-hidden="true" />
              </span>
              <div>
                <h4>Leitura do laudo</h4>
                <p className="hint">{confirmReason}</p>
              </div>
            </div>
            <button
              className="btn-primary"
              type="button"
              disabled={!canConfirm || pending}
              onClick={() =>
                run(() => acknowledge(item.id, item.current_target))
              }
            >
              {pending && canConfirm
                ? "ConfirmandoÃ¢â‚¬Â¦"
                : canConfirm
                  ? "Confirmar leitura"
                  : "Leitura confirmada"}
            </button>
          </div>
          {actionOpen ? null : (
            <div className="detail-action communication-action">
              <div className="communication-action-copy">
                <span className="communication-action-icon">
                  <ClipboardCheck size={19} aria-hidden="true" />
                </span>
                <div>
                  <h4>Conduta clá­nica</h4>
                  <p className="hint">
                    {registerReason ||
                      "Descreva a conduta adotada para este caso."}
                  </p>
                </div>
              </div>
              <button
                ref={openActionRef}
                className="btn-primary"
                type="button"
                disabled={!canRegister || pending}
                onClick={openAction}
              >
                Registrar aá§ão
              </button>
            </div>
          )}
          {actionOpen ? (
            <form
              className="action-block"
              onSubmit={submitAction}
              onKeyDown={onActionKeyDown}
            >
              <label>
                Aá§ão tomada
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
                Registrar aá§ão
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
        <div className="communication-history-head">
          <h3>
            Histá³rico de comunicaá§ão{" "}
            <span className="count">{detail.events.length}</span>
          </h3>
          <span>Tempo da demonstraá§ão</span>
        </div>
        <ol className="timeline communication-history">
          {detail.events.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <span className="communication-event-icon">
                <Clock3 size={16} aria-hidden="true" />
              </span>
              <div className="communication-event-copy">
                <span>{event.label}</span>
                {index === detail.events.length - 1 ? (
                  <small>Última atualizaá§ão</small>
                ) : null}
              </div>
              <time dateTime={`PT${event.at}H`}>{formatOffset(event.at)}</time>
            </li>
          ))}
        </ol>
      </section>
      <div className="report-case-summary">
        <span>
          Prazo: <strong>{formatRemaining(item.time_remaining_hours)}</strong>
        </span>
        <span>{statusLabel(item.status)}</span>
      </div>
      <div className="report-reading-layout">
        <section className="report-document" aria-label="Documento do laudo">
          <header className="report-document-heading">
            <div>
              <h3>Laudo radiolá³gico</h3>
              <p>{item.modality}</p>
            </div>
            <span>{item.report_id}</span>
          </header>
          <dl className="report-document-meta">
            <div>
              <dt>Radiologista</dt>
              <dd className="report-physician">
                <PhysicianAvatar
                  name={detail.report?.radiologist || item.radiologist}
                />
                <span>{detail.report?.radiologist || item.radiologist}</span>
              </dd>
            </div>
            <div>
              <dt>Má©dico solicitante</dt>
              <dd className="report-physician">
                <PhysicianAvatar
                  name={
                    detail.report?.ordering_physician || item.ordering_physician
                  }
                />
                <span>
                  {detail.report?.ordering_physician || item.ordering_physician}
                </span>
              </dd>
            </div>
            {detail.report?.source_clinic ? (
              <div>
                <dt>Clá­nica de origem</dt>
                <dd>{detail.report.source_clinic}</dd>
              </div>
            ) : null}
            <div className="report-luna-classification">
              <dt>Classificaá§ão da Luna</dt>
              <dd>
                <span
                  className={`classification-confidence is-${confidence.tone}`}
                >
                  {confidence.label}
                </span>
                <span className="classification-status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Classificado
                </span>
                <button
                  className="reclassify-button"
                  type="button"
                  disabled={reclassifying || !detail.report?.image_file_id}
                  aria-busy={reclassifying}
                  onClick={reclassify}
                >
                  {reclassifying ? (
                    <>
                      <LoaderCircle
                        size={15}
                        className="reclassify-spinner"
                        aria-hidden="true"
                      />
                      Reclassificando radiografiaÃ¢â‚¬Â¦
                    </>
                  ) : detail.report?.image_file_id ? (
                    "Reclassificar"
                  ) : (
                    "Radiografia não vinculada"
                  )}
                </button>
                {!detail.report?.image_file_id && (
                  <small>Este laudo não possui radiografia vinculada.</small>
                )}
                {reclassificationNotice && (
                  <small className="reclassification-notice" role="status">
                    Reclassificaá§ão concluá­da e salva.
                  </small>
                )}
                {reclassificationError && (
                  <small className="reclassification-error" role="alert">
                    {reclassificationError}
                  </small>
                )}
                {reclassification?.probabilities && (
                  <div className="reclassification-scores" aria-live="polite">
                    <strong>Saá­das atuais do TorchXRayVision</strong>
                    <PathologyScoreList
                      probabilities={reclassification.probabilities}
                      markers={reclassification.markers}
                      activePathology={hoveredPathology ?? selectedPathology}
                      onSelectPathology={(label) =>
                        setSelectedPathology((current) =>
                          current === label ? null : label,
                        )
                      }
                      onHoverPathology={setHoveredPathology}
                    />{" "}
                    <small>
                      Escores exploratá³rios do modelo; não são probabilidades
                      clá­nicas calibradas.
                    </small>
                    {reclassification.localization_status === "unavailable" && (
                      <small>{reclassification.localization_note}</small>
                    )}
                  </div>
                )}
                {item.confidence_is_example && !reclassification && (
                  <small>Percentual simulado</small>
                )}
              </dd>
            </div>
          </dl>
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
              Trecho de evidáªncia não localizado no laudo
            </p>
          )}

          <footer className="report-document-footer">
            <span>
              O trecho destacado corresponde à evidáªncia identificada pela
              Luna.
            </span>
            <strong>A IA sugere. O má©dico valida.</strong>
          </footer>
        </section>
        <ExamViewer
          key={id}
          item={item}
          report={detail.report}
          modality={item.modality}
          analysis={reclassification}
          activePathology={hoveredPathology ?? selectedPathology}
          focusPathology={selectedPathology}
          onSelectPathology={setSelectedPathology}
          onHoverPathology={setHoveredPathology}
        />
      </div>
    </article>
  );
}
