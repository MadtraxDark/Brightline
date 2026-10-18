import { classificationConfidence } from "../classificationConfidence.js";
import {
  selectCase,
  selectLanes,
  selectNextDeadline,
} from "../../store/selectors.js";

const TEXT_LIMIT = 3000;
const CONFIDENCE = { high: "alta", medium: "média", low: "baixa" };

function clean(value) {
  if (typeof value !== "string") return value;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function stateOf(state) {
  return {
    simNow: state?.simNow ?? 0,
    cases: Array.isArray(state?.cases) ? state.cases : [],
    reports: Array.isArray(state?.reports) ? state.reports : [],
  };
}

function confidenceOf(item) {
  return CONFIDENCE[classificationConfidence(item).tone] ?? "baixa";
}

function remoteReading(report) {
  const reading = report?.reading;
  if (!reading || typeof reading !== "object" || reading.remote !== true)
    return null;
  return {
    a_distancia: true,
    realizado_em: clean(
      String(reading.performed_at ?? reading.realizado_em ?? ""),
    ),
    laudado_em: clean(String(reading.reported_at ?? reading.laudado_em ?? "")),
  };
}

function caseContext(detail) {
  const item = detail.case;
  const report = detail.report ?? {};
  const patient =
    report.patient && typeof report.patient === "object" ? report.patient : {};
  const texto = clean(String(report.text ?? "")).slice(0, TEXT_LIMIT);
  const context = {
    tipo: "caso",
    caso: {
      achado: clean(String(item.finding ?? "")),
      urgencia: item.urgency ?? null,
      regra_do_prazo: item.deadline_hours ?? null,
      tempo_restante: item.time_remaining_hours ?? null,
      status: item.status ?? null,
      nivel_de_escalonamento: item.escalation_level ?? null,
      responsavel_atual: clean(String(item.current_target ?? "")),
      nao_sinalizado: item.flagged_by_radiologist === false,
      confianca_da_ia: confidenceOf(item),
      evidencia: clean(String(item.evidence ?? "")),
    },
    laudo: {
      id: report.report_id ?? item.report_id ?? null,
      modalidade: clean(String(report.modality ?? item.modality ?? "")),
      texto,
      indicacao: clean(String(report.indication ?? "")),
      local: clean(String(report.location ?? "")),
      radiologista: clean(String(report.radiologist ?? item.radiologist ?? "")),
      solicitante: clean(
        String(report.ordering_physician ?? item.ordering_physician ?? ""),
      ),
    },
    paciente: {
      idade:
        typeof patient.age === "number" && Number.isFinite(patient.age)
          ? patient.age
          : null,
      sexo: typeof patient.sex === "string" ? clean(patient.sex) : null,
    },
  };
  const reading = remoteReading(report);
  if (reading) Object.assign(context, reading);
  return context;
}

function queueContext(state) {
  const lanes = selectLanes(state);
  const next = selectNextDeadline(state);
  return {
    tipo: "fila",
    resumo: {
      criticos_abertos: lanes.critical.open,
      urgentes_abertos: lanes.urgent.open,
      acionaveis_abertos: lanes.actionable.open,
      sem_alerta: lanes.noAlert.count,
      atrasados:
        lanes.critical.overdue +
        lanes.urgent.overdue +
        lanes.actionable.overdue,
      resolvidos:
        lanes.critical.resolved +
        lanes.urgent.resolved +
        lanes.actionable.resolved,
    },
    proximo_prazo: next
      ? {
          achado: clean(String(next.finding ?? "")),
          tempo_restante: next.time_remaining_hours,
        }
      : null,
  };
}

export function buildLunaContext(state, { caseId } = {}) {
  const safe = stateOf(state);
  if (caseId == null || caseId === "") return queueContext(safe);
  const detail = selectCase(safe, caseId);
  if (!detail) return null;
  return caseContext(detail);
}
