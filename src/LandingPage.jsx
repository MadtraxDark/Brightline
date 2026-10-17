import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronRight, CircleDot, Clock3, FileText, LayoutDashboard, Menu, ScanLine, ShieldCheck, Sparkles, X } from "lucide-react";
import logo from "./public/logo/logo-text.svg";
import useLenisScroll from "./useLenisScroll.js";

const examples = [
  { name: "Tromboembolismo pulmonar", exam: "Angiotomografia de tórax", priority: "Crítico", style: "critical", time: "1 hora", evidence: "Falhas de enchimento em ramos das artérias pulmonares, compatíveis com tromboembolismo pulmonar.", id: "BL-001" },
  { name: "Pneumotórax", exam: "Radiografia de tórax", priority: "Urgente", style: "urgent", time: "24 horas", evidence: "Pneumotórax à direita, com retração parcial do parênquima pulmonar.", id: "BL-002" },
  { name: "Nódulo pulmonar", exam: "Tomografia de tórax", priority: "Acionável", style: "actionable", time: "30 dias", evidence: "Nódulo pulmonar sólido no lobo superior direito, com recomendação de acompanhamento.", id: "BL-003" },
];

function ProductPreview() {
  const [selected, setSelected] = useState(0);
  const [confirmed, setConfirmed] = useState([]);
  const item = examples[selected];
  const read = confirmed.includes(selected);
  return <div className="lp-product" aria-label="Demonstração interativa do Brightline">
    <div className="lp-product-chrome"><span className="lp-window-dots"><i /><i /><i /></span><span><ShieldCheck size={11} /> Brightline · Ambiente demonstrativo</span><span className="lp-live-dot" /></div>
    <div className="lp-product-body">
      <aside className="lp-mini-sidebar"><img src={logo} alt="Brightline" width="104" /><span className="lp-mini-label">GESTÃO DE LAUDOS</span><span className="lp-mini-active"><LayoutDashboard size={14} /> Visão geral</span><span><ScanLine size={14} /> Não sinalizados</span><div className="lp-mini-bottom"><ShieldCheck size={16} /><span>IA sugere.<br />Você valida.</span></div></aside>
      <div className="lp-mini-workspace"><div className="lp-mini-breadcrumb">Workspace <ChevronRight size={10} /> Visão geral</div><div className="lp-mini-title"><div><h3>O que precisa de atenção.</h3><p>Clareza para o próximo passo.</p></div><span className="lp-demo-label">DEMO</span></div>
        <div className="lp-mini-stats"><div><span>Em acompanhamento</span><strong>03 <small>casos ilustrativos</small></strong></div><div><span>Leituras confirmadas</span><strong>{String(confirmed.length).padStart(2, "0")} <CheckCheck size={17} /></strong></div></div>
        <div className="lp-preview-list"><div className="lp-preview-list-head"><span>Achados prioritários</span><span>Prioridade</span></div>{examples.map((example, index) => <button key={example.id} type="button" className={`lp-preview-row ${selected === index ? "is-selected" : ""}`} onClick={() => setSelected(index)} aria-pressed={selected === index}><span><strong>{example.name}</strong><small>{example.exam}</small></span><span className={`lp-priority ${example.style}`}><CircleDot size={10} />{example.priority}</span><ChevronRight size={14} /></button>)}</div>
        <div className="lp-evidence" aria-live="polite"><div className="lp-evidence-heading"><span><Sparkles size={13} /> Evidência no laudo</span><small>{item.id}</small></div><p>“{item.evidence}”</p><div className="lp-evidence-action"><span><Clock3 size={12} /> Prazo ilustrativo: {item.time}</span><button type="button" disabled={read} onClick={() => setConfirmed((previous) => [...previous, selected])}>{read ? <><CheckCheck size={13} /> Leitura confirmada</> : <>Confirmar leitura <Check size={13} /></>}</button></div></div>
      </div>
    </div>
    <div className="lp-product-foot"><span><span className="lp-live-dot" /> Exemplos fictícios · sem dados de pacientes</span><span>Selecione um achado para explorar <ArrowUpRight size={12} /></span></div>
  </div>;
}

const questions = [
  ["O que o Brightline faz?", "O Brightline identifica achados prioritários no texto de laudos, apresenta a evidência que sustenta a sinalização e organiza o acompanhamento de cada caso, da revisão à confirmação de leitura e ao registro da conduta."],
  ["A inteligência artificial toma decisões clínicas?", "A IA sugere achados para revisão. A validação, a confirmação de leitura e as decisões sobre a conduta ficam com o profissional. O Brightline foi pensado para apoiar esse acompanhamento."],
  ["Posso experimentar o produto?", "Sim. O botão “Explorar a demonstração” abre o painel do protótipo com dados sintéticos. Você pode navegar pelos laudos e experimentar o fluxo de acompanhamento sem inserir dados reais de pacientes."],
  ["O produto já está pronto para uso clínico?", "O Brightline está em fase de protótipo. A demonstração usa laudos sintéticos e resultados ilustrativos, sem validação de desempenho clínico. Integrações com sistemas hospitalares e envio real de notificações ainda não fazem parte da versão atual."],
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRoot = useLenisScroll();
  return <div className="landing" ref={scrollRoot}>
    <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <header className="lp-header"><a className="lp-logo" href="/" aria-label="Brightline — início"><img src={logo} alt="Brightline" width="146" /></a><nav id="mobile-nav" className={menuOpen ? "lp-nav is-open" : "lp-nav"} aria-label="Navegação do site"><a href="#produto" onClick={() => setMenuOpen(false)}>O produto</a><a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a><a href="#diferenciais" onClick={() => setMenuOpen(false)}>Por que Brightline</a><a href="#duvidas" onClick={() => setMenuOpen(false)}>Dúvidas</a></nav><a className="lp-header-cta" href="/app">Acessar demonstração <ArrowUpRight size={16} /></a><button className="lp-menu" type="button" aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></header>
    <main id="conteudo">
      <section className="lp-hero" id="produto"><div className="lp-hero-grid" aria-hidden="true" /><div className="lp-hero-copy"><span className="lp-eyebrow"><span /> INTELIGÊNCIA QUE CONECTA O CUIDADO</span><h1>Um achado importante<br />merece um <em>próximo passo.</em></h1><p>Do laudo à confirmação de leitura. O Brightline dá visibilidade aos achados prioritários e ajuda a acompanhar o que precisa de atenção.</p><div className="lp-hero-actions"><a className="lp-button lp-button-primary" href="/app">Explorar a demonstração <ArrowUpRight size={18} /></a><a className="lp-text-link" href="#como-funciona">Conheça o fluxo <ArrowRight size={17} /></a></div><div className="lp-hero-assurance"><ShieldCheck size={15} /><span>IA sugere. O profissional valida. O cuidado continua.</span></div></div>
        <div className="lp-preview-wrap"><div className="lp-preview-caption"><span><span className="lp-caption-line" /> DO ACHADO À AÇÃO, EM UM SÓ LUGAR.</span><span>01 / VISÃO DO PRODUTO</span></div><ProductPreview /></div>
        <a className="lp-scroll" href="#como-funciona">Um caminho mais claro para cada achado <ChevronDown size={16} /></a>
      </section>
      <section className="lp-purpose"><p>Para quem cuida,<br /><strong>cada etapa importa.</strong></p><div><FileText /><span>Achados em contexto<small>Evidência direto do laudo</small></span></div><div><Clock3 /><span>Prioridades visíveis<small>Atenção ao que vem primeiro</small></span></div><div><CheckCheck /><span>Acompanhamento contínuo<small>Da leitura à conduta registrada</small></span></div></section>
      <section className="lp-flow lp-section" id="como-funciona"><div className="lp-section-heading"><div><span className="lp-eyebrow">UM FLUXO. PONTAS CONECTADAS.</span><h2>O laudo é o começo.<br /><em>O acompanhamento também importa.</em></h2></div><p>Informação relevante ganha um caminho claro, com prioridade, contexto e uma próxima ação.</p></div><div className="lp-steps">{[
        { number: "01", icon: ScanLine, title: "Identifique o que importa", text: "A IA analisa o texto do laudo e sugere achados que merecem atenção, com a evidência em destaque.", label: "Do texto ao contexto" },
        { number: "02", icon: ShieldCheck, title: "Revise com clareza", text: "O profissional revisa o achado, consulta o laudo e confirma a leitura. A decisão continua humana.", label: "Da sinalização à validação" },
        { number: "03", icon: CheckCheck, title: "Acompanhe o próximo passo", text: "Registre a conduta e acompanhe o histórico do caso até o encerramento, sem perder o contexto.", label: "Da leitura à ação" },
      ].map(({ number, icon: Icon, title, text, label }) => <article className="lp-step" key={number}><div className="lp-step-top"><span>{number}</span><Icon size={25} strokeWidth={1.5} /></div><h3>{title}</h3><p>{text}</p><span className="lp-step-label">{label} <ArrowRight size={15} /></span></article>)}</div></section>
      <section className="lp-difference lp-section" id="diferenciais"><div className="lp-difference-copy"><span className="lp-eyebrow">MENOS PONTAS SOLTAS. MAIS CLAREZA.</span><h2>Visibilidade para a equipe.<br /><em>Continuidade para o cuidado.</em></h2><p>Um achado não termina quando o laudo é emitido. O Brightline organiza o que vem depois.</p><a className="lp-text-link" href="/app">Veja isso na prática <ArrowUpRight size={17} /></a></div><div className="lp-benefits">{[
        ["Prioridade que orienta", "Casos organizados por urgência e prazo para facilitar a revisão do que precisa de atenção primeiro.", Clock3],
        ["Evidência, não uma caixa-preta", "O trecho do laudo acompanha o achado sugerido. Mais contexto para uma revisão consciente.", FileText],
        ["Um histórico que faz sentido", "Leitura, conduta e encerramento reunidos no caso. Cada etapa registrada para consulta.", CheckCheck],
      ].map(([title, text, Icon]) => <article key={title}><span className="lp-benefit-icon"><Icon size={21} strokeWidth={1.5} /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
      <section className="lp-human"><div className="lp-human-symbol" aria-hidden="true"><ShieldCheck size={50} strokeWidth={1} /></div><span className="lp-eyebrow">TECNOLOGIA A SERVIÇO DO JULGAMENTO HUMANO</span><h2>A inteligência é artificial.<br /><em>A decisão é sua.</em></h2><p>O Brightline conecta informação e acompanhamento.<br />O profissional segue no centro de cada decisão.</p><span className="lp-human-note"><Check size={14} /> Sugestões com evidência <span>·</span> Revisão humana <span>·</span> Ações registradas</span></section>
      <section className="lp-faq lp-section" id="duvidas"><div><span className="lp-eyebrow">ANTES DO PRÓXIMO PASSO</span><h2>Um pouco mais<br /><em>de clareza.</em></h2><p>Conheça o escopo do produto<br />e da demonstração.</p></div><div className="lp-questions">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-final-cta"><div><span className="lp-eyebrow">CONHEÇA O BRIGHTLINE</span><h2>Veja o próximo passo.<br /><em>Antes de dar o seu.</em></h2><p>Explore o produto com laudos e casos demonstrativos.</p></div><a className="lp-button lp-button-primary" href="/app">Explorar a demonstração <ArrowUpRight size={18} /></a></section>
    </main>
    <footer className="lp-footer"><div className="lp-footer-top"><a className="lp-logo" href="/" aria-label="Brightline — início"><img src={logo} alt="Brightline" width="138" /></a><span>Do achado ao cuidado.</span><a href="#conteudo">Voltar ao início <ArrowUpRight size={14} /></a></div><div className="lp-footer-bottom"><span>© {new Date().getFullYear()} Brightline</span><p>Protótipo com dados sintéticos. Resultados ilustrativos, sem validação de desempenho clínico.</p><span>Feito para conectar o cuidado.</span></div></footer>
  </div>;
}
