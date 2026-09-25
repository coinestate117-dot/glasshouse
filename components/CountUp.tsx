"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type Props = {
  value: number;
  /** Formatierung des Zwischenwerts — muss für jeden Zwischenstand funktionieren. */
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
};

/**
 * Zählt beim ersten Sichtbarwerden einmalig von 0 auf den echten Wert hoch.
 * Bei prefers-reduced-motion wird der Endwert sofort gesetzt (keine Bewegung).
 */
export function CountUp({ value, format, durationMs = 700, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let start: number | null = null;

    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / durationMs, 1);
      // cubic-bezier(0.16, 1, 0.3, 1) angenähert — schnelles Aus-Schwingen
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, durationMs, reduce]);

  const fmt = format ?? ((n: number) => n.toFixed(0));

  return (
    <span ref={ref} className={className}>
      {fmt(display)}
    </span>
  );
}
