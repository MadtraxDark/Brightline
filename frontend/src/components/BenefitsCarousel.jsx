import { useEffect, useRef, useState } from "react";
import { CheckCheck, Clock3, FileText, ScanLine, Sparkles } from "lucide-react";
import "../styles/benefits-carousel.css";

const benefits = [
  { title: "Achados em contexto", detail: "Evidência direto do laudo", icon: FileText },
  { title: "Prioridades visíveis", detail: "Atenção ao que vem primeiro", icon: Clock3 },
  { title: "Acompanhamento contínuo", detail: "Da leitura à conduta registrada", icon: CheckCheck },
  { title: "Não sinalizados", detail: "Achados para uma segunda revisão", icon: ScanLine },
  { title: "Avaliação da IA", detail: "Recall, precisão e erros de exemplo", icon: Sparkles },
];

export default function BenefitsCarousel() {
  const regionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(regionRef.current);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const running = visible && pageVisible && !reducedMotion;

  return <section className="benefits-carousel" ref={regionRef} aria-label="Benefícios do Brightline" aria-roledescription="carrossel" data-running={running} data-reduced-motion={reducedMotion}>
    <div className="benefits-viewport" tabIndex={reducedMotion ? 0 : undefined} aria-label={benefits.map(({ title }) => title).join(", ")}>
      <div className="benefits-track">
        {[0, 1].map((copy) => <ul className="benefits-group" key={copy} aria-hidden={copy === 1 ? true : undefined} inert={copy === 1}>
          <li className="benefits-item benefits-intro"><span>Para quem cuida,<br /><strong>cada etapa importa.</strong></span></li>
          {benefits.map(({ title, detail, icon: Icon }) => <li className="benefits-item" key={title}><Icon size={24} strokeWidth={1.4} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span></li>)}
        </ul>)}
      </div>
    </div>
  </section>;
}
