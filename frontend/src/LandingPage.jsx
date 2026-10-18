import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  FileText,
  Laptop,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import logo from "./public/logo/logo-text.svg";
import useLenisScroll from "./useLenisScroll.js";
import useTitleAnimation from "./useTitleAnimation.js";
import useScrollReveal from "./useScrollReveal.js";
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
    <div
      className="lp-product"
      role="img"
      aria-label="Prévia ilustrativa do painel Brightline com indicadores, menu e três laudos fictícios."
    >
      <div className="lp-product-chrome">
        <span className="lp-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>
          <ShieldCheck size={11} /> Brightline · Prévia ilustrativa
        </span>
        <span className="lp-live-dot" />
      </div>
      <div className="lp-dashboard-preview" inert aria-hidden="true">
        <DashboardShell preview />
      </div>
      <div className="lp-product-foot">
        <span>
          <span className="lp-live-dot" /> {reports.length} laudos sintéticos ·
          dados da demonstração
        </span>
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
  useScrollReveal(scrollRoot);
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
              Revise achados críticos, urgentes e acionáveis com a evidência do
              laudo. Acompanhe responsáveis, prazos, leitura e conduta até o
              encerramento de cada caso.
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
          <div className="lp-difference-details">
            <div
              className="lp-device-showcase"
              role="img"
              aria-label="Prévias separadas do painel Brightline no notebook e no celular."
            >
              <div className="lp-device-column lp-laptop-column">
                <div className="lp-laptop-preview" inert aria-hidden="true">
                  <div className="lp-laptop-screen">
                    <div className="lp-laptop-display">
                      <div className="lp-laptop-ui">
                        <aside className="lp-laptop-sidebar">
                          <strong>Brightline</strong>
                          <span className="is-active">Visão geral</span>
                          <span>Não sinalizados</span>
                          <span>Avaliação da IA</span>
                        </aside>
                        <div className="lp-laptop-content">
                          <header>
                            <span>Workspace　›　Visão geral</span>
                            <span>Demonstração</span>
                          </header>
                          <div className="lp-laptop-overview">
                            <h3>Visão geral</h3>
                            <div className="lp-laptop-metrics">
                              <div>
                                <small>Abertos</small>
                                <b>06</b>
                              </div>
                              <div>
                                <small>Críticos</small>
                                <b>02</b>
                              </div>
                              <div>
                                <small>Escalados</small>
                                <b>00</b>
                              </div>
                            </div>
                            <div className="lp-laptop-table">
                              <strong>Laudos em acompanhamento</strong>
                              <div>
                                <span>Laudo</span>
                                <span>Prioridade</span>
                                <span>Responsável</span>
                              </div>
                              <div>
                                <span>Pneumotórax hipertensivo</span>
                                <b>Crítico</b>
                                <span>Dr. Paulo Mendes</span>
                              </div>
                              <div>
                                <span>Hemorragia subaracnóidea</span>
                                <b>Crítico</b>
                                <span>Dra. Marina Lopes</span>
                              </div>
                              <div>
                                <span>Apendicite aguda</span>
                                <b>Urgente</b>
                                <span>Dra. Helena Costa</span>
                              </div>
                            </div>
                          </div>
                          <div className="lp-laptop-activity">
                            <strong>Atividade recente</strong>
                            <div>
                              <span>08:42</span>
                              <span>Leitura confirmada</span>
                              <b>Dra. Ana Costa</b>
                            </div>
                            <div>
                              <span>08:31</span>
                              <span>Conduta registrada</span>
                              <b>Dr. Paulo Mendes</b>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lp-laptop-base" />
                </div>
                <div className="lp-device-caption">
                  <Laptop size={15} />
                  <span>Painel no computador</span>
                </div>
              </div>
              <div className="lp-device-column lp-phone-column">
                <div className="lp-phone-slot">
                  <div className="lp-phone-frame relative w-56 rounded-[34px] border-2 border-phone-shell bg-phone-shell p-2 shadow-[0_18px_38px_#1b272a26,0_4px_10px_#1b272a1a]">
                    <div className="absolute left-1/2 top-3.25 z-10 h-4 w-16 -translate-x-1/2 rounded-xl bg-phone-shell" />
                    <div className="min-h-95.5 overflow-hidden rounded-[26px] bg-phone-surface text-phone-ink">
                      <div className="flex h-8.5 items-center justify-between px-3.5 pt-1 text-[8px] font-bold">
                        <span>9:41</span>
                        <span>●●●　▰</span>
                      </div>
                      <div className="flex h-11 items-center justify-between border-b border-phone-border px-3.25">
                        <span className="flex items-center gap-1.25 text-[11px] font-semibold tracking-[-.03em]">
                          <ShieldCheck size={15} /> Brightline
                        </span>
                        <span className="grid size-6 place-items-center rounded-full bg-phone-tint text-[8px] font-bold">
                          DR
                        </span>
                      </div>
                      <div className="px-3.25 pb-3 pt-4.5">
                        <span className="text-[7px] font-bold tracking-widest text-phone-muted">
                          VISÃO GERAL
                        </span>
                        <h3 className="mt-1.25! text-[15px] font-semibold tracking-[-.035em]">
                          Bom dia, Dra. Ana
                        </h3>
                        <p className="mt-0.75! text-[8px] text-phone-muted">
                          Veja o que precisa da sua atenção.
                        </p>
                        <div className="mt-3.5 grid grid-cols-2 gap-1.75">
                          <div className="flex flex-col gap-0.5 rounded-lg border border-phone-border bg-white p-2">
                            <strong className="text-base leading-none">
                              08
                            </strong>
                            <span className="text-[7px] text-phone-muted">
                              Em aberto
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 rounded-lg border border-phone-border bg-white p-2">
                            <strong className="text-base leading-none">
                              03
                            </strong>
                            <span className="text-[7px] text-phone-muted">
                              Urgentes
                            </span>
                          </div>
                        </div>
                        <div className="mb-1.75 mt-4 flex justify-between text-[9px]">
                          <strong>Prioridade</strong>
                          <span className="text-[7px] text-phone-accent">
                            Ver todos
                          </span>
                        </div>
                        <div className="flex items-center gap-1.75 rounded-lg border border-phone-border bg-white px-1.75 py-2">
                          <i className="h-6.25 w-1 shrink-0 rounded-sm bg-phone-urgent" />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                            <strong className="truncate text-[8px] font-semibold">
                              Nódulo pulmonar
                            </strong>
                            <span className="text-[7px] text-phone-muted">
                              TC de tórax · há 12 min
                            </span>
                          </div>
                          <ArrowRight
                            size={14}
                            className="shrink-0 text-phone-muted"
                          />
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.75 rounded-lg border border-phone-border bg-white px-1.75 py-2">
                          <i className="h-6.25 w-1 shrink-0 rounded-sm bg-phone-normal" />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                            <strong className="truncate text-[8px] font-semibold">
                              Achado hepático
                            </strong>
                            <span className="text-[7px] text-phone-muted">
                              RM abdome · há 38 min
                            </span>
                          </div>
                          <ArrowRight
                            size={14}
                            className="shrink-0 text-phone-muted"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-phone-border px-3.25 py-2 text-center text-phone-accent">
                        {[
                          ["⌂", "Início"],
                          ["▤", "Casos"],
                          ["◷", "Prazos"],
                          ["◎", "Perfil"],
                        ].map(([icon, label]) => (
                          <span
                            className="flex flex-col items-center gap-0.5 text-xs"
                            key={label}
                          >
                            {icon}
                            <small className="text-[6px]">{label}</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lp-device-caption">
                  <Smartphone size={15} />
                  <span>Experiência no celular</span>
                </div>
              </div>
            </div>
            <div className="lp-benefits">
              {[
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
            <p>
              Entre na demonstração: {reports.length} laudos sintéticos,{" "}
              {examples.length} casos e um fluxo completo de acompanhamento.
            </p>
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
