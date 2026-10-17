import { useLayoutEffect } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export default function useTitleAnimation(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      let active = true;
      let observer;
      const splits = [];
      const tweens = [];
      const titles = [...root.querySelectorAll("h1, h2")].filter((title) => !title.closest(".lp-dashboard-preview"));
      const labels = new Map(titles.map((title) => [title, title.innerText.replace(/\s+/g, " ").trim()]));
      const revealPending = () => titles.forEach((title) => title.removeAttribute("data-title-pending"));

      // Prepare before the first paint, including headings below the fold.
      // CSS only hides headings that this effect explicitly prepares.
      titles.forEach((title) => title.setAttribute("data-title-pending", ""));
      const fallback = window.setTimeout(() => {
        active = false;
        revealPending();
      }, 2000);

      // Split with the final fonts so the animation cannot change line breaks.
      document.fonts.ready.then(() => {
        if (!active) return;
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const title = entry.target;
            observer.unobserve(title);
            const hero = title.tagName === "H1";
            const split = SplitText.create(title, {
              type: hero ? "lines,words" : "lines",
              mask: "lines",
              aria: "auto",
            });
            title.setAttribute("aria-label", labels.get(title));
            splits.push(split);
            tweens.push(gsap.fromTo(hero ? split.words : split.lines, {
              autoAlpha: 0,
              yPercent: 105,
            }, {
              autoAlpha: 1,
              yPercent: 0,
              duration: hero ? 0.8 : 0.7,
              stagger: { amount: hero ? 0.3 : 0.16 },
              ease: "power3.out",
              onComplete: () => split.revert(),
            }));
            // Children are already in their starting state before revealing the parent.
            title.removeAttribute("data-title-pending");
          });
        }, { threshold: 0, rootMargin: "0px 0px -14% 0px" });
        titles.forEach((title) => observer.observe(title));
        window.clearTimeout(fallback);
      }).catch(() => {
        active = false;
        window.clearTimeout(fallback);
        revealPending();
      });

      return () => {
        active = false;
        window.clearTimeout(fallback);
        observer?.disconnect();
        tweens.forEach((tween) => tween.kill());
        splits.forEach((split) => split.revert());
        revealPending();
      };
    }, root);

    return () => media.revert();
  }, [rootRef]);
}
