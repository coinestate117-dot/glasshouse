"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type Segment = { symbol: string; weight: number };

type Props = {
  segments: Segment[];
  size?: number;
  thickness?: number;
};

/** Grün→Violett-Verlauf über die Segmente, damit die Marke durchgehalten wird. */
function segmentColor(i: number, total: number): string {
  const t = total <= 1 ? 0 : i / (total - 1);
  const from = [20, 241, 149];
  const to = [153, 69, 255];
  const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function AllocationDonut({ segments, size = 168, thickness = 16 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [inView]);

  const top = [...segments].sort((a, b) => b.weight - a.weight).slice(0, 8);
  const shown = top.reduce((s, x) => s + x.weight, 0);
  const rest = Math.max(0, 1 - shown);
  const parts: Segment[] = rest > 0.001 ? [...top, { symbol: "Übrige", weight: rest }] : top;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let angleAcc = 0;
  const arcs = parts.map((p, i) => {
    const len = p.weight * circumference;
    const startAngle = angleAcc * 360;
    angleAcc += p.weight;
    return { ...p, len, startAngle, color: segmentColor(i, parts.length) };
  });

  const focus = active !== null ? parts[active] : null;

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={thickness}
          />
          {arcs.map((a, i) => (
            <circle
              key={a.symbol}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={active === i ? thickness + 4 : thickness}
              // Ein Strich der Länge `len`, danach eine Lücke über den Rest.
              strokeDasharray={`${a.len} ${circumference}`}
              // Von "komplett versteckt" auf "voll sichtbar" ziehen.
              strokeDashoffset={drawn || reduce ? 0 : a.len}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{
                // -90° bringt den Start auf 12 Uhr, dazu der Segment-Startwinkel.
                transform: `rotate(${a.startAngle - 90}deg)`,
                transformOrigin: "50% 50%",
                opacity: active === null || active === i ? 1 : 0.35,
                cursor: "pointer",
                transition: reduce
                  ? "opacity 200ms linear"
                  : `stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms, opacity 150ms linear, stroke-width 150ms linear`,
              }}
            />
          ))}
        </svg>

        {/* Mitte */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span className="mono" style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {focus ? `${(focus.weight * 100).toFixed(1)}%` : parts.length}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-mono)",
            }}
          >
            {focus ? focus.symbol : "Positionen"}
          </span>
        </div>
      </div>

      {/* Legende */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: "160px", flex: 1 }}>
        {arcs.map((a, i) => (
          <div
            key={a.symbol}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              opacity: active === null || active === i ? 1 : 0.45,
              transition: "opacity 150ms linear",
              cursor: "pointer",
            }}
          >
            <span
              style={{ width: "8px", height: "8px", borderRadius: "2px", background: a.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{a.symbol}</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-dim)" }}>
              {(a.weight * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
