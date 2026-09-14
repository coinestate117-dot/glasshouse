"use client";

import Link from "next/link";
import AllocationBar, { colorForSymbol } from "./AllocationBar";
import WalletTypeBadge from "./WalletTypeBadge";
import TokenLogo from "./TokenLogo";
import { formatUsd, formatPct, shortenAddress } from "@/lib/format";
import type { WalletType } from "@/types";

interface Position {
  asset_symbol: string;
  pct: number;
  logo_url?: string | null;
  underlying_symbol?: string;
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
  const sorted = [...positions].sort((a, b) => b.pct - a.pct);
  const top3Pct = sorted.slice(0, 3).reduce((s, p) => s + p.pct, 0);
  const top6 = sorted.slice(0, 6);
  const otherPct = sorted.slice(6).reduce((s, p) => s + p.pct, 0);
  const segments = [
    ...top6.map((p) => ({
      symbol: p.asset_symbol,
      pct: p.pct,
      color: colorForSymbol(p.asset_symbol),
    })),
    ...(otherPct > 0
      ? [{ symbol: "Other", pct: otherPct, color: "var(--border)" }]
      : []),
  ];
  const topPositions = sorted.slice(0, 3);

  const delay = Math.min(index, 12) * 30;
  const isPositive = change24h >= 0;

  return (
    <Link href={`/wallet/${address}`}>
      {/* Mobile */}
      <div
        className="wallet-row-mobile"
        style={{
          display: "flex",
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
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            width: 24,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {rank}
        </span>

        {/* Logo stack: show top 1-2 logos overlapping */}
        <div style={{ position: "relative", width: 36, height: 28, flexShrink: 0 }}>
          {topPositions.slice(0, 2).map((p, i) => (
            <div
              key={p.asset_symbol}
              style={{
                position: i === 0 ? "relative" : "absolute",
                top: 0,
                left: i * 14,
                zIndex: 2 - i,
              }}
            >
              <TokenLogo
                symbol={p.asset_symbol}
                logoUrl={p.logo_url ?? null}
                size={28}
              />
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {shortenAddress(address)}
            </span>
            <WalletTypeBadge type={walletType} />
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            {positionCount} position{positionCount !== 1 ? "s" : ""}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {formatUsd(totalValue)}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: isPositive ? "var(--green)" : "var(--red)",
              marginTop: 1,
            }}
          >
            {formatPct(change24h)}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div
        className="wallet-row-desktop"
        style={{
          display: "none",
          gridTemplateColumns: "36px 180px 100px 1fr 56px 64px 120px 72px",
          alignItems: "center",
          gap: 16,
          padding: "10px 0",
          borderBottom: "1px solid var(--border)",
          opacity: 0,
          animation: `fadeSlideIn 0.3s ease-out ${delay}ms forwards`,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {rank}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
            {topPositions.slice(0, 1).map((p) => (
              <TokenLogo
                key={p.asset_symbol}
                symbol={p.asset_symbol}
                logoUrl={p.logo_url ?? null}
                size={28}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "monospace",
            }}
          >
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        </div>
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
        <span
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {top3Pct.toFixed(0)}%
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, textAlign: "right" }}>
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
