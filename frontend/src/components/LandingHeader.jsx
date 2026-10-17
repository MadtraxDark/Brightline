import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import logo from "../public/logo/logo-text.svg";
import "../styles/header.css";

const links = [
  ["Início", "#produto"], ["O produto", "#demonstracao"],
  ["Como funciona", "#como-funciona"], ["Diferenciais", "#diferenciais"],
  ["Dúvidas", "#duvidas"], ["Acessar painel", "/app"],
];

export default function LandingHeader() {
  const [atTop, setAtTop] = useState(() => window.scrollY <= 24);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#produto");
  const dialogRef = useRef(null);

  useEffect(() => {
    const updateTop = () => setAtTop(window.scrollY <= 24);
    updateTop();
    window.addEventListener("scroll", updateTop, { passive: true });
    return () => window.removeEventListener("scroll", updateTop);
  }, []);

  useEffect(() => {
    const sections = links.filter(([, href]) => href.startsWith("#"))
      .map(([, href]) => [href, document.getElementById(href.slice(1))])
      .filter(([, section]) => section);
    let disposed = false;
    const updateActive = () => {
      if (disposed) return;
      // Nested sections can be visible together. Activate only after their
      // beginning reaches the reading line below the fixed header.
      let current = "#produto";
      if (window.scrollY > 24) {
        for (const [href, section] of sections) {
          if (section.getBoundingClientRect().top <= 112) current = href;
        }
      }
      setActiveSection(current);
    };
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    const observer = new ResizeObserver(updateActive);
    observer.observe(document.querySelector(".landing"));
    document.fonts.ready.then(updateActive);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  return <header className="bl-header" data-at-top={atTop}>
    <div className="bl-header-bar">
      <a className="bl-header-logo" href="/" aria-label="Brightline — início"><img src={logo} alt="Brightline" width="146" /></a>
      <nav className="bl-desktop-nav" aria-label="Navegação do site">
        {links.map(([label, href]) => <a key={href} href={href} className={href === "/app" ? "bl-panel-link" : undefined} aria-current={activeSection === href ? "location" : undefined}>
          {href === "/app" ? <>{label}<ArrowUpRight size={15} aria-hidden="true" /></> : <><span className="bl-nav-dot" aria-hidden="true" /><span className="bl-nav-roll"><span>{label}</span><span aria-hidden="true">{label}</span></span></>}
        </a>)}
      </nav>
      <a className="bl-panel-link bl-mobile-panel" href="/app" aria-label="Acessar painel">Painel <ArrowUpRight size={14} aria-hidden="true" /></a>
      <button className="bl-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><span>Menu</span><Plus size={18} aria-hidden="true" /></button>
    </div>
    <dialog id="site-menu" className="bl-menu-dialog" ref={dialogRef} aria-label="Menu de navegação" data-lenis-prevent onClose={() => setMenuOpen(false)}>
      <div className="bl-menu-top"><a className="bl-header-logo" href="/" aria-label="Brightline — início"><img src={logo} alt="Brightline" width="146" /></a><button type="button" className="bl-menu-close" onClick={() => setMenuOpen(false)}>Fechar <X size={20} aria-hidden="true" /></button></div>
      <nav className="bl-overlay-nav" aria-label="Navegação expandida">
        {links.map(([label, href], index) => <a key={href} href={href} style={{ "--link-index": index }} aria-current={activeSection === href ? "location" : undefined} onClick={() => setMenuOpen(false)}><span className="bl-menu-number">{String(index + 1).padStart(2, "0")}</span><span>{label}</span><ArrowUpRight aria-hidden="true" /></a>)}
      </nav>
      <div className="bl-menu-bottom"><span>Do achado ao cuidado.</span><span>IA sugere. Você valida.</span></div>
      <svg className="bl-menu-line" viewBox="0 0 900 180" fill="none" aria-hidden="true"><path d="M-40 170C130-60 300 240 440 100S760-20 940 90" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg>
    </dialog>
  </header>;
}
