import {
  LayoutDashboard,
  EyeOff,
  Files,
  Stethoscope,
  Building2,
  ChevronRight,
  TriangleAlert,
  Clock,
  CalendarClock,
  FileCheck,
  Search,
  Bell,
} from "lucide-react";
import logo from "../public/logo/logo-text.svg";
import reports from "../data/reports.json" with { type: "json" };
import cache from "../data/extractions_cache.json" with { type: "json" };
import { loadCases } from "../engine/engine.js";
import ClinicalQueue from "./ClinicalQueue.jsx";

const state = loadCases(reports, cache);
const critical = state.cases
  .filter((item) => item.urgency === "critical")
  .map((item) => ({
    ...item,
    time_remaining_hours: item.deadline_hours,
    current_target: item.ordering_physician,
    confidence_percent: cache[item.report_id]?.findings[0]?.confidence_percent,
    confidence_is_example: true,
  }));
export default function ProductDashboardPreview() {
  return (
    <div className="app lp-current-dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-image">
            <img
              className="brand-full"
              src={logo}
              alt=""
              width={156}
              height={59}
            />
          </span>
        </div>
        <div className="lp-current-nav">
          <div className="is-selected">
            <LayoutDashboard size={21} />
            Visão geral<span>{state.cases.length}</span>
          </div>
          <div>
            <EyeOff size={21} />
            Não sinalizados<span>3</span>
          </div>
          <hr />
          <div>
            <Files size={21} />
            Laudos
          </div>
          <div>
            <Stethoscope size={21} />
            Médicos
          </div>
          <div>
            <Building2 size={21} />
            Clínicas
          </div>
        </div>
        <div className="lp-current-deadline">
          <small>Próximo prazo</small>
          <strong>1h 0m</strong>
          <span>Pneumotórax hipertensivo</span>
        </div>
        <p className="clinical-note">IA sugere. Você valida.</p>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={14} />
            <span>Visão geral</span>
          </div>
          <div className="profile-trigger">
            <span className="profile-avatar">BS</span>
            <span className="profile-trigger-name">Bruno Souza</span>
          </div>
        </header>
        <main className="workspace">
          <div className="overview">
            <div className="overview-head">
              <h1>Visão geral</h1>
              <span className="overview-next">
                Abrir próximo · 1h 0m
                <ChevronRight size={16} />
              </span>
            </div>
            <div className="summary">
              {[
                [TriangleAlert, "Críticos", 2],
                [Clock, "Urgentes", 2],
                [CalendarClock, "Acionáveis", 2],
                [FileCheck, "Sem alerta", 2],
              ].map(([Icon, label, count], index) => (
                <div
                  className={`summary-item ${index === 0 ? "is-critical-open" : ""}`}
                  key={label}
                >
                  <span className="summary-icon">
                    <Icon size={22} />
                  </span>
                  <div>
                    <strong className="summary-value">{count}</strong>
                    <span className="summary-word">{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <section className="panel queue-panel is-overview">
              <div className="queue-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <span>Buscar laudo…</span>
                </div>
                <span className="lp-current-resolved">Resolvidos</span>
              </div>
              <ClinicalQueue
                groups={[{ urgency: "critical", items: critical }]}
                reports={reports}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
