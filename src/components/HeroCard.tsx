"use client";

import CountUp from "./CountUp";
import { formatUsdFull, formatPct } from "@/lib/format";

interface HeroCardProps {
  totalValue: number;
  change24h: number;
}

export default function HeroCard({ totalValue, change24h }: HeroCardProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
        borderRadius: 8,
        padding: "28px 20px",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 6,
          letterSpacing: "0.02em",
        }}
      >
        Total xStock Holdings
      </div>
      <CountUp
        end={totalValue}
        formatter={formatUsdFull}
        style={{
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.1,
          display: "block",
        }}
      />
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          marginTop: 6,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <CountUp
          end={change24h}
          duration={400}
          formatter={(v) => formatPct(v) + " (24h)"}
        />
      </div>
    </div>
  );
}
