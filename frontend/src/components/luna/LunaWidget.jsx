import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import luna from "../../assets/luna.png";
import LunaPanel from "./LunaPanel.jsx";

gsap.registerPlugin(SplitText);

const GREETING = "Oi, médico. Precisa de ajuda?";

export default function LunaWidget() {
  const [open, setOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const root = useRef(null);
  const button = useRef(null);
  const greet = useRef(null);

  useEffect(() => {
    setShowGreeting(false);
    if (open) return undefined;
    let timer;
    let disposed = false;
    function show() {
      if (disposed) return;
      if (document.hidden) {
        timer = window.setTimeout(show, 10000);
        return;
      }
      setShowGreeting(true);
      timer = window.setTimeout(hide, 7000);
    }
    function hide() {
      if (disposed) return;
      if (greet.current?.contains(document.activeElement)) {
        timer = window.setTimeout(hide, 1000);
        return;
      }
      setShowGreeting(false);
      timer = window.setTimeout(show, 90000);
    }
    timer = window.setTimeout(show, 8000);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open || !showGreeting) return undefined;
    const node = greet.current;
    if (!node) return undefined;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const split = SplitText.create(node, {
        type: "words,chars",
        mask: "chars",
        aria: "auto",
      });
      const tween = gsap.fromTo(
        split.chars,
        { autoAlpha: 0, yPercent: 110 },
        {
          autoAlpha: 1,
          yPercent: 0,
          duration: 0.5,
          stagger: 0.028,
          ease: "power3.out",
          delay: 0.2,
        },
      );
      return () => {
        tween.kill();
        split.revert();
      };
    });
    return () => media.revert();
  }, [open, showGreeting]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    }
    function onPointer(event) {
      if (root.current?.contains(event.target)) return;
      close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="luna" ref={root}>
      <LunaPanel open={open} onClose={close} />
      {open || !showGreeting ? null : (
        <button
          ref={greet}
          type="button"
          className="luna-greet"
          aria-label={GREETING}
          onClick={() => setOpen(true)}
        >
          {GREETING}
        </button>
      )}
      <button
        ref={button}
        type="button"
        className="luna-button"
        data-open={open ? "true" : "false"}
        aria-label={
          open ? "Fechar chat geral da Luna" : "Abrir chat geral da Luna"
        }
        aria-expanded={open}
        aria-controls="luna-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <img src={luna} width="56" height="56" alt="" draggable="false" />
      </button>
    </div>
  );
}
