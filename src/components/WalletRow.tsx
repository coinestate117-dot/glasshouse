"use client";

import Link from "next/link";
import AllocationBar, { colorForSymbol } from "./AllocationBar";
import WalletTypeBadge from "./WalletTypeBadge";
import { formatUsd, formatPct, shortenAddress } from "@/lib/format";
import type { WalletType } from "@/types";

interface Position {
  asset_symbol: string;
  pct: number;
}

interface WalletRowProps {
  rank: number;
  address: string;
  totalValue: number;
  change24h: number;
  walletType: WalletType;
  positions: Position[];
  positionCount: number;
  index: number;
}

export default function WalletRow({
  rank,
  address,
  totalValue,
  change24h,
  walletType,
  positions,
  positionCount,
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
    <Link href={`/wallet/${address}`}>
      {/* Mobile layout */}
      <div
        className="wallet-row-mobile"
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
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              {shortenAddress(address)}
            </span>
            <WalletTypeBadge type={walletType} />
          </div>
          <AllocationBar segments={segments} height={4} />
        </div>
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

      {/* Desktop layout */}
      <div
        className="wallet-row-desktop"
        style={{
          display: "none",
          gridTemplateColumns: "40px 160px 100px 1fr 64px 120px 80px",
          alignItems: "center",
          gap: 16,
          padding: "12px 0",
          borderBottom: "1px solid var(--border)",
          opacity: 0,
          animation: `fadeSlideIn 0.3s ease-out ${delay}ms forwards`,
        }}
      >
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
        <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "monospace" }}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <WalletTypeBadge type={walletType} />
        <div style={{ minWidth: 0, padding: "0 8px" }}>
          <AllocationBar segments={segments} height={6} />
        </div>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {positionCount}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, textAlign: "right" }}>
          {formatUsd(totalValue)}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isPositive ? "var(--green)" : "var(--red)",
            textAlign: "right",
          }}
        >
          {formatPct(change24h)}
        </span>
      </div>

      <style jsx>{`
        @media (min-width: 1024px) {
          .wallet-row-mobile {
            display: none !important;
          }
          .wallet-row-desktop {
            display: grid !important;
          }
        }
      `}</style>
    </Link>
  );
}
