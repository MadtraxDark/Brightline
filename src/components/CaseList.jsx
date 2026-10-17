import { Search, ChevronRight, FileText, X } from "lucide-react";
import { useState } from "react";
import { formatRemaining, statusLabel } from "../format.js";
import UrgencyBadge from "./UrgencyBadge.jsx";

const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const urgencyOrder = { critical: 0, urgent: 1, actionable: 2 };

export default function CaseList({ cases, flashingIds = [], sealIds = [], onSelect }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const visibleCases = cases
    .filter(item => normalize(`${item.finding_name} ${item.current_target}`).includes(normalize(query.trim())) && (priority === "all" || item.urgency === priority))
    .sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3) || a.time_remaining_hours - b.time_remaining_hours);

  return (
    <section className="panel queue-panel" aria-labelledby="queue-title">
      <div className="queue-heading"><div><h2 id="queue-title">Laudos em acompanhamento <span className="count">{cases.length}</span></h2><p>Selecione um laudo para revisar os detalhes.</p></div></div>
      <div className="queue-toolbar">
        <div className="search-field"><Search size={17} aria-hidden="true" /><input name="case-search" autoComplete="off" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar laudo ou responsável…" aria-label="Buscar achado ou responsável" />{query ? <button className="icon-button" type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={15} aria-hidden="true" /></button> : null}</div>
        <select aria-label="Filtrar por prioridade" value={priority} onChange={event => setPriority(event.target.value)}><option value="all">Todas as prioridades</option><option value="critical">Crítico</option><option value="urgent">Urgente</option><option value="actionable">Acionável</option></select>
      </div>
      <div className="table-scroll"><table className="case-table"><thead><tr><th scope="col">Laudo</th><th scope="col">Prioridade</th><th scope="col">Responsável</th><th scope="col">Prazo</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>
        {visibleCases.map(item => {
          const time = formatRemaining(item.time_remaining_hours);
          return <tr key={item.id} className={flashingIds.includes(item.id) ? "is-escalating" : undefined}>
            <td><div className="case-name"><span className="document-icon"><FileText size={19} aria-hidden="true" /></span><div><button className="case-link" type="button" onClick={() => onSelect(item.id)}>{item.finding_name}</button><span className="case-reference">Laudo {item.id.toUpperCase()}{!item.flagged_by_radiologist ? " · Não sinalizado" : ""}{sealIds.includes(item.id) ? " · Escalado" : ""}</span></div></div></td>
            <td><UrgencyBadge level={item.urgency} /></td><td className="table-person">{item.current_target}</td><td className={time.overdue ? "time-left is-overdue" : "time-left"}>{time.text}</td><td><span className="status-pill">{statusLabel(item.status)}</span></td><td><button className="icon-button row-open" type="button" aria-label={`Abrir laudo: ${item.finding_name}`} onClick={() => onSelect(item.id)}><ChevronRight size={18} aria-hidden="true" /></button></td>
          </tr>;
        })}
      </tbody></table></div>
      {visibleCases.length === 0 ? <div className="state-block empty"><FileText size={28} aria-hidden="true" /><h3>{cases.length ? "Nenhum laudo encontrado" : "Tudo em dia"}</h3><p>{cases.length ? "Experimente outro termo ou altere a prioridade." : "Não há laudos pendentes nesta fila."}</p>{cases.length ? <button type="button" className="btn-secondary" onClick={() => { setQuery(""); setPriority("all"); }}>Limpar filtros</button> : null}</div> : null}
      <div className="table-footer"><span role="status">{visibleCases.length} {visibleCases.length === 1 ? "laudo" : "laudos"}</span><span>Ordenados por prioridade clínica</span></div>
    </section>
  );
}
