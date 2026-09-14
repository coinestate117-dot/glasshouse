"use client";

import type { WalletType } from "@/types";

const BADGE_STYLES: Record<WalletType, { bg: string; color: string }> = {
  Investor: { bg: "rgba(20,241,149,0.12)", color: "var(--green)" },
  "Market Maker": { bg: "rgba(153,69,255,0.12)", color: "#9945FF" },
  Whale: { bg: "rgba(0,194,255,0.12)", color: "#00C2FF" },
  Holder: { bg: "rgba(138,138,147,0.12)", color: "var(--text-secondary)" },
};

export default function WalletTypeBadge({ type }: { type: WalletType }) {
  const style = BADGE_STYLES[type];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: "16px",
        backgroundColor: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}
