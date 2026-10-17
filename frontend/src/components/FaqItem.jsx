import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { gsap } from "gsap";

export default function FaqItem({ question, answer }) {
  const detailsRef = useRef(null);
  const answerRef = useRef(null);
  const animationRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finishMotion = () => {
      if (motion.matches) animationRef.current?.progress(1);
    };
    motion.addEventListener("change", finishMotion);
    return () => {
      animationRef.current?.kill();
      motion.removeEventListener("change", finishMotion);
    };
  }, []);

  function toggle(event) {
    event.preventDefault();
    const details = detailsRef.current;
    const content = answerRef.current;
    const opening = !(animationRef.current?.isActive() ? expanded : details.open);
    const height = details.open ? content.getBoundingClientRect().height : 0;
    animationRef.current?.kill();
    setExpanded(opening);

    const finish = () => {
      details.open = opening;
      gsap.set(content, { clearProps: "height,opacity,transform,overflow" });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    if (!details.open) gsap.set(content, { opacity: 0, y: 6 });
    details.open = true;
    gsap.set(content, { height, overflow: "hidden" });
    animationRef.current = gsap.to(content, {
      height: opening ? content.scrollHeight : 0,
      opacity: opening ? 1 : 0,
      y: opening ? 0 : 4,
      duration: opening ? 0.32 : 0.22,
      ease: "power2.out",
      onComplete: finish,
    });
  }

  return (
    <details ref={detailsRef} data-expanded={expanded} onToggle={() => {
      if (!animationRef.current?.isActive()) setExpanded(detailsRef.current.open);
    }}>
      <summary onClick={toggle} aria-expanded={expanded}>
        {question}
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="lp-faq-answer" ref={answerRef}><p>{answer}</p></div>
    </details>
  );
}
