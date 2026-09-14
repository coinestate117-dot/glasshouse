"use client";

import { useState } from "react";
import HeroCard from "./HeroCard";
import FilterChips from "./FilterChips";
import WalletRow from "./WalletRow";
import type { WalletType } from "@/types";

interface WalletData {
  address: string;
  total_value_usd: number;
  change_24h_pct: number;
  position_count: number;
  wallet_type: WalletType;
  positions: { asset_symbol: string; pct: number }[];
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

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <HeroCard totalValue={totalValue} change24h={totalChange24h} />
      <FilterChips options={FILTERS} active={filter} onChange={setFilter} />
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
          {sorted.map((w, i) => (
            <WalletRow
              key={w.address}
              rank={i + 1}
              address={w.address}
              totalValue={w.total_value_usd}
              change24h={w.change_24h_pct}
              walletType={w.wallet_type}
              positions={w.positions}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
