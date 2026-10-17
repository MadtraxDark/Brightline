import { Building2, ChevronRight, EyeOff, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { deadlinePill } from "../lib/deadlinePill.js";
import { communicationRule } from "../lib/groupByUrgency.js";
import { statusLabel } from "../format.js";
import UrgencyBadge from "./UrgencyBadge.jsx";

export default function ClinicalQueue({ groups, reports }) {
  const byId = new Map(reports.map(report => [report.report_id, report]));
  return <div className="clinical-queue">{groups.map(group => <section className="clinical-group" key={group.urgency} aria-label={`Prioridade ${group.urgency}`}>
    <div className="clinical-group-heading"><UrgencyBadge level={group.urgency} /><span>{communicationRule(group.items[0]?.deadline_hours)}</span><span className="count">{group.items.length}</span></div>
    {group.items.map(item => {
      const report = byId.get(item.report_id) ?? item;
      const pill = deadlinePill(item);
      return <article className="clinical-case" key={item.id}>
        <div className="clinical-case-body">
          <div className="clinical-case-title"><h3><Link to={`/caso/${item.id}`}>{item.finding}</Link></h3><span className={`deadline-pill is-${pill.kind}`}>{pill.text}</span></div>
          <div className="clinical-exam"><FileText size={15} aria-hidden="true" /><span>{report.modality || "Modalidade não informada"}</span><span className="clinical-report-id">{item.report_id}</span>{!item.flagged_by_radiologist && <span className="clinical-unflagged"><EyeOff size={13} aria-hidden="true" />Não sinalizado</span>}</div>
          <p className="clinical-report-preview">{report.text || "Texto do laudo não disponível."}</p>
          <dl className="clinical-origin"><div><dt>Médico solicitante</dt><dd>{report.ordering_physician || "Não informado"}</dd></div><div><dt>Radiologista</dt><dd>{report.radiologist || "Não informado"}</dd></div><div><dt><Building2 size={13} aria-hidden="true" />Clínica de origem</dt><dd>{report.source_clinic || "Não informada"}</dd></div></dl>
        </div>
        <div className="clinical-followup"><span className="clinical-followup-label">Acompanhamento</span><strong>{item.current_target}</strong><span>{statusLabel(item.status)}{item.status === "escalated" ? ` · nível ${item.escalation_level}` : ""}</span><Link className="clinical-open" to={`/caso/${item.id}`} aria-label={`Ver laudo: ${item.finding}`}>Ver laudo <ChevronRight size={16} aria-hidden="true" /></Link></div>
      </article>;
    })}
  </section>)}</div>;
}
