"use client";

import CountUp from "./CountUp";
import { formatUsdFull, formatPct, formatUsd } from "@/lib/format";

interface HeroCardProps {
  totalValue: number;
  change24h: number;
  walletCount: number;
  largestPosition: { symbol: string; value: number } | null;
}

export default function HeroCard({
  totalValue,
  change24h,
  walletCount,
  largestPosition,
}: HeroCardProps) {
  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
          borderRadius: 8,
          padding: "36px 20px 32px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 8,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          All Portfolios
        </div>
        <CountUp
          end={totalValue}
          formatter={formatUsdFull}
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1,
            display: "block",
            letterSpacing: "-0.02em",
          }}
        />
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginTop: 8,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          <CountUp
            end={change24h}
            duration={400}
            formatter={(v) => formatPct(v)}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(255,255,255,0.5)",
              marginLeft: 6,
            }}
          >
            today
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <StatCard label="Wallets" value={String(walletCount)} />
        <StatCard label="Total Value" value={formatUsd(totalValue)} />
        <StatCard
          label="Largest Position"
          value={largestPosition ? formatUsd(largestPosition.value) : "—"}
          sub={largestPosition?.symbol}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "12px 10px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 4,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
