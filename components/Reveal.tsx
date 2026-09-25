"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  /** Versatz in Sekunden, für gestaffelte Gruppen. */
  delay?: number;
  className?: string;
};

/**
 * Blendet den Inhalt beim ersten Sichtbarwerden ein.
 * Bei prefers-reduced-motion bleibt nur der Opacity-Fade, keine Bewegung.
 */
export function Reveal({ children, delay = 0, className }: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={inView ? (reduce ? { opacity: 1 } : { opacity: 1, y: 0 }) : undefined}
      transition={
        reduce
          ? { duration: 0.2, delay: 0 }
          : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }
      }
    >
      {children}
    </motion.div>
  );
}
