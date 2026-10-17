import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  FileText,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import logo from "./public/logo/logo-text.svg";
import useLenisScroll from "./useLenisScroll.js";
import useTitleAnimation from "./useTitleAnimation.js";
import LandingHeader from "./components/LandingHeader.jsx";
import BenefitsCarousel from "./components/BenefitsCarousel.jsx";
import FaqItem from "./components/FaqItem.jsx";
import reports from "./data/reports.json" with { type: "json" };
import cache from "./data/extractions_cache.json" with { type: "json" };
import { getMissed, loadCases } from "./engine/engine.js";
import DashboardShell from "./components/DashboardShell.jsx";

const previewState = loadCases(reports, cache);
const examples = previewState.cases;
const missedCount = getMissed(previewState).length;

function ProductPreview() {
  return (
    <div className="lp-product" role="img" aria-label="Prévia ilustrativa do painel Brightline com indicadores, menu e três laudos fictícios.">
      <div className="lp-product-chrome">
        <span className="lp-window-dots"><i /><i /><i /></span>
        <span><ShieldCheck size={11} /> Brightline · Prévia ilustrativa</span>
        <span className="lp-live-dot" />
      </div>
      <div className="lp-dashboard-preview" inert aria-hidden="true"><DashboardShell preview /></div>
      <div className="lp-product-foot">
        <span><span className="lp-live-dot" /> {reports.length} laudos sintéticos · dados da demonstração</span>
        <span>Prévia visual · dados fictícios</span>
      </div>
    </div>
  );
}

const questions = [
  [
    "O que o Brightline faz?",
    "O Brightline identifica achados prioritários no texto de laudos, apresenta a evidência que sustenta a sinalização e organiza o acompanhamento de cada caso, da revisão à confirmação de leitura e ao registro da conduta.",
  ],
  [
    "A inteligência artificial toma decisões clínicas?",
    "A IA sugere achados para revisão. A validação, a confirmação de leitura e as decisões sobre a conduta ficam com o profissional. O Brightline foi pensado para apoiar esse acompanhamento.",
  ],
  [
    "Posso experimentar o produto?",
    `Sim. O botão “Explorar a demonstração” leva ao login, com opção de criar sua conta. Você encontra ${reports.length} laudos sintéticos e ${examples.length} casos para revisar evidências, confirmar leituras e registrar condutas. O cadastro salva sua conta para os próximos acessos; os laudos da demonstração continuam fictícios.`,
  ],
  [
    "O que aparece em Não sinalizados?",
    `A fila reúne achados críticos e urgentes detectados pelo Brightline que não estavam sinalizados pelo radiologista. A base demonstrativa atual contém ${missedCount} desses casos, com a evidência para revisão humana.`,
  ],
  [
    "Como posso testar os prazos e as escalações?",
    "No painel, abra Demonstração e avance o relógio em 1, 6 ou 24 horas. Casos sem leitura confirmada podem escalar do médico solicitante ao radiologista e à coordenação. As mudanças ficam na linha do tempo; o reset permite recomeçar. Os prazos e as notificações são simulados.",
  ],
  [
    "Como a IA é avaliada?",
    "A página Avaliação da IA mostra recall dos críticos, recall geral, precisão e listas de falsos positivos e negativos. Os resultados atuais são de exemplo, em um conjunto pequeno de laudos sintéticos, e não representam desempenho clínico validado.",
  ],
  [
    "O produto já está pronto para uso clínico?",
    "O Brightline está em fase de protótipo. A demonstração usa laudos sintéticos e resultados ilustrativos, sem validação de desempenho clínico. Integrações com sistemas hospitalares e envio real de notificações ainda não fazem parte da versão atual.",
  ],
];

export default function LandingPage() {
  const scrollRoot = useLenisScroll();
  useTitleAnimation(scrollRoot);
  return (
    <div className="landing" ref={scrollRoot}>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo">
        <section className="lp-hero" id="produto">

          <div className="lp-hero-copy">
            <h1>
              Um achado importante
              <br />
              merece um <em>próximo passo.</em>
            </h1>
            <p>
              Revise achados críticos, urgentes e acionáveis com a evidência
              do laudo. Acompanhe responsáveis, prazos, leitura e conduta
              até o encerramento de cada caso.
            </p>
            <div className="lp-hero-actions">
              <a className="lp-button lp-button-primary" href="/login">
                Explorar a demonstração <ArrowUpRight size={18} />
              </a>
              <a className="lp-text-link" href="#como-funciona">
                Conheça o fluxo <ArrowRight size={17} />
              </a>
            </div>
            <div className="lp-hero-assurance">
              <ShieldCheck size={15} />
              <span>IA sugere. O profissional valida. O cuidado continua.</span>
            </div>
          </div>
          <div className="lp-preview-wrap" id="demonstracao">
            <div className="lp-preview-caption">
              <h2>Do achado à ação, em um só lugar.</h2>
              <p>Uma prévia de como seus laudos ficam organizados.</p>
            </div>
            <div className="lp-preview-stage">
              <ProductPreview />
            </div>
          </div>
          <a className="lp-scroll" href="#como-funciona">
            Um caminho mais claro para cada achado <ChevronDown size={16} />
          </a>
        </section>
        <BenefitsCarousel />
        <section className="lp-flow lp-section" id="como-funciona">
          <div className="lp-section-heading">
            <div>

              <h2>
                O laudo é o começo.
                <br />
                <em>O acompanhamento também importa.</em>
              </h2>
            </div>
            <p>
              Informação relevante ganha um caminho claro, com prioridade,
              contexto e uma próxima ação.
            </p>
          </div>
          <div className="lp-steps">
            {[
              {
                number: "01",
                icon: ScanLine,
                title: "Identifique o que importa",
                text: "Consulte achados críticos, urgentes e acionáveis, incluindo os não sinalizados pelo radiologista, com a evidência em destaque.",
                label: "Do texto ao contexto",
              },
              {
                number: "02",
                icon: ShieldCheck,
                title: "Revise com clareza",
                text: "Compare a sugestão com o laudo, veja o responsável e o prazo e confirme a leitura. A decisão continua humana.",
                label: "Da sinalização à validação",
              },
              {
                number: "03",
                icon: CheckCheck,
                title: "Acompanhe o próximo passo",
                text: "Registre a conduta e encerre o caso. Na demonstração, avance o relógio para acompanhar prazos e escalações na linha do tempo.",
                label: "Da leitura à ação",
              },
            ].map(({ number, icon: Icon, title, text, label }) => (
              <article className="lp-step" key={number}>
                <div className="lp-step-top">
                  <span>{number}</span>
                  <Icon size={25} strokeWidth={1.5} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="lp-step-label">
                  {label} <ArrowRight size={15} />
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="lp-difference lp-section" id="diferenciais">
          <div className="lp-difference-copy">

            <h2>
              Visibilidade para a equipe.
              <br />
              <em>Continuidade para o cuidado.</em>
            </h2>
            <p>
              Um achado não termina quando o laudo é emitido. O Brightline
              organiza o que vem depois.
            </p>
            <a className="lp-text-link" href="/login">
              Veja isso na prática <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="lp-benefits">
            {[
              [
                "Interface responsiva",
                "O site se adapta à tela do seu celular, tablet ou computador, com navegação e conteúdo ajustados a cada dispositivo.",
                Smartphone,
              ],
              [
                "Prioridade que orienta",
                "Casos organizados por urgência e prazo para facilitar a revisão do que precisa de atenção primeiro.",
                Clock3,
              ],
              [
                "Evidência, não uma caixa-preta",
                "O trecho do laudo acompanha o achado sugerido. Mais contexto para uma revisão consciente.",
                FileText,
              ],
              [
                "Achados que merecem uma segunda revisão",
                "Uma fila dedicada aos críticos e urgentes não sinalizados pelo radiologista, com o trecho que sustenta cada sugestão.",
                ScanLine,
              ],
              [
                "Prazos e responsáveis à vista",
                "Simule a passagem do tempo e acompanhe a escalação entre solicitante, radiologista e coordenação, até confirmar a leitura.",
                Clock3,
              ],
              [
                "Avaliação que você pode consultar",
                "Recall, precisão e falsos positivos e negativos disponíveis no painel. Os resultados da demonstração são ilustrativos.",
                Sparkles,
              ],
              [
                "Um histórico que faz sentido",
                "Leitura, conduta, escalações e encerramento reunidos na linha do tempo do caso, com cada etapa registrada para consulta.",
                CheckCheck,
              ],
            ].map(([title, text, Icon]) => (
              <article key={title}>
                <span className="lp-benefit-icon">
                  <Icon size={21} strokeWidth={1.5} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="lp-human">
          <div className="lp-human-symbol" aria-hidden="true">
            <ShieldCheck size={50} strokeWidth={1} />
          </div>

          <h2>
            A inteligência é artificial.
            <br />
            <em>A decisão é sua.</em>
          </h2>
          <p>
            O Brightline conecta informação e acompanhamento.
            <br />O profissional segue no centro de cada decisão.
          </p>
          <span className="lp-human-note">
            <Check size={14} /> Sugestões com evidência <span>·</span> Revisão
            humana <span>·</span> Ações registradas
          </span>
        </section>
        <section className="lp-faq lp-section" id="duvidas">
          <div>

            <h2>
              Um pouco mais
              <br />
              <em>de clareza.</em>
            </h2>
            <p>
              Conheça o escopo do produto
              <br />e da demonstração.
            </p>
          </div>
          <div className="lp-questions">
            {questions.map(([question, answer]) => (
              <FaqItem key={question} question={question} answer={answer} />
            ))}
          </div>
        </section>
        <section className="lp-final-cta">
          <div>

            <h2>
              Veja o próximo passo.
              <br />
              <em>Antes de dar o seu.</em>
            </h2>
            <p>Entre na demonstração: {reports.length} laudos sintéticos, {examples.length} casos e um fluxo completo de acompanhamento.</p>
          </div>
          <a className="lp-button lp-button-primary" href="/login">
            Explorar a demonstração <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <a className="lp-logo" href="/" aria-label="Brightline — início">
            <img src={logo} alt="Brightline" width="138" />
          </a>
          <span>Do achado ao cuidado.</span>
          <a href="#conteudo">
            Voltar ao início <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Brightline</span>
          <p>
            Protótipo com dados sintéticos. Resultados ilustrativos, sem
            validação de desempenho clínico.
          </p>
          <span>Feito para conectar o cuidado.</span>
        </div>
      </footer>
    </div>
  );
}
