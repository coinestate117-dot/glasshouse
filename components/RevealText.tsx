"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  /** Zeilen der Überschrift — jede Zeile wird eigenständig umbrochen. */
  lines: string[];
  className?: string;
  /** Verzögerung vor dem ersten Wort, in Sekunden. */
  delay?: number;
};

/**
 * Überschrift, deren Wörter nacheinander hereinkommen.
 * Bei prefers-reduced-motion erscheint alles zugleich mit reinem Fade.
 */
export function RevealText({ lines, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();

  let wordIndex = 0;

  return (
    <h1 className={className}>
      {lines.map((line, li) => (
        <span key={li} style={{ display: "block" }}>
          {line.split(" ").map((word) => {
            const i = wordIndex++;
            return (
              <motion.span
                key={`${li}-${i}`}
                // inline-block, damit translate greift, ohne den Umbruch zu stören
                style={{ display: "inline-block", whiteSpace: "pre" }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: "0.4em", filter: "blur(6px)" }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                transition={
                  reduce
                    ? { duration: 0.25, delay: 0 }
                    : {
                        duration: 0.55,
                        ease: [0.16, 1, 0.3, 1],
                        delay: delay + i * 0.055,
                      }
                }
              >
                {word}{" "}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
