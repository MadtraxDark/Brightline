import SectionTransition from "./components/SectionTransition.jsx";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  FileCheck,
  ShieldCheck,
  LayoutDashboard,
  EyeOff,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import LandingPage from "./LandingPage.jsx";
import logo from "./public/logo/logo-text.svg";
import mark from "./public/logo/favicon-logo.svg";
import CaseDetail from "./components/CaseDetail.jsx";
import CaseList from "./components/CaseList.jsx";
import Evaluation from "./components/Evaluation.jsx";
import Login from "./components/Login.jsx";
import RadiographClassifier from "./components/RadiographClassifier.jsx";
import RadiographLibrary from "./components/RadiographLibrary.jsx";
import Register from "./components/Register.jsx";
import ProfileMenu from "./components/ProfileMenu.jsx";
import Settings from "./components/Settings.jsx";
import NavigationHighlight from "./components/NavigationHighlight.jsx";
import LunaWidget from "./components/luna/LunaWidget.jsx";
import { isLunaVisible } from "./lib/luna.js";
import { readProfile, saveProfile } from "./lib/profile.js";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "./lib/sidebarPref.js";
import Missed from "./components/Missed.jsx";
import { logout, validateSession } from "./lib/session.js";
import { formatRemaining } from "./lib/formatRemaining.js";
import { buildSidebarItems } from "./lib/sidebarItems.js";
import { buildSearch, parseView } from "./lib/viewState.js";
import {
  selectLanes,
  selectMissed,
  selectNextDeadline,
} from "./store/selectors.js";
import { UrgencyIcon } from "./components/UrgencyBadge.jsx";
import { useStore } from "./store/useStore.js";

const LANES = [
  ["critical", "Críticos"],
  ["urgent", "Urgentes"],
  ["actionable", "Acionáveis"],
];

function crumb(pathname) {
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/caso/")) return "Caso";
  if (pathname.startsWith("/nao-sinalizados")) return "Não sinalizados";
  if (pathname.startsWith("/avaliacao")) return "Avaliação da IA";
  return "Visão geral";
}

function Overview() {
  const [params, setParams] = useSearchParams();
  const view = parseView(params.toString());
  const cases = useStore((state) => state.cases);
  const simNow = useStore((state) => state.simNow);
  const reports = useStore((state) => state.reports);
  const snapshot = useMemo(
    () => ({ cases, simNow, reports }),
    [cases, simNow, reports],
  );
  const lanes = useMemo(() => selectLanes(snapshot), [snapshot]);
  const next = useMemo(() => selectNextDeadline(snapshot), [snapshot]);
  function applyView(nextView) {
    const search = buildSearch(nextView);
    setParams(
      new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    );
  }

  return (
    <div className="overview">
      <div className="overview-head">
        <h1>Visão geral</h1>
        {next ? (
          <Link className="overview-next" to={`/caso/${next.id}`}>
            Abrir próximo · {formatRemaining(next.time_remaining_hours)}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <p className="overview-idle">Nada aguardando leitura.</p>
        )}
      </div>
      <section className="summary" aria-label="Resumo">
        {LANES.map(([level, label]) => {
          const bucket = lanes[level];
          const hot = level === "critical" && bucket.open > 0;
          return (
            <button
              type="button"
              className={hot ? "summary-item is-critical-open" : "summary-item"}
              key={level}
              aria-pressed={view.lane === level}
              onClick={() =>
                applyView({
                  ...view,
                  lane: view.lane === level ? "all" : level,
                })
              }
            >
              <span
                className="summary-icon"
                data-level={level}
                aria-hidden="true"
              >
                <UrgencyIcon level={level} />
              </span>
              <div>
                <p className="summary-value">{bucket.open}</p>
                <p className="summary-word">{label}</p>
                {bucket.overdue > 0 ? (
                  <p className="summary-overdue">
                    {bucket.overdue === 1
                      ? "1 atrasado"
                      : `${bucket.overdue} atrasados`}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          className="summary-item"
          aria-pressed={view.lane === "noAlert"}
          onClick={() =>
            applyView({
              ...view,
              lane: view.lane === "noAlert" ? "all" : "noAlert",
            })
          }
        >
          <span className="summary-icon" aria-hidden="true">
            <FileCheck size={20} />
          </span>
          <div>
            <p className="summary-value">{lanes.noAlert.count}</p>
            <p className="summary-word">Sem alerta</p>
            <p className="summary-note">Não é liberação clínica</p>
          </div>
        </button>
      </section>
      <CaseList
        variant="overview"
        grouped
        lane={view.lane}
        showResolved={view.showResolved}
        onToggleResolved={() =>
          applyView({ ...view, showResolved: !view.showResolved })
        }
      />
    </div>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function checkSession() {
      setStatus("loading");
      try {
        const user = await validateSession(sessionStorage);
        if (active) {
          setStatus(
            !user
              ? "anonymous"
              : user.active_institution_id
                ? "authenticated"
                : "needs-institution",
          );
        }
      } catch (reason) {
        if (active) {
          setError(reason.message);
          setStatus("error");
        }
      }
    }
    checkSession();
    window.addEventListener("brightline:institution-changed", checkSession);
    return () => {
      active = false;
      window.removeEventListener(
        "brightline:institution-changed",
        checkSession,
      );
    };
  }, [attempt]);
  if (status === "loading")
    return (
      <div className="session-state" role="status">
        Verificando sua sessão…
      </div>
    );
  if (status === "error")
    return (
      <div className="session-state">
        <p role="alert">{error}</p>
        <button
          className="btn-primary"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (
    status === "needs-institution" &&
    location.pathname !== "/configuracoes"
  ) {
    return <Navigate to="/configuracoes" replace />;
  }
  return children;
}

function Shell() {
  const [profile, setProfile] = useState(() => readProfile(sessionStorage));
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    readSidebarCollapsed(localStorage),
  );
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const view = parseView(search);
  const activeSection =
    pathname === "/home" || pathname.startsWith("/caso/")
      ? "0"
      : pathname.startsWith("/nao-sinalizados")
        ? "1"
        : pathname.startsWith("/avaliacao")
          ? "2"
          : "none";
  const cases = useStore((state) => state.cases);
  const simNow = useStore((state) => state.simNow);
  const reports = useStore((state) => state.reports);
  const menu = useMemo(
    () => buildSidebarItems({ cases, simNow, reports }),
    [cases, simNow, reports],
  );
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    writeSidebarCollapsed(localStorage, next);
  }
  const missedCount = useMemo(
    () => selectMissed({ cases, reports, simNow: 0 }).length,
    [cases, reports],
  );

  return (
    <div className={collapsed ? "app is-sidebar-collapsed" : "app"}>
      <a className="skip-link" href="#workspace">
        Ir para os laudos
      </a>
      <aside className="sidebar">
        <div className="brand" translate="no">
          <span className="brand-image">
            <img
              className="brand-full"
              src={logo}
              alt="Brightline"
              width="156"
              height="59"
            />
            <img
              className="brand-mark"
              src={mark}
              alt=""
              width="32"
              height="32"
            />
          </span>
        </div>
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
        <div
          id="sidebar-menu"
          className={`sidebar-body${menuOpen ? " is-open" : ""}`}
        >
          <div className="sidebar-scroll">
            <NavigationHighlight
              section={activeSection}
              menuOpen={menuOpen}
              collapsed={collapsed}
            />
            <nav className="sidebar-primary" aria-label="Gestão de laudos">
              <hr className="sidebar-divider" />
              <NavLink
                data-section="0"
                data-tip="Visão geral"
                to="/home"
                end
                aria-label={`Visão geral, ${menu.sections[0].items[0].count} casos`}
                className={
                  pathname.startsWith("/caso/")
                    ? "is-current-section"
                    : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                <LayoutDashboard size={22} aria-hidden="true" />
                <span className="sidebar-label">Visão geral</span>
                <span
                  className="sidebar-count is-expanded-only"
                  aria-hidden="true"
                >
                  {menu.sections[0].items[0].count}
                </span>
              </NavLink>
              <NavLink
                data-section="1"
                data-tip="Não sinalizados"
                to="/nao-sinalizados"
                aria-label={`Não sinalizados, ${missedCount}`}
                onClick={() => setMenuOpen(false)}
              >
                <EyeOff size={22} aria-hidden="true" />
                <span className="sidebar-label">Não sinalizados</span>
                <span className="sidebar-count" aria-hidden="true">
                  {missedCount}
                </span>
              </NavLink>
            </nav>
            <nav className="sidebar-priority" aria-label="Por prioridade">
              <hr className="sidebar-divider" />
              {menu.sections[1].items.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  data-level={item.id}
                  data-tip={`${item.label}, ${item.count} casos`}
                  aria-current={view.lane === item.id ? "true" : undefined}
                  aria-label={`${item.label}, ${item.count} casos`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.id === "noAlert" ? (
                    <FileCheck size={16} aria-hidden="true" />
                  ) : (
                    <UrgencyIcon level={item.id} size={16} />
                  )}
                  <span className="sidebar-label">{item.label}</span>
                  <span className="sidebar-count" aria-hidden="true">
                    {item.count}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          {menu.next ? (
            <Link className="sidebar-deadline" to={`/caso/${menu.next.id}`}>
              <span className="sidebar-section">Próximo prazo</span>
              <strong
                className={
                  menu.next.time_remaining_hours < 0 ? "is-overdue" : undefined
                }
              >
                {formatRemaining(menu.next.time_remaining_hours)}
              </strong>
              {menu.next.escalation ? (
                <span className="sidebar-deadline-escalation">
                  {menu.next.escalation}
                </span>
              ) : null}
              <span className="sidebar-deadline-finding">
                {menu.next.finding}
              </span>
            </Link>
          ) : (
            <div className="sidebar-deadline">
              <span className="sidebar-section">Próximo prazo</span>
              <span className="sidebar-deadline-finding">
                Nenhum caso aguardando leitura.
              </span>
            </div>
          )}
          <div className="sidebar-bottom">
            <button
              type="button"
              className="sidebar-collapse"
              data-tip={collapsed ? "Expandir menu" : undefined}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-expanded={!collapsed}
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <PanelLeftOpen size={22} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={22} aria-hidden="true" />
              )}
              {collapsed ? null : (
                <span className="sidebar-label">Recolher menu</span>
              )}
            </button>
            <div
              className="clinical-note"
              data-tip="IA sugere. Você valida."
              aria-label="IA sugere. Você valida."
            >
              <ShieldCheck size={15} aria-hidden="true" />
              <span className="sidebar-label">IA sugere. Você valida.</span>
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
          <div className="topbar-end">
            <ProfileMenu
              profile={profile}
              onLogout={() => {
                logout(sessionStorage);
                navigate("/login");
              }}
            />
          </div>
        </header>
        <main className="workspace" id="workspace" tabIndex={-1}>
          <SectionTransition>
            {(displayedLocation) => (
              <Routes location={displayedLocation}>
                <Route path="/home" element={<Overview />} />
                <Route path="/caso/:id" element={<CaseDetail />} />
                <Route path="/nao-sinalizados" element={<Missed />} />
                <Route path="/avaliacao" element={<Evaluation />} />
                <Route
                  path="/configuracoes"
                  element={
                    <Settings
                      profile={profile}
                      onSave={(next) => {
                        saveProfile(sessionStorage, next);
                        setProfile(next);
                      }}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            )}
          </SectionTransition>
          <footer className="workspace-footer">
            <span>Brightline · Inteligência clínica</span>
            <span>Decisões com acompanhamento humano</span>
          </footer>
        </main>
      </div>
      {isLunaVisible(pathname) ? <LunaWidget /> : null}
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/classificar")
    return (
      <RequireAuth>
        <RadiographClassifier />
      </RequireAuth>
    );
  if (path === "/radiografias")
    return (
      <RequireAuth>
        <RadiographLibrary />
      </RequireAuth>
    );
  if (path === "/") return <LandingPage />;
  if (path === "/login") return <Login />;
  if (path === "/cadastro") return <Register />;
  return (
    <RequireAuth>
      <Shell />
    </RequireAuth>
  );
}
