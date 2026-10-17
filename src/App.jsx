import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Activity, Files, ShieldCheck, Timer, ArrowUpRight, LayoutDashboard, EyeOff, ChevronRight, ChevronDown, Sparkles, FlaskConical, Menu, X } from "lucide-react";
import logo from "./public/logo/logo-text.svg";
import CaseDetail from "./components/CaseDetail.jsx";
import CaseList from "./components/CaseList.jsx";
import DemoClock from "./components/DemoClock.jsx";
import Evaluation from "./components/Evaluation.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import ProfileMenu from "./components/ProfileMenu.jsx";
import Settings from "./components/Settings.jsx";
import NavigationHighlight from "./components/NavigationHighlight.jsx";
import { readProfile, saveProfile } from "./lib/profile.js";
import Missed from "./components/Missed.jsx";
import { isAuthenticated, logout } from "./lib/session.js";
import { formatAverage } from "./format.js";
import { selectMissed, selectStats } from "./store/selectors.js";
import { useStore } from "./store/useStore.js";

const SUMMARY = [
  { key: "open", label: "Abertos" },
  { key: "critical", label: "Críticos" },
  { key: "escalated", label: "Escalados" },
  { key: "avg_time_to_read_hours", label: "Tempo médio até leitura" },
];

function summaryValue(stats, key) {
  if (key === "avg_time_to_read_hours") return formatAverage(stats.avg_time_to_read_hours);
  if (key === "critical") return stats.urgency.critical;
  if (key === "escalated") return stats.status.escalated;
  const status = stats.status;
  return status.detected + status.notified + status.read + status.action_taken + status.escalated;
}

function crumb(pathname) {
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/caso/")) return "Caso";
  if (pathname.startsWith("/nao-sinalizados")) return "Não sinalizados";
  if (pathname.startsWith("/avaliacao")) return "Avaliação da IA";
  return "Visão geral";
}

function Overview() {
  const cases = useStore((state) => state.cases);
  const simNow = useStore((state) => state.simNow);
  const reports = useStore((state) => state.reports);
  const stats = useMemo(
    () => selectStats({ cases, simNow, reports }),
    [cases, simNow, reports],
  );

  return (
    <>
      <div className="page-intro"><h1>Visão geral</h1><p>Seus laudos, organizados por prioridade.</p></div>
      <section className="summary" aria-label="Resumo">
        {SUMMARY.map((item) => <div className="summary-item" key={item.key}>
          <span className="summary-icon" aria-hidden="true">{item.key === "open" ? <Files size={20} /> : item.key === "critical" ? <Activity size={20} /> : item.key === "escalated" ? <ArrowUpRight size={20} /> : <Timer size={20} />}</span>
          <div><p className="summary-label">{item.label}</p><p className="summary-value">{summaryValue(stats, item.key)}</p></div>
        </div>)}
      </section>
      <CaseList />
    </>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthenticated(sessionStorage)) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

function Shell() {
  const [profile, setProfile] = useState(() => readProfile(sessionStorage));
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeSection = pathname === "/" || pathname.startsWith("/caso/") ? "0"
    : pathname.startsWith("/nao-sinalizados") ? "1"
    : pathname.startsWith("/avaliacao") ? "2" : "none";
  const cases = useStore((state) => state.cases);
  const reports = useStore((state) => state.reports);
  const simNow = useStore((state) => state.simNow);
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

  return (
    <div className="app">
      <a className="skip-link" href="#workspace">Ir para os laudos</a>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand" translate="no"><span className="brand-image"><img src={logo} alt="Brightline" width="156" height="59" /></span></div>
          <button type="button" className="sidebar-menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="sidebar-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}</button>
        </div>
        <div id="sidebar-menu" className={`sidebar-body${menuOpen ? " is-open" : ""}`}>
          <nav className="sidebar-primary" data-active={activeSection} aria-label="Navegação principal">
            <NavigationHighlight section={activeSection} menuOpen={menuOpen} />
            <NavLink data-section="0" to="/" end className={pathname.startsWith("/caso/") ? "is-current-section" : undefined} onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} aria-hidden="true" /><span>Visão geral</span></NavLink>
            <NavLink data-section="1" to="/nao-sinalizados" onClick={() => setMenuOpen(false)}><EyeOff size={18} aria-hidden="true" /><span>Não sinalizados</span><span className="sidebar-count" aria-label={`${missedCount} não sinalizados`}>{missedCount}</span></NavLink>
            <NavLink data-section="2" to="/avaliacao" onClick={() => setMenuOpen(false)}><Sparkles size={18} aria-hidden="true" /><span>Avaliação da IA</span></NavLink>
          </nav>
          <div className="sidebar-bottom">
            <details className="sidebar-demo" ref={demoRef}><summary><FlaskConical size={17} aria-hidden="true" /><span>Demonstração · +{simNow}h</span><ChevronDown size={15} aria-hidden="true" /></summary><DemoClock /></details>
            <div className="clinical-note"><ShieldCheck size={15} aria-hidden="true" /><span>IA sugere. Você valida.</span></div>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14} aria-hidden="true" /><span>{crumb(pathname)}</span></div><ProfileMenu profile={profile} onLogout={() => { logout(sessionStorage); navigate("/login"); }} /></header>
        <main className="workspace" id="workspace" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/caso/:id" element={<CaseDetail />} />
            <Route path="/nao-sinalizados" element={<Missed />} />
            <Route path="/avaliacao" element={<Evaluation />} />
            <Route path="/configuracoes" element={<Settings profile={profile} onSave={next => { saveProfile(sessionStorage, next); setProfile(next); }} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="workspace-footer"><span>Brightline · Inteligência clínica</span><span>Decisões com acompanhamento humano</span></footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  if (pathname === "/login") return <Login />;
  if (pathname === "/cadastro") return <Register />;
  return (
    <RequireAuth>
      <Shell />
    </RequireAuth>
  );
}
