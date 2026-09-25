"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

/** Dünner Verlaufsbalken am oberen Rand, der den Scroll-Fortschritt zeigt. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();

  // Federung macht die Bewegung geschmeidig statt ruckartig.
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 40,
    restDelta: 0.001,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        scaleX,
        transformOrigin: "0%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: "var(--grad)",
        zIndex: 100,
      }}
    />
  );
}
