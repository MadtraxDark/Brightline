import { useLayoutEffect } from "react";
import { gsap } from "gsap";

const revealSelector = [
  ".lp-hero-copy",
  ".lp-preview-wrap",
  ".lp-scroll",
  ".benefits-carousel",
  ".lp-section-heading",
  ".lp-step",
  ".lp-difference-copy",
  ".lp-mobile-showcase",
  ".lp-human",
  ".lp-faq > div",
  ".lp-final-cta > *",
  ".lp-footer-top > *",
  ".lp-footer-bottom > *",
].join(",");

export default function useScrollReveal(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const targets = [...root.querySelectorAll(revealSelector)];
        if (!targets.length || !("IntersectionObserver" in window)) return;

        const tweens = new Set();
        gsap.set(targets, { autoAlpha: 0, y: 38 });

        const reveal = (entries) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            observer.unobserve(target);
            const tween = gsap.to(target, {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              ease: "expo.out",
              clearProps: "opacity,visibility,transform",
              onComplete: () => tweens.delete(tween),
            });
            tweens.add(tween);
          });
        };

        const observer = new IntersectionObserver(reveal, {
          threshold: 0,
          rootMargin: "0px 0px -9% 0px",
        });
        targets.forEach((target) => observer.observe(target));

        const fallback = window.setTimeout(() => {
          const pending = targets.filter(
            (target) => target.style.visibility === "hidden",
          );
          gsap.to(pending, {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
            clearProps: "opacity,visibility,transform",
          });
        }, 2500);

        return () => {
          observer.disconnect();
          window.clearTimeout(fallback);
          tweens.forEach((tween) => tween.kill());
          gsap.set(targets, { clearProps: "opacity,visibility,transform" });
        };
      },
      root,
    );

    return () => media.revert();
  }, [rootRef]);
}
