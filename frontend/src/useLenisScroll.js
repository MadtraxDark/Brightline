import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

export default function useLenisScroll() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const focusTargets = new Set();
    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.1,
      respectReducedMotion: true,
    });

    // React creates section targets after the browser's initial anchor lookup.
    // Reload anchors have already been cleared by main.jsx.
    if (window.location.hash) {
      try {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        if (target) lenis.scrollTo(target, { immediate: true, offset: -104 });
      } catch {
        // Ignore malformed fragment identifiers, as with in-page navigation.
      }
    }

    function navigateToAnchor(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href^="#"]');
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

      const hash = link.getAttribute("href");
      let target;
      try {
        target = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        return;
      }
      if (!target) return;

      event.preventDefault();
      if (window.location.hash !== hash) window.history.pushState(window.history.state, "", hash);
      lenis.scrollTo(target, {
        duration: 1.2,
        lerp: 0,
        easing: easeOutCubic,
        // Keyboard users should reach the content without waiting for motion.
        immediate: link.classList.contains("skip-link"),
        onComplete: () => {
          if (!target.hasAttribute("tabindex")) {
            target.setAttribute("tabindex", "-1");
            focusTargets.add(target);
          }
          target.focus({ preventScroll: true });
        },
      });
    }

    root.addEventListener("click", navigateToAnchor);
    return () => {
      root.removeEventListener("click", navigateToAnchor);
      lenis.destroy();
      focusTargets.forEach((target) => target.removeAttribute("tabindex"));
    };
  }, []);

  return rootRef;
}
