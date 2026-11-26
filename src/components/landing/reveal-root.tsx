"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps the landing page. Marks the root as animation-ready on mount and reveals
 * [data-reveal] elements as they enter the viewport. Without JS, or with reduced motion,
 * everything stays visible.
 */
export default function RevealRoot({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    root.classList.add("lp-anim");
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return <div ref={ref} className="lp-root">{children}</div>;
}
