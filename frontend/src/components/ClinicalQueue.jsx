import {
  Building2,
  ChevronRight,
  FileText,
  CheckCircle2,
  UserRound,
  Bell,
  Eye,
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react";
import { classificationConfidence } from "../lib/classificationConfidence.js";
import { Link } from "react-router-dom";
import { deadlinePill } from "../lib/deadlinePill.js";
import { communicationRule } from "../lib/groupByUrgency.js";
import { statusLabel } from "../format.js";
import UrgencyBadge from "./UrgencyBadge.jsx";

function PhysicianAvatar({ name, photo }) {
  const initials = String(name || "")
    .replace(/^(dr\.?|dra\.?)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((_, index, names) => index === 0 || index === names.length - 1)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
  return (
    <span className="physician-avatar" aria-hidden="true">
      {photo ? (
        <img
          src={photo}
          alt=""
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.nextElementSibling.hidden = false;
          }}
        />
      ) : null}
      <span hidden={!!photo}>{initials || "—"}</span>
    </span>
  );
}

export default function ClinicalQueue({ groups, reports }) {
  const byId = new Map(reports.map((report) => [report.report_id, report]));
  return (
    <div className="clinical-queue">
      {groups.map((group) => (
        <section
          className="clinical-group"
          key={group.urgency}
          aria-label={`Prioridade ${group.urgency}`}
        >
          <div className="clinical-group-heading">
            <UrgencyBadge level={group.urgency} />
            <span>{communicationRule(group.items[0]?.deadline_hours)}</span>
            <span className="count">{group.items.length}</span>
          </div>
          {group.items.map((item) => {
            const report = byId.get(item.report_id) ?? item;
            const pill = deadlinePill(item);
            const confidence = classificationConfidence(item);
            const StatusIcon =
              {
                notified: Bell,
                escalated: ArrowUpRight,
                read: Eye,
                action_taken: ClipboardCheck,
                closed: CheckCircle2,
              }[item.status] ?? Bell;
            const nextStep = {
              notified: "Aguardando leitura do responsável",
              escalated: "Encaminhado para o próximo nível",
              read: "Aguardando registro de conduta",
              action_taken: "Conduta registrada",
              closed: "Acompanhamento encerrado",
            }[item.status];
            return (
              <article className="clinical-case" key={item.id}>
                <div className="clinical-case-body">
                  <div className="clinical-case-title">
                    <h3>
                      <Link to={`/caso/${item.id}`}>{item.finding}</Link>
                    </h3>
                    <span className={`deadline-pill is-${pill.kind}`}>
                      {pill.text}
                    </span>
                  </div>
                  <div className="clinical-exam">
                    <FileText size={15} aria-hidden="true" />
                    <span>{report.modality || "Modalidade não informada"}</span>
                  </div>
                  <p className="clinical-report-preview">
                    {report.text || "Texto do laudo não disponível."}
                  </p>
                  <dl className="clinical-origin">
                    <div className="clinical-physician">
                      <dt>Médico solicitante</dt>
                      <dd>
                        <PhysicianAvatar
                          name={report.ordering_physician}
                          photo={report.ordering_physician_photo}
                        />
                        <span>
                          {report.ordering_physician || "Não informado"}
                        </span>
                      </dd>
                    </div>
                    <div className="clinical-physician">
                      <dt>Radiologista</dt>
                      <dd>
                        <PhysicianAvatar
                          name={report.radiologist}
                          photo={report.radiologist_photo}
                        />
                        <span>{report.radiologist || "Não informado"}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Building2 size={13} aria-hidden="true" />
                        Clínica de origem
                      </dt>
                      <dd>{report.source_clinic || "Não informada"}</dd>
                    </div>
                    <div className="clinical-classification">
                      <dt>Confiança da Luna</dt>
                      <dd>
                        <span
                          className={`classification-confidence is-${confidence.tone}`}
                        >
                          {confidence.label}
                        </span>
                        <span className="classification-status">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Classificado
                        </span>
                        {confidence.numeric && item.confidence_is_example ? (
                          <small>Percentual simulado</small>
                        ) : !confidence.numeric ? (
                          <small>Percentual não fornecido</small>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="clinical-followup">
                  <h4 className="clinical-followup-label">Acompanhamento</h4>
                  <div className="followup-person">
                    <UserRound size={19} aria-hidden="true" />
                    <div>
                      <span>Responsável atual</span>
                      <strong>{item.current_target || "Não informado"}</strong>
                    </div>
                  </div>
                  <div className="followup-state">
                    <span className={`followup-status is-${item.status}`}>
                      <StatusIcon size={15} aria-hidden="true" />
                      {statusLabel(item.status)}
                      {item.status === "escalated"
                        ? ` · nível ${item.escalation_level}`
                        : ""}
                    </span>
                    {nextStep && <p>{nextStep}</p>}
                  </div>
                  <Link
                    className="clinical-open"
                    to={`/caso/${item.id}`}
                    aria-label={`Ver laudo: ${item.finding}`}
                  >
                    Ver laudo <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
