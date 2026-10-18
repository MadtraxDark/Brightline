import { useMemo } from "react";
import { Activity, Files, Timer } from "lucide-react";
import CaseList from "./CaseList.jsx";
import { selectCases } from "../store/selectors.js";
import { useStore } from "../store/useStore.js";

export default function Missed() {
  const cases = useStore((state) => state.cases);
  const simNow = useStore((state) => state.simNow);
  const reports = useStore((state) => state.reports);
  const missed = useMemo(
    () => selectCases({ cases, simNow, reports }, { onlyUnflagged: true }),
    [cases, simNow, reports],
  );
  const open = missed.filter((item) => item.status !== "closed").length;
  const critical = missed.filter((item) => item.urgency === "critical").length;
  const cards = [
    {
      key: "detected",
      label: "Detectados pelo Brightline",
      value: missed.length,
      icon: <Files size={20} />,
    },
    {
      key: "open",
      label: "Ainda abertos",
      value: open,
      icon: <Timer size={20} />,
    },
    {
      key: "critical",
      label: "Críticos",
      value: critical,
      icon: <Activity size={20} />,
    },
  ];

  return (
    <>
      <div className="page-intro">
        <h1>Não sinalizados</h1>
        <p>
          Achados críticos e urgentes que o radiologista não sinalizou e que o
          Brightline detectou.
        </p>
      </div>
      <section className="summary summary-three" aria-label="Resumo">
        {cards.map((item) => (
          <div className="summary-item" key={item.key}>
            <span className="summary-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <p className="summary-label">{item.label}</p>
              <p className="summary-value">{item.value}</p>
            </div>
          </div>
        ))}
      </section>
      <CaseList onlyUnflagged title="Achados detectados pelo Brightline" />
    </>
  );
}
