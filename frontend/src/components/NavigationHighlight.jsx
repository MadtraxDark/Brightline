import { useEffect, useLayoutEffect, useRef } from "react";

// Retract into the content edge, change row while hidden, then reopen.
export default function NavigationHighlight({ section, menuOpen, collapsed = false }) {
  const indicatorRef = useRef(null);
  const initialized = useRef(false);
  const previousSection = useRef(section);
  const snapRef = useRef(null);

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const nav = indicator.parentElement;
    let animation;
    let cancelled = false;
    const row = nav.querySelector(`[data-section="${section}"]`);
    const y = row?.offsetTop ?? 0;
    if (row) indicator.style.setProperty("--nav-row-height", `${row.offsetHeight}px`);
    const width = indicator.getBoundingClientRect().width;
    const changed = previousSection.current !== section;
    previousSection.current = section;
    const transform = (x, top) => `translate3d(${x}px, ${top}px, 0)`;

    function stop() {
      if (!animation) return;
      const current = getComputedStyle(indicator).transform;
      animation.cancel();
      indicator.style.transform = current;
      animation = undefined;
    }

    function snap() {
      cancelled = true;
      stop();
      if (row) indicator.style.setProperty("--nav-row-height", `${row.offsetHeight}px`);
      indicator.style.transform = transform(0, row?.offsetTop ?? 0);
      indicator.style.opacity = row && nav.offsetWidth ? "1" : "0";
      nav.dataset.highlight = section;
      nav.dataset.phase = "idle";
    }
    snapRef.current = snap;

    if (
      !initialized.current ||
      !changed ||
      !nav.offsetWidth ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      snap();
      initialized.current = Boolean(nav.offsetWidth);
      return;
    }

    async function move(from, to, duration, phase, easing) {
      nav.dataset.phase = phase;
      animation = indicator.animate([{ transform: from }, { transform: to }], {
        duration,
        easing,
        fill: "forwards",
      });
      try {
        await animation.finished;
      } catch {
        return false;
      }
      if (cancelled) return false;
      indicator.style.transform = to;
      animation.cancel();
      animation = undefined;
      return true;
    }

    async function transition() {
      const current = getComputedStyle(indicator);
      if (current.opacity !== "0") {
        const matrix = new DOMMatrixReadOnly(current.transform);
        nav.dataset.highlight = "none";
        if (
          !(await move(
            transform(matrix.m41, matrix.m42),
            transform(width, matrix.m42),
            150,
            "closing",
            "cubic-bezier(.4, 0, 1, 1)",
          ))
        )
          return;
      }
      if (!row) {
        indicator.style.opacity = "0";
        nav.dataset.phase = "idle";
        return;
      }
      indicator.style.transform = transform(width, y);
      indicator.style.opacity = "1";
      nav.dataset.highlight = section;
      if (
        await move(
          transform(width, y),
          transform(0, y),
          220,
          "opening",
          "cubic-bezier(.16, 1, .3, 1)",
        )
      )
        nav.dataset.phase = "idle";
    }
    transition();
    return () => { cancelled = true; stop(); };
  }, [section, menuOpen, collapsed]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const snap = () => snapRef.current?.();
    window.addEventListener("resize", snap);
    media.addEventListener("change", snap);
    return () => {
      window.removeEventListener("resize", snap);
      media.removeEventListener("change", snap);
    };
  }, []);

  return (
    <span
      ref={indicatorRef}
      className="nav-active-indicator"
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 88" preserveAspectRatio="none" focusable="false">
        <path d="M240 0 Q240 20 220 20 H24 A24 24 0 0 0 24 68 H220 Q240 68 240 88 Z" />
      </svg>
    </span>
  );
}
