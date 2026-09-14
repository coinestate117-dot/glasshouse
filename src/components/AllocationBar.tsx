"use client";

import { useEffect, useState } from "react";

interface Segment {
  symbol: string;
  pct: number;
  color: string;
}

interface AllocationBarProps {
  segments: Segment[];
  height?: number;
  animate?: boolean;
}

// Deterministic color from symbol
const PALETTE = [
  "#14F195", "#9945FF", "#FF4D4D", "#00C2FF", "#FFD93D",
  "#FF6B6B", "#4ECDC4", "#A855F7", "#F97316", "#06B6D4",
  "#EC4899", "#84CC16", "#8B5CF6", "#EF4444", "#22D3EE",
];

export function colorForSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function AllocationBar({
  segments,
  height = 6,
  animate = true,
}: AllocationBarProps) {
  const [scale, setScale] = useState(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setScale(1);
      return;
    }
    requestAnimationFrame(() => setScale(1));
  }, [animate]);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        backgroundColor: "var(--border)",
        transformOrigin: "left",
        transform: `scaleX(${scale})`,
        transition: animate ? "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
      }}
    >
      {segments.map((seg) => (
        <div
          key={seg.symbol}
          style={{
            width: `${seg.pct}%`,
            height: "100%",
            backgroundColor: seg.color,
            minWidth: seg.pct > 0 ? 2 : 0,
          }}
        />
      ))}
    </div>
  );
}
