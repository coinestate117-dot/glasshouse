"use client";

import React from "react";

type Segment = {
  symbol: string;
  weight: number; // 0..1
};

type GlassSparklineProps = {
  segments: Segment[];
  height?: number;
  showLabels?: boolean;
};

const COLORS_GREEN = [
  "rgba(20, 241, 149, 0.85)",
  "rgba(20, 241, 149, 0.60)",
  "rgba(20, 241, 149, 0.40)",
];

const COLORS_PURPLE = [
  "rgba(153, 69, 255, 0.75)",
  "rgba(153, 69, 255, 0.50)",
  "rgba(153, 69, 255, 0.35)",
];

const COLOR_REST = "rgba(255, 255, 255, 0.08)";

function getBarColor(index: number): string {
  if (index === 0) return COLORS_GREEN[0];
  if (index === 1) return COLORS_GREEN[1];
  if (index === 2) return COLORS_PURPLE[0];
  if (index === 3) return COLORS_PURPLE[1];
  return COLOR_REST;
}

/**
 * GlassSparkline — Glasshouse's unique visual element.
 *
 * Renders portfolio weight distribution as layered, translucent bars
 * that resemble panels of colored glass. The top holding is brightest.
 * Inspired by the "glasshouse" name — seeing through stacked glass panels.
 */
export function GlassSparkline({ segments, height = 24, showLabels = false }: GlassSparklineProps) {
  // Sort by weight desc, take top 6
  const sorted = [...segments]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const minHeight = 4; // px minimum bar height
  const maxWeight = sorted[0]?.weight ?? 1;

  return (
    <div
      title={sorted.map((s) => `${s.symbol} ${(s.weight * 100).toFixed(1)}%`).join(" · ")}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "2px",
        height: `${height}px`,
        minWidth: `${sorted.length * 8}px`,
      }}
    >
      {sorted.map((seg, i) => {
        const barHeight = Math.max(
          minHeight,
          (seg.weight / maxWeight) * height
        );

        return (
          <div key={seg.symbol} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <div
              style={{
                width: showLabels ? "24px" : "6px",
                height: `${barHeight}px`,
                borderRadius: "1px",
                background: getBarColor(i),
                transition: "height 400ms cubic-bezier(0.4, 0, 0.2, 1)",
                flexShrink: 0,
              }}
            />
            {showLabels && (
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}>
                {seg.symbol.replace("x", "")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
