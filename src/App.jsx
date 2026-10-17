import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Files, ShieldCheck, Timer, ArrowUpRight, LayoutDashboard, EyeOff, ChevronRight, ArrowLeft } from "lucide-react";
import logo from "./public/logo/logo-text.svg";
import {
  closeCase,
  confirmRead,
  getCase,
  getCases,
  getStats,
  NETWORK_ERROR,
  registerAction,
} from "./api.js";
import CaseDetail from "./components/CaseDetail.jsx";
import CaseList from "./components/CaseList.jsx";
import { formatAverage } from "./format.js";

const SUMMARY = [
  { key: "open", label: "Abertos" },
  { key: "critical", label: "Críticos" },
  { key: "escalated", label: "Escalados" },
  { key: "avg_time_to_read_hours", label: "Tempo médio até leitura" },
];

export default function App() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [view, setView] = useState("queue");
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const detailRequest = useRef(0);

  const refreshDetail = useCallback(async (id) => {
    const request = ++detailRequest.current;
    if (!id) {
      setDetail(null);
      return;
    }
    const next = await getCase(id);
    if (request === detailRequest.current) setDetail(next);
  }, []);

  const load = useCallback(
    async (nextView = view, preferredId = selectedId) => {
      setLoading(true);
      setError("");
      try {
        const [nextCases, nextStats] = await Promise.all([
          getCases(nextView),
          getStats(),
        ]);
        setCases(nextCases);
        setStats(nextStats);
        const stillThere = nextCases.some((item) => item.id === preferredId);
        const id = stillThere ? preferredId : nextCases[0]?.id ?? null;
        setSelectedId(id);
        if (id) await refreshDetail(id);
        else setDetail(null);
      } catch {
        setError(NETWORK_ERROR);
      } finally {
        setLoading(false);
      }
    },
    [refreshDetail, selectedId, view],
  );

  useEffect(() => {
    load(view, null);
    // carga inicial e troca de fila
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function afterMutation(id) {
    const [nextCases, nextStats] = await Promise.all([getCases(view), getStats()]);
    setCases(nextCases);
    setStats(nextStats);
    const visible = nextCases.some((item) => item.id === id);
    if (visible) {
      setSelectedId(id);
      await refreshDetail(id);
    } else {
      await refreshDetail(id);
    }
  }

  async function selectCase(id) {
    setDetail(null);
    setDetailOpen(true);
    setSelectedId(id);
    try {
      await refreshDetail(id);
    } catch {
      setError(NETWORK_ERROR);
    }
  }

  function navigate(nextView) {
    setDetailOpen(false);
    setView(nextView);
  }

  return (
    <div className="app">
      <a className="skip-link" href="#workspace">Ir para os laudos</a>
      <aside className="sidebar">
        <div className="brand" translate="no"><span className="brand-image"><img src={logo} alt="Brightline" width="156" height="59" /></span></div>
        <p className="sidebar-caption">Gestão de laudos</p>
        <nav aria-label="Navegação principal">
          <button type="button" aria-current={view === "queue" ? "page" : undefined} onClick={() => navigate("queue")}><LayoutDashboard size={18} aria-hidden="true" /> Visão geral <ChevronRight size={15} className="nav-arrow" aria-hidden="true" /></button>
          <button type="button" aria-current={view === "unflagged" ? "page" : undefined} onClick={() => navigate("unflagged")}><EyeOff size={18} aria-hidden="true" /> Não sinalizados</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="clinical-note"><ShieldCheck size={18} aria-hidden="true" /><span>Apoio à decisão clínica<small>IA sugere. Você valida.</small></span></div>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14} aria-hidden="true" /><span>{view === "queue" ? "Visão geral" : "Não sinalizados"}</span>{detailOpen ? <><ChevronRight size={14} aria-hidden="true" /><span>Laudo</span></> : null}</div></header>
        <main className="workspace" id="workspace" tabIndex={-1}>
          {detailOpen ? <div className="detail-navigation"><button className="back-button" type="button" onClick={() => setDetailOpen(false)}><ArrowLeft size={17} aria-hidden="true" /> Voltar aos laudos</button><span>Laudo {selectedId?.toUpperCase()}</span></div> : <>
            <div className="page-intro"><h1>{view === "queue" ? "Visão geral" : "Não sinalizados"}</h1><p>{view === "queue" ? "Seus laudos, organizados por prioridade." : "Achados identificados pela IA para sua revisão."}</p></div>
            <section className="summary" aria-label="Resumo">
              {SUMMARY.map((item) => <div className="summary-item" key={item.key}>
                <span className="summary-icon" aria-hidden="true">{item.key === "open" ? <Files size={20} /> : item.key === "critical" ? <Activity size={20} /> : item.key === "escalated" ? <ArrowUpRight size={20} /> : <Timer size={20} />}</span>
                <div><p className="summary-label">{item.label}</p><p className="summary-value">{stats ? item.key === "avg_time_to_read_hours" ? formatAverage(stats[item.key]) : stats[item.key] : "—"}</p></div>
              </div>)}
            </section>
          </>}
          {error ? <div className="panel state-block"><p role="alert">{error}</p><button type="button" className="btn-secondary" onClick={() => load(view, selectedId)}>Tentar de novo</button></div> : loading || (detailOpen && !detail) ? <div className="panel state-block" aria-busy="true"><p role="status">Carregando laudos…</p></div> : detailOpen ? <CaseDetail key={detail?.id || "none"} caseData={detail} onRead={confirmRead} onRegister={registerAction} onClose={closeCase} onUpdated={afterMutation} /> : <CaseList cases={cases} onSelect={selectCase} />}
          <footer className="workspace-footer"><span>Brightline · Inteligência clínica</span><span>Decisões com acompanhamento humano</span></footer>
        </main>
      </div>
    </div>
  );
}
