"use client";

import type { WalletType } from "@/types";

const BADGE_STYLES: Record<WalletType, { bg: string; color: string }> = {
  Investor: { bg: "rgba(20,241,149,0.08)", color: "#10c980" },
  "Market Maker": { bg: "rgba(153,69,255,0.08)", color: "#8838e0" },
  Whale: { bg: "rgba(0,194,255,0.08)", color: "#0099cc" },
  Holder: { bg: "rgba(138,138,147,0.06)", color: "#6a6a72" },
};

export default function WalletTypeBadge({ type }: { type: WalletType }) {
  const style = BADGE_STYLES[type];
  return (
    <span
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
      }}
    >
      {type}
    </span>
  );
}
