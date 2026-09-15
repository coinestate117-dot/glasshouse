"use client";

import { useState } from "react";
import HeroCard from "./HeroCard";
import FilterChips from "./FilterChips";
import WalletRow from "./WalletRow";
import type { WalletType } from "@/types";

interface Position {
  asset_symbol: string;
  pct: number;
  logo_url?: string | null;
  underlying_symbol?: string;
  value_usd?: number;
}

interface WalletData {
  address: string;
  total_value_usd: number;
  change_24h_pct: number;
  position_count: number;
  wallet_type: WalletType;
  positions: Position[];
}

interface LeaderboardProps {
  wallets: WalletData[];
  totalValue: number;
  totalChange24h: number;
}

const FILTERS = ["All", "Investors", "Market Makers", "Whales", "Holders"];

export default function Leaderboard({
  wallets,
  totalValue,
  totalChange24h,
}: LeaderboardProps) {
  const [filter, setFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(50);

  const typeMap: Record<string, WalletType | null> = {
    All: null,
    Investors: "Investor",
    "Market Makers": "Market Maker",
    Whales: "Whale",
    Holders: "Holder",
  };

  const typeFilter = typeMap[filter] ?? null;
  const filtered = typeFilter
    ? wallets.filter((w) => w.wallet_type === typeFilter)
    : wallets;
  const sorted = [...filtered].sort(
    (a, b) => b.total_value_usd - a.total_value_usd
  );

  // Find largest single position across all wallets
  let largestPosition: { symbol: string; value: number } | null = null;
  for (const w of wallets) {
    for (const p of w.positions) {
      if (
        p.value_usd &&
        (!largestPosition || p.value_usd > largestPosition.value)
      ) {
        largestPosition = {
          symbol: p.underlying_symbol ?? p.asset_symbol,
          value: p.value_usd,
        };
      }
    }
  }

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <HeroCard
        totalValue={totalValue}
        change24h={totalChange24h}
        walletCount={wallets.length}
        largestPosition={largestPosition}
      />
      <FilterChips options={FILTERS} active={filter} onChange={(v) => { setFilter(v); setVisibleCount(50); }} />

      {/* Desktop table header */}
      <div className="table-header">
        <span style={{ textAlign: "center" }}>#</span>
        <span>Wallet</span>
        <span>Type</span>
        <span>Allocation</span>
        <span style={{ textAlign: "center" }}>Pos.</span>
        <span style={{ textAlign: "center" }}>Top 3</span>
        <span style={{ textAlign: "right" }}>Value</span>
        <span style={{ textAlign: "right" }}>24h</span>
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          No wallets in this category.
        </div>
      ) : (
        <div>
          {sorted.slice(0, visibleCount).map((w, i) => (
            <WalletRow
              key={w.address}
              rank={i + 1}
              address={w.address}
              totalValue={w.total_value_usd}
              change24h={w.change_24h_pct}
              walletType={w.wallet_type}
              positions={w.positions}
              positionCount={w.position_count}
              index={i}
            />
          ))}
          {visibleCount < sorted.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 50)}
              style={{
                width: "100%",
                padding: "14px 0",
                marginTop: 8,
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Show more ({sorted.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .table-header {
          display: none;
        }
        @media (min-width: 1024px) {
          .table-header {
            display: grid;
            grid-template-columns: 36px 180px 100px 1fr 56px 64px 120px 72px;
            gap: 16px;
            padding: 6px 0;
            border-bottom: 1px solid var(--border);
            font-size: 11px;
            font-weight: 500;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        }
      `}</style>
    </div>
  );
}
