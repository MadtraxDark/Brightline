import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Files,
  ShieldCheck,
  Timer,
  LayoutDashboard,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Sparkles,
  FlaskConical,
  Menu,
  X,
  Building2,
} from "lucide-react";
import logo from "../public/logo/logo-text.svg";
import CaseDetail from "./CaseDetail.jsx";
import CaseList from "./CaseList.jsx";
import DemoClock from "./DemoClock.jsx";
import Evaluation from "./Evaluation.jsx";
import ProfileMenu from "./ProfileMenu.jsx";
import Settings from "./Settings.jsx";
import NavigationHighlight from "./NavigationHighlight.jsx";
import Missed from "./Missed.jsx";
import { readProfile, saveProfile } from "../lib/profile.js";
import { logout, updateInstitutions, switchInstitution } from "../lib/session.js";
import { formatAverage } from "../format.js";
import { selectMissed, selectStats } from "../store/selectors.js";
import { useStore } from "../store/useStore.js";
import { previewData } from "../data/preview.js";
import { useHospital } from "./HospitalProvider.jsx";

const SUMMARY = [
  { key: "open", label: "Abertos" },
  { key: "critical", label: "Críticos" },
  { key: "escalated", label: "Escalados" },
  { key: "avg_time_to_read_hours", label: "Tempo médio até leitura" },
];

function summaryValue(stats, key) {
  if (key === "avg_time_to_read_hours")
    return formatAverage(stats.avg_time_to_read_hours);
  if (key === "critical") return stats.urgency.critical;
  if (key === "escalated") return stats.status.escalated;
  const status = stats.status;
  return (
    status.detected +
    status.notified +
    status.read +
    status.action_taken +
    status.escalated
  );
}

function crumb(pathname) {
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/caso/")) return "Caso";
  if (pathname.startsWith("/nao-sinalizados")) return "Não sinalizados";
  if (pathname.startsWith("/avaliacao")) return "Avaliação da IA";
  return "Visão geral";
}

function Overview({ preview = false }) {
  const cases = useStore((state) =>
    preview ? previewData.cases : state.cases,
  );
  const simNow = useStore((state) =>
    preview ? previewData.simNow : state.simNow,
  );
  const reports = useStore((state) =>
    preview ? previewData.reports : state.reports,
  );
  const stats = useMemo(
    () => selectStats({ cases, simNow, reports }),
    [cases, simNow, reports],
  );

  const SummaryItem = preview ? Link : "div";

  return (
    <>
      <div className="page-intro">
        {preview ? <h3>Visão geral</h3> : <h1>Visão geral</h1>}
        <p>Seus laudos, organizados por prioridade.</p>
      </div>
      <section className="summary" aria-label="Resumo">
        {SUMMARY.map((item) => (
          <SummaryItem
            className="summary-item"
            key={item.key}
            {...(preview ? { to: "/home" } : {})}
          >
            <span className="summary-icon" aria-hidden="true">
              {item.key === "open" ? (
                <Files size={20} />
              ) : item.key === "critical" ? (
                <Activity size={20} />
              ) : item.key === "escalated" ? (
                <ArrowUpRight size={20} />
              ) : (
                <Timer size={20} />
              )}
            </span>
            <div>
              <p className="summary-label">{item.label}</p>
              <p className="summary-value">{summaryValue(stats, item.key)}</p>
            </div>
          </SummaryItem>
        ))}
      </section>
      <CaseList preview={preview} />
    </>
  );
}

export default function DashboardShell({ preview = false }) {
  const [profile, setProfile] = useState(() => readProfile(sessionStorage));
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    hospitalId,
    hospitals,
    institutionOptions,
    hospitalIds,
    userKey,
    setHospitalId,
    setHospitalIds,
    syncUser,
  } = useHospital();
  const { pathname: routePath } = useLocation();
  const pathname = preview ? "/home" : routePath;
  const navigate = useNavigate();
  const activeSection =
    pathname === "/home" || pathname.startsWith("/caso/")
      ? "0"
      : pathname.startsWith("/nao-sinalizados")
        ? "1"
        : pathname.startsWith("/avaliacao")
          ? "2"
          : "none";
  const cases = useStore((state) =>
    preview ? previewData.cases : state.cases,
  );
  const reports = useStore((state) =>
    preview ? previewData.reports : state.reports,
  );
  const simNow = useStore((state) =>
    preview ? previewData.simNow : state.simNow,
  );
  const demoRef = useRef(null);
  useEffect(() => {
    function closeOnOutside(event) {
      const details = demoRef.current;
      if (!details?.open || details.contains(event.target)) return;
      details.open = false;
    }
    function closeOnEscape(event) {
      if (event.key !== "Escape" || !demoRef.current?.open) return;
      demoRef.current.open = false;
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const missedCount = useMemo(
    () => selectMissed({ cases, reports, simNow: 0 }).length,
    [cases, reports],
  );

  useEffect(() => {
    syncUser();
  }, [syncUser]);

  const Workspace = preview ? "div" : "main";

  return (
    <div className="app">
      {!preview && (
        <a className="skip-link" href="#workspace">
          Ir para os laudos
        </a>
      )}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link className="brand" to="/home" aria-label="Brightline, página principal" translate="no">
            <span className="brand-image">
              <img src={logo} alt="Brightline" width="156" height="59" />
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-menu-toggle"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="sidebar-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        <div
          id="sidebar-menu"
          className={`sidebar-body${menuOpen ? " is-open" : ""}`}
        >
          <nav
            className="sidebar-primary"
            data-active={activeSection}
            aria-label="Navegação principal"
          >
            <NavigationHighlight section={activeSection} menuOpen={menuOpen} />
            <NavLink
              data-section="0"
              to="/home"
              end
              className={
                pathname.startsWith("/caso/") ? "is-current-section" : undefined
              }
              onClick={() => setMenuOpen(false)}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>Visão geral</span>
            </NavLink>
            <NavLink
              data-section="1"
              to="/nao-sinalizados"
              onClick={() => setMenuOpen(false)}
            >
              <EyeOff size={18} aria-hidden="true" />
              <span>Não sinalizados</span>
              <span
                className="sidebar-count"
                aria-label={`${missedCount} não sinalizados`}
              >
                {missedCount}
              </span>
            </NavLink>
            <NavLink
              data-section="2"
              to="/avaliacao"
              onClick={() => setMenuOpen(false)}
            >
              <Sparkles size={18} aria-hidden="true" />
              <span>Avaliação da IA</span>
            </NavLink>
          </nav>
          <div className="sidebar-bottom">
            <details className="sidebar-demo" ref={demoRef}>
              <summary>
                <FlaskConical size={17} aria-hidden="true" />
                <span>Demonstração · +{simNow}h</span>
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              {preview ? (
                <p className="lp-preview-demo-link">
                  <a href="/login">Entrar para simular prazos</a>
                </p>
              ) : (
                <DemoClock />
              )}
            </details>
            <div className="clinical-note">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>IA sugere. Você valida.</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} aria-hidden="true" />
            <span>{crumb(pathname)}</span>
          </div>
          {!preview ? (
            <label className="hospital-selector">
              <Building2 size={17} aria-hidden="true" />
              <span className="hospital-selector-label">Instituição</span>
              <select
                aria-label="Selecionar hospital"
                value={hospitalId}
                onChange={async (event) => {
                  await switchInstitution(sessionStorage, event.target.value);
                  setHospitalId(event.target.value);
                }}
              >
                {hospitals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {preview ? (
            <span className="lp-preview-profile">Demonstração</span>
          ) : (
            <ProfileMenu
              profile={profile}
              onLogout={async () => {
                await logout(sessionStorage);
                navigate("/login", { replace: true });
              }}
            />
          )}
        </header>
        <Workspace
          className="workspace"
          id={preview ? "preview-workspace" : "workspace"}
          tabIndex={-1}
        >
          {preview ? (
            <Overview preview />
          ) : (
            <Routes>
              <Route path="/home" element={<Overview />} />
              <Route path="/caso/:id" element={<CaseDetail />} />
              <Route path="/nao-sinalizados" element={<Missed />} />
              <Route path="/avaliacao" element={<Evaluation />} />
              <Route
                path="/configuracoes"
                element={
                  <Settings
                    key={userKey}
                    profile={profile}
                    hospitals={institutionOptions}
                    selectedHospitalIds={hospitalIds}
                    onSave={async (next) => {
                      const result = await updateInstitutions(
                        sessionStorage,
                        next.hospitalIds,
                      );
                      setHospitalIds(next.hospitalIds);
                      setHospitalId(result.institution_id);
                      saveProfile(sessionStorage, next);
                      setProfile(next);
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          )}
          <footer className="workspace-footer">
            <span>Brightline · Inteligência clínica</span>
            <span>Decisões com acompanhamento humano</span>
          </footer>
        </Workspace>
      </div>
    </div>
  );
}
