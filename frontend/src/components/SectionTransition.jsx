import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function SectionTransition({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [displayed, setDisplayed] = useState(location);
  const surface = useRef(null);
  const first = useRef(true);
  const direction = navigationType === "POP" ? -1 : 1;

  useEffect(() => {
    if (displayed.key === location.key) return;
    const node = surface.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || !node?.animate) {
      setDisplayed(location);
      return;
    }
    let active = true;
    node.inert = true;
    const exit = node.animate(
      [
        {
          transform: getComputedStyle(node).transform,
          clipPath: "inset(0 0 0 0 round 8px)",
        },
        {
          transform: `translateX(${-direction * 16}px) scale(.99)`,
          clipPath: "inset(0 0 6% 0 round 8px)",
        },
      ],
      { duration: 120, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" },
    );
    function finish() {
      if (active) setDisplayed(location);
    }
    exit.finished.then(finish).catch(() => {});
    function reduce() {
      if (media.matches) finish();
    }
    media.addEventListener("change", reduce);
    return () => {
      active = false;
      exit.cancel();
      node.inert = false;
      media.removeEventListener("change", reduce);
    };
  }, [location, displayed.key, direction]);

  useLayoutEffect(() => {
    const node = surface.current;
    if (first.current) {
      first.current = false;
      return;
    }
    node.inert = false;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || !node.animate) return;
    const entry = node.animate(
      [
        {
          transform: `translateX(${direction * 18}px) scale(.99)`,
          clipPath: "inset(0 0 8% 0 round 8px)",
        },
        {
          transform: "translateX(0) scale(1)",
          clipPath: "inset(0 0 0 0 round 8px)",
        },
      ],
      { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    function reduce() {
      if (media.matches) entry.cancel();
    }
    media.addEventListener("change", reduce);
    return () => {
      entry.cancel();
      media.removeEventListener("change", reduce);
    };
  }, [displayed.key]);

  return (
    <div className="section-transition" ref={surface}>
      {children(displayed)}
    </div>
  );
}
