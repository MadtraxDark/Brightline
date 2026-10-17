import { Search, ChevronRight, FileText, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { statusLabel } from "../format.js";
import { formatRemaining } from "../lib/formatRemaining.js";
import { selectCases } from "../store/selectors.js";
import { useRecentlyEscalated, useStore } from "../store/useStore.js";
import UrgencyBadge from "./UrgencyBadge.jsx";
import { previewData } from "../data/preview.js";

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function CaseList({
  onlyUnflagged = false,
  title = "Laudos em acompanhamento",
  preview = false,
}) {
  const navigate = useNavigate();
  const cases = useStore((state) =>
    preview ? previewData.cases : state.cases,
  );
  const simNow = useStore((state) =>
    preview ? previewData.simNow : state.simNow,
  );
  const reports = useStore((state) =>
    preview ? previewData.reports : state.reports,
  );
  const escalated = useRecentlyEscalated();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const snapshot = useMemo(
    () => ({ cases, simNow, reports }),
    [cases, simNow, reports],
  );
  const openCases = useMemo(
    () =>
      selectCases(snapshot, { onlyUnflagged }).filter(
        (item) => onlyUnflagged || item.status !== "closed",
      ),
    [snapshot, onlyUnflagged],
  );
  const visibleCases = useMemo(
    () =>
      selectCases(snapshot, {
        onlyUnflagged,
        urgency: priority === "all" ? undefined : priority,
        query,
      }).filter((item) => onlyUnflagged || item.status !== "closed"),
    [snapshot, onlyUnflagged, priority, query],
  );
  const emptyTitle = openCases.length
    ? "Nenhum caso nesta prioridade."
    : onlyUnflagged
      ? "Nenhum achado não sinalizado até agora."
      : "Nenhum caso aberto.";
  const emptyDetail =
    openCases.length || onlyUnflagged
      ? null
      : "Avance o tempo ou resete a demo.";

  return (
    <section className="panel queue-panel" aria-labelledby="queue-title">
      <div className="queue-heading">
        <div>
          <h2 id="queue-title">
            {title} <span className="count">{openCases.length}</span>
          </h2>
          <p>Selecione um laudo para revisar os detalhes.</p>
        </div>
      </div>
      <div className="queue-toolbar">
        {preview ? (
          <>
            <button
              className="search-field lp-preview-search"
              type="button"
              onClick={() => navigate("/home")}
            >
              <Search size={17} aria-hidden="true" />
              <span>Buscar laudo ou responsável…</span>
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => navigate("/home")}
            >
              Todas as prioridades
            </button>
          </>
        ) : (
          <>
            <div className="search-field">
              <Search size={17} aria-hidden="true" />
              <input
                name="case-search"
                autoComplete="off"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar laudo ou responsável…"
                aria-label="Buscar achado ou responsável"
              />
              {query ? (
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setQuery("")}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <select
              aria-label="Filtrar por prioridade"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="all">Todas as prioridades</option>
              <option value="critical">Crítico</option>
              <option value="urgent">Urgente</option>
              <option value="actionable">Acionável</option>
            </select>
          </>
        )}
      </div>
      <div className="table-scroll">
        <table className="case-table">
          <thead>
            <tr>
              <th scope="col">Laudo</th>
              <th scope="col">Prioridade</th>
              <th scope="col">Responsável</th>
              <th scope="col">Prazo</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(preview ? visibleCases.slice(0, 3) : visibleCases).map((item) => {
              const overdue = item.time_remaining_hours < 0;
              const highlight = !preview && escalated.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={
                    highlight && !reduced ? "row-escalated" : undefined
                  }
                >
                  <td>
                    <div className="case-name">
                      <span className="document-icon">
                        <FileText size={19} aria-hidden="true" />
                      </span>
                      <div>
                        <button
                          className="case-link"
                          type="button"
                          onClick={() => navigate(`/caso/${item.id}`)}
                        >
                          {item.finding}
                        </button>
                        <span className="case-reference">
                          Laudo {item.report_id}
                          {onlyUnflagged
                            ? ` · Assinado por ${item.radiologist}`
                            : !item.flagged_by_radiologist
                              ? " · Não sinalizado"
                              : ""}
                          {highlight && reduced ? " · Escalado" : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <UrgencyBadge level={item.urgency} />
                  </td>
                  <td className="table-person">
                    {item.current_target}
                    {item.status === "escalated" ? (
                      <span className="case-reference">
                        Escalado · nível {item.escalation_level} de 2
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={overdue ? "time-left is-overdue" : "time-left"}
                  >
                    {formatRemaining(item.time_remaining_hours)}
                  </td>
                  <td>
                    <span className="status-pill">
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button row-open"
                      type="button"
                      aria-label={`Abrir laudo: ${item.finding}`}
                      onClick={() => navigate(`/caso/${item.id}`)}
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleCases.length === 0 ? (
        <div className="state-block empty">
          <FileText size={28} aria-hidden="true" />
          <h3>{emptyTitle}</h3>
          {emptyDetail ? <p>{emptyDetail}</p> : null}
          {openCases.length ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setQuery("");
                setPriority("all");
              }}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="table-footer">
        <span role="status">
          {visibleCases.length} {visibleCases.length === 1 ? "laudo" : "laudos"}
        </span>
        {preview ? (
          <button
            className="case-link"
            type="button"
            onClick={() => navigate("/home")}
          >
            Ver todos os laudos <ChevronRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <span>Ordenados por prioridade clínica</span>
        )}
      </div>
    </section>
  );
}
