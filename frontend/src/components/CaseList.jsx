import { Search, ChevronRight, EyeOff, FileText, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { statusLabel } from "../format.js";
import { deadlinePill } from "../lib/deadlinePill.js";
import { formatRemaining } from "../lib/formatRemaining.js";
import { communicationRule, groupByUrgency } from "../lib/groupByUrgency.js";
import { selectCases, selectReportsWithoutAlert } from "../store/selectors.js";
import { useRecentlyEscalated, useStore } from "../store/useStore.js";
import UrgencyBadge from "./UrgencyBadge.jsx";
import ClinicalQueue from "./ClinicalQueue.jsx";
import { previewData } from "../data/preview.js";

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const QUEUE_STAGES = [
  ["all", "Todos"],
  ["notified", "Notificado"],
  ["escalated", "Escalado"],
  ["read", "Lido"],
  ["action_taken", "Ação registrada"],
  ["closed", "Fechado"],
];

const OVERVIEW_STAGES = [
  ["all", "Todas as etapas"],
  ["notified", "Notificado"],
  ["escalated", "Escalado"],
  ["read", "Lido"],
  ["action_taken", "Ação registrada"],
];

function nextStage(stages, current, key) {
  const index = stages.findIndex(([value]) => value === current);
  if (key === "Home") return stages[0][0];
  if (key === "End") return stages.at(-1)[0];
  const delta = key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  if (!delta) return null;
  return stages[(index + delta + stages.length) % stages.length][0];
}

function statusDeviation(item) {
  if (item.status === "notified") return null;
  if (item.status === "escalated") return `Escalado · nível ${item.escalation_level}`;
  return statusLabel(item.status);
}

export default function CaseList({ onlyUnflagged = false, title = "Laudos em acompanhamento", stages = false, grouped = false, variant, overview = false, lane = "all", showResolved = false, onToggleResolved, preview = false }) {
  const navigate = useNavigate();
  const cases = useStore((state) => preview ? previewData.cases : state.cases);
  const simNow = useStore((state) => preview ? previewData.simNow : state.simNow);
  const reports = useStore((state) => preview ? previewData.reports : state.reports);
  const escalated = useRecentlyEscalated();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [stage, setStage] = useState("all");
  const snapshot = useMemo(() => ({ cases, simNow, reports }), [cases, simNow, reports]);
  const isOverview = variant === "overview" || overview;
  const stageOptions = isOverview ? OVERVIEW_STAGES : QUEUE_STAGES;
  const laneUrgency = isOverview && lane !== "all" && lane !== "noAlert" ? lane : undefined;
  const urgency = isOverview ? laneUrgency : priority === "all" ? undefined : priority;
  const openCases = useMemo(
    () =>
      selectCases(snapshot, { onlyUnflagged, urgency: isOverview ? laneUrgency : undefined }).filter((item) => onlyUnflagged || item.status !== "closed"),
    [snapshot, onlyUnflagged, isOverview, laneUrgency],
  );
  const stageCounts = useMemo(() => {
    const base = selectCases(snapshot, { onlyUnflagged, urgency });
    const pool = isOverview ? base.filter((item) => item.status !== "closed") : base;
    const counts = { all: pool.filter((item) => onlyUnflagged || isOverview || item.status !== "closed").length };
    if (isOverview) counts.all = pool.length;
    for (const [value] of stageOptions) {
      if (value === "all") continue;
      counts[value] = pool.filter((item) => item.status === value).length;
    }
    return counts;
  }, [snapshot, onlyUnflagged, urgency, isOverview, stageOptions]);
  const visibleCases = useMemo(
    () =>
      selectCases(snapshot, {
        onlyUnflagged,
        urgency,
        status: stage === "all" ? undefined : stage,
        query,
      }).filter((item) => {
        if (onlyUnflagged || item.status !== "closed") return true;
        if (!isOverview) return stage === "closed";
        return showResolved && stage === "all";
      }),
    [snapshot, onlyUnflagged, urgency, stage, query, isOverview, showResolved],
  );
  const groups = useMemo(() => groupByUrgency(visibleCases), [visibleCases]);
  const silentReports = useMemo(() => (isOverview ? selectReportsWithoutAlert(snapshot) : []), [isOverview, snapshot]);
  const resolvedCount = useMemo(() => {
    if (!isOverview) return 0;
    return (snapshot.cases ?? []).filter((item) => item.status === "closed").length;
  }, [isOverview, snapshot]);
  const emptyTitle = isOverview && laneUrgency && stage === "all"
    ? "Nenhum caso em aberto neste grupo."
    : stage !== "all"
    ? "Nenhum caso com este status."
    : openCases.length
    ? "Nenhum caso nesta prioridade."
    : onlyUnflagged
      ? "Nenhum achado não sinalizado até agora."
      : "Nenhum caso aberto.";
  const emptyDetail = stage !== "all" || openCases.length || onlyUnflagged || isOverview ? null : "Avance o tempo ou resete a demo.";
  function clearFilters() {
    setQuery("");
    setPriority("all");
    setStage("all");
  }
  function onStageKeyDown(event) {
    const next = nextStage(stageOptions, stage, event.key);
    if (!next) return;
    event.preventDefault();
    setStage(next);
    event.currentTarget.querySelector(`[data-stage="${next}"]`)?.focus();
  }
  const noAlert = isOverview && lane === "noAlert";

  const reference = (item) => `Laudo ${item.report_id}${onlyUnflagged ? ` · Assinado por ${item.radiologist}` : item.flagged_by_radiologist ? "" : " · Não sinalizado"}${escalated.has(item.id) && reduced ? " · Escalado" : ""}`;

  const columns = isOverview ? 4 : 6;

  return (
    <section className={`panel queue-panel${isOverview ? " is-overview" : ""}`} aria-labelledby={isOverview ? undefined : "queue-title"} aria-label={isOverview ? "Casos" : undefined}>
      {isOverview ? null : <div className="queue-heading"><div><h2 id="queue-title">{title} <span className="count">{openCases.length}</span></h2><p>Selecione um laudo para revisar os detalhes.</p></div></div>}
      {noAlert ? <>
        <p className="queue-note">Sem achado acionável encontrado pelo Brightline. Não é liberação clínica: a IA pode deixar passar achados.</p>
        {silentReports.length ? <div className="table-scroll"><table className="case-table"><thead><tr><th scope="col">Laudo</th><th scope="col">Modalidade</th><th scope="col">Radiologista</th><th scope="col">Solicitante</th></tr></thead><tbody>
          {silentReports.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.modality}</td><td>{item.radiologist}</td><td>{item.ordering_physician}</td></tr>)}
        </tbody></table></div> : <div className="state-block empty"><FileText size={28} aria-hidden="true" /><h3>Todos os laudos analisados têm algum achado.</h3></div>}
      </> : <>
      <div className="queue-toolbar">
        <div className="queue-filters">
          <div className="search-field"><Search size={17} aria-hidden="true" /><input name="case-search" autoComplete="off" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar laudo ou responsável…" aria-label="Buscar achado ou responsável" />{query ? <button className="icon-button" type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={15} aria-hidden="true" /></button> : null}</div>
          {isOverview ? null : <div className="priority-filter"><select aria-label="Filtrar por prioridade" value={priority} onChange={event => setPriority(event.target.value)}><option value="all">Todas as prioridades</option><option value="critical">Crítico</option><option value="urgent">Urgente</option><option value="actionable">Acionável</option></select></div>}
        </div>
        {stages && !isOverview ? <div className="stage-filter" role="radiogroup" aria-label="Filtrar por etapa" onKeyDown={onStageKeyDown}>
          {stageOptions.map(([value, label]) => <button key={value} type="button" role="radio" data-stage={value} aria-checked={stage === value} tabIndex={stage === value ? 0 : -1} onClick={() => setStage(value)}>{label} <span className="count">{stageCounts[value]}</span></button>)}
        </div> : null}
        {isOverview ? <button type="button" className="resolved-switch" role="switch" aria-checked={showResolved} disabled={resolvedCount === 0} onClick={onToggleResolved}><span className="resolved-switch-track" aria-hidden="true" />{resolvedCount === 0 ? "Resolvidos" : `Resolvidos (${resolvedCount})`}</button> : null}
      </div>
      {isOverview ? <ClinicalQueue groups={groups} reports={reports} /> : <div className="table-scroll"><table className={`case-table${isOverview ? " is-overview" : ""}`}><thead><tr>{isOverview ? <><th scope="col">Prazo</th><th scope="col">Achado</th><th scope="col">Responsável</th></> : <><th scope="col">Laudo</th><th scope="col">Prioridade</th><th scope="col">Responsável</th><th scope="col">Prazo</th><th scope="col">Status</th></>}<th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>
        {(grouped ? groups : [{ urgency: "all", items: visibleCases }]).map(group => <Fragment key={group.urgency}>
          {grouped ? <tr className={`urgency-group${group.urgency === "critical" ? " is-critical" : ""}`}><th scope="rowgroup" colSpan={columns}><span className="urgency-group-label"><UrgencyBadge level={group.urgency} />{communicationRule(group.items[0].deadline_hours) ? <span>{communicationRule(group.items[0].deadline_hours)}</span> : null}<span className="count">{group.items.length}</span></span></th></tr> : null}
          {group.items.map(item => {
          const overdue = item.time_remaining_hours < 0;
          const highlight = escalated.has(item.id);
          const pill = deadlinePill(item);
          const deviation = statusDeviation(item);
          return <tr key={item.id} className={highlight && !reduced ? "row-escalated" : undefined}>
            {isOverview ? <>
              <td className="deadline-cell"><span className={`deadline-pill is-${pill.kind}`}>{pill.text}</span></td>
              <td><div className="case-name"><div><button className="case-link" type="button" onClick={() => navigate(`/caso/${item.id}`)}>{item.finding}</button><span className="case-reference">{item.modality} · {item.report_id}{item.flagged_by_radiologist ? null : <> · <EyeOff size={13} aria-hidden="true" /> Não sinalizado</>}</span></div></div></td>
              <td className="table-person">{item.current_target}{deviation ? <span className="case-reference">{deviation}</span> : null}</td>
            </> : <>
              <td><div className="case-name"><span className="document-icon"><FileText size={19} aria-hidden="true" /></span><div><button className="case-link" type="button" onClick={() => navigate(`/caso/${item.id}`)}>{item.finding}</button><span className="case-reference">{reference(item)}</span></div></div></td>
              <td><UrgencyBadge level={item.urgency} /></td><td className="table-person">{item.current_target}{item.status === "escalated" ? <span className="case-reference">Escalado · nível {item.escalation_level} de 2</span> : null}</td><td className={overdue ? "time-left is-overdue" : "time-left"}>{formatRemaining(item.time_remaining_hours)}</td><td><span className="status-pill">{statusLabel(item.status)}</span></td>
            </>}
            <td><button className="icon-button row-open" type="button" aria-label={`Abrir laudo: ${item.finding}`} onClick={() => navigate(`/caso/${item.id}`)}><ChevronRight size={18} aria-hidden="true" /></button></td>
          </tr>;
          })}
        </Fragment>)}
      </tbody></table></div>}
      {visibleCases.length === 0 ? <div className="state-block empty"><FileText size={28} aria-hidden="true" /><h3>{emptyTitle}</h3>{emptyDetail ? <p>{emptyDetail}</p> : null}{query || (!isOverview && priority !== "all") || stage !== "all" ? <button type="button" className="btn-secondary" onClick={clearFilters}>Limpar filtros</button> : null}</div> : null}
      {isOverview ? (visibleCases.length > 0 ? <div className="table-footer"><span role="status">{visibleCases.length} {visibleCases.length === 1 ? "caso" : "casos"}</span></div> : null) : <div className="table-footer"><span role="status">{visibleCases.length} {visibleCases.length === 1 ? "laudo" : "laudos"}</span><span>Ordenados por prioridade clínica</span></div>}
      </>}
    </section>
  );
}
