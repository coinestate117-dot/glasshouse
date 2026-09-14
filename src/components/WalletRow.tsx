"use client";

import Link from "next/link";
import AllocationBar, { colorForSymbol } from "./AllocationBar";
import { formatUsd, formatPct, shortenAddress } from "@/lib/format";

interface Position {
  asset_symbol: string;
  pct: number;
}

interface WalletRowProps {
  rank: number;
  address: string;
  totalValue: number;
  change24h: number;
  positions: Position[];
  index: number;
}

export default function WalletRow({
  rank,
  address,
  totalValue,
  change24h,
  positions,
  index,
}: WalletRowProps) {
  const segments = positions
    .sort((a, b) => b.pct - a.pct)
    .map((p) => ({
      symbol: p.asset_symbol,
      pct: p.pct,
      color: colorForSymbol(p.asset_symbol),
    }));

  const delay = Math.min(index, 12) * 30;
  const isPositive = change24h >= 0;

  return (
    <Link href={`/wallet/${address}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr auto",
          alignItems: "center",
          gap: 12,
          padding: "14px 0",
          borderBottom: "1px solid var(--border)",
          opacity: 0,
          animation: `fadeSlideIn 0.3s ease-out ${delay}ms forwards`,
        }}
      >
        {/* Rank */}
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {rank}
        </span>

        {/* Address + bar */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
              color: "var(--text)",
            }}
          >
            {shortenAddress(address)}
          </div>
          <AllocationBar segments={segments} height={4} />
        </div>

        {/* Value + change */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {formatUsd(totalValue)}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: isPositive ? "var(--green)" : "var(--red)",
              marginTop: 2,
            }}
          >
            {formatPct(change24h)}
          </div>
        </div>
      </div>
    </Link>
  );
}
