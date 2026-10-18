import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Layers,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

const plans = [
  {
    name: "Essencial",
    model: "Luna Base",
    images: "25 mil",
    confidence: 75,
    icon: Layers,
    description: "O ponto de partida para conhecer a Luna.",
    training: "Base inicial de imagens",
    features: [
      "Revisão de laudos com a Luna",
      "Perguntas sobre pontos e áreas",
      "Histórico de acompanhamento",
    ],
    scope: "Conjunto inicial de treinamento, com escopo delimitado.",
  },
  {
    name: "Avançado",
    model: "Luna Plus",
    images: "100 mil",
    confidence: 85,
    icon: ScanLine,
    description: "Mais variedade para ampliar o repertório do modelo.",
    training: "Base ampliada e mais diversa",
    features: [
      "Todos os recursos do Essencial",
      "Modelo com treinamento ampliado",
      "Avaliação por categoria de achado",
    ],
    scope: "Evolução proposta com mais exemplos e diversidade de imagens.",
  },
  {
    name: "Institucional",
    model: "Luna Pro",
    images: "250 mil",
    confidence: 95,
    icon: ShieldCheck,
    description: "Uma evolução pensada para a sua instituição.",
    training: "Base ampliada + validação institucional",
    features: [
      "Todos os recursos do Avançado",
      "Avaliação no contexto da instituição",
      "Acompanhamento de versões do modelo",
    ],
    scope: "Validação proposta com dados representativos do contexto de uso.",
  },
];
export default function PricingSection() {
  const [selected, setSelected] = useState(null);
  return (
    <section
      id="planos"
      className="pricing-section lp-section"
      aria-labelledby="pricing-title"
    >
      <header className="pricing-heading">
        <h2 id="pricing-title">
          A Luna evolui.
          <br />
          <em>Seu plano acompanha.</em>
        </h2>
        <p>
          Escolha o nível de modelo para a sua equipe. Do treinamento inicial à
          avaliação no contexto da instituição.
        </p>
      </header>
      <div className="pricing-proposal">
        Prévia dos planos · Valores e versões dos modelos em definição
      </div>
      <section className="pricing-grid" aria-label="Planos da Luna">
        {plans.map((plan, i) => (
          <article
            className={`pricing-plan ${i === 1 ? "is-featured" : ""}`}
            key={plan.name}
          >
            <div className="pricing-plan-top">
              <plan.icon size={24} />
              <span>{plan.model}</span>
            </div>
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <div className="pricing-value">
              Sob consulta<small>Valores ainda não publicados</small>
            </div>
            <button onClick={() => setSelected(plan.name)}>
              Explorar este plano <ArrowUpRight size={18} />
            </button>
            <div className="pricing-image-count">
              <strong>{plan.images}</strong>
              <span>imagens na base de treinamento prevista</span>
            </div>
            <div className="pricing-confidence">
              <div>
                <span>Confiança ilustrativa</span>
                <strong>{plan.confidence}%</strong>
              </div>
              <div className="pricing-confidence-track" aria-hidden="true">
                <span style={{ width: `${plan.confidence}%` }} />
              </div>
              <small>Exemplo visual · desempenho não validado</small>
            </div>
            <h3>{plan.training}</h3>
            <p className="pricing-scope">{plan.scope}</p>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>
                  <Check size={17} />
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      {selected && (
        <section className="pricing-selection" role="status">
          <div>
            <strong>Você está explorando o plano {selected}.</strong>
            <p>
              Os planos estão em estruturação. Conheça a experiência disponível
              na demonstração.
            </p>
          </div>
          <a href="/login">
            Acessar demonstração <ArrowUpRight size={17} />
          </a>
          <button aria-label="Fechar seleção" onClick={() => setSelected(null)}>
            Fechar
          </button>
        </section>
      )}
      <section className="pricing-evidence">
        <div>
          <h2>
            Mais aprendizado.
            <br />
            <em>Resultados que precisam ser medidos.</em>
          </h2>
        </div>
        <div>
          <p>
            O número de imagens é parte da evolução do modelo. A comparação
            entre versões deve considerar também a diversidade dos dados, a
            calibração e os resultados de validação.
          </p>
          <p>
            Cada versão deverá apresentar sua base de treinamento e métricas de
            avaliação. Um plano avançado não implica uma porcentagem garantida
            de confiança em cada imagem.
          </p>
          <a href="/avaliacao">
            Consultar avaliação disponível <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </section>
  );
}
