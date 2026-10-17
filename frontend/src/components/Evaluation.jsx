import evaluation from "../data/evaluation.json";
import { Activity, Files, ShieldCheck } from "lucide-react";
import { normalizeName } from "../lib/evaluate.js";
import { formatPercent, precision, recall } from "../lib/metrics.js";
import UrgencyBadge from "./UrgencyBadge.jsx";

const recallCritical = recall(evaluation.critical.tp, evaluation.critical.fn);
const recallOverall = recall(evaluation.overall.tp, evaluation.overall.fn);
const precisionOverall = precision(evaluation.overall.tp, evaluation.overall.fp);

const cards = [
  {
    key: "critical",
    label: "Recall dos críticos",
    value: formatPercent(recallCritical),
    count: `${evaluation.critical.tp} de ${evaluation.critical.tp + evaluation.critical.fn}`,
    note: "Achados críticos que o Brightline encontrou.",
    icon: <Activity size={20} />,
    lead: true,
  },
  {
    key: "recall",
    label: "Recall geral",
    value: formatPercent(recallOverall),
    count: `${evaluation.overall.tp} de ${evaluation.overall.tp + evaluation.overall.fn}`,
    icon: <Files size={20} />,
  },
  {
    key: "precision",
    label: "Precisão",
    value: formatPercent(precisionOverall),
    count: `${evaluation.overall.tp} de ${evaluation.overall.tp + evaluation.overall.fp}`,
    icon: <ShieldCheck size={20} />,
  },
];

function swappedKey(item) {
  return `${item.report_id}|${normalizeName(item.finding)}`;
}

const swapped = new Set();
if (evaluation.overall.wrong_urgency > 0) {
  const positives = new Set(evaluation.false_positives.map(swappedKey));
  for (const item of evaluation.false_negatives) {
    const key = swappedKey(item);
    if (positives.has(key)) swapped.add(key);
  }
}

function FindingList({ title, items }) {
  return (
    <section className="panel eval-list">
      <h2>{title}</h2>
      {items.length === 0 ? <p>Nenhum.</p> : (
        <ul>
          {items.map((item) => (
            <li key={`${item.report_id}-${item.finding}-${item.urgency}`}>
              <span>{item.report_id}</span>
              <span>{item.finding}</span>
              <UrgencyBadge level={item.urgency} />
              {swapped.has(swappedKey(item)) ? <span>Urgência trocada</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Evaluation() {
  return (
    <>
      <div className="page-intro">
        <h1>Avaliação da IA</h1>
      </div>
      <p className="eval-banner">
        Avaliação em conjunto sintético pequeno, ilustrativa. Não é desempenho clínico.
        {evaluation.example ? " Dados de exemplo." : ""}
      </p>
      <section className="summary summary-metrics" aria-label="Métricas">
        {cards.map((item) => (
          <div className={item.lead ? "summary-item summary-lead" : "summary-item"} key={item.key}>
            <span className="summary-icon" aria-hidden="true">{item.icon}</span>
            <div>
              <p className="summary-label">{item.label}</p>
              <div className="metric-line">
                <p className="summary-value">{item.value}</p>
                <p className="summary-label">{item.count}</p>
              </div>
              {item.note ? <p className="summary-label">{item.note}</p> : null}
            </div>
          </div>
        ))}
      </section>
      {evaluation.overall.wrong_urgency > 0 ? (
        <p className="eval-context">Achados com urgência classificada errada: {evaluation.overall.wrong_urgency}</p>
      ) : null}
      <div className="eval-lists">
        <FindingList title="Achados que a IA não encontrou (falsos negativos)" items={evaluation.false_negatives} />
        <FindingList title="Alertas que não eram achados (falsos positivos)" items={evaluation.false_positives} />
      </div>
      <p className="eval-priority">O Brightline é ajustado para não perder achados graves, mesmo que gere alguns alertas a mais. Por isso o recall dos críticos é a métrica principal.</p>
    </>
  );
}
