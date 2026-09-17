"use client";

import { useState } from "react";
import type { WalletType } from "@/types";

const BADGE_STYLES: Record<WalletType, { bg: string; color: string }> = {
  Investor: { bg: "rgba(20,241,149,0.08)", color: "#10c980" },
  "Market Maker": { bg: "rgba(153,69,255,0.08)", color: "#8838e0" },
  Whale: { bg: "rgba(0,194,255,0.08)", color: "#0099cc" },
  Holder: { bg: "rgba(138,138,147,0.06)", color: "#6a6a72" },
};

const EXPLANATIONS: Record<WalletType, string> = {
  Holder: "Holds 1 xStock position.",
  Investor: "2–40 positions, xStocks are 60%+ of Token-2022 holdings.",
  Whale: "xStocks are under 30% of Token-2022 holdings — large diversified wallet.",
  "Market Maker": "Over 40 xStock positions — likely automated trading.",
};

export default function WalletTypeBadge({ type }: { type: WalletType }) {
  const [open, setOpen] = useState(false);
  const style = BADGE_STYLES[type];

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          display: "inline-block",
          padding: "2px 7px",
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: "16px",
          backgroundColor: style.bg,
          color: style.color,
          whiteSpace: "nowrap",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {type}
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 400,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            width: 240,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.15s ease-out",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <strong style={{ color: style.color }}>{type}</strong>
          {" — "}
          {EXPLANATIONS[type]}
        </span>
      )}
    </span>
  );
}
