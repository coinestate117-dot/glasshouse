"use client";

import { useState } from "react";
import HeroCard from "./HeroCard";
import FilterChips from "./FilterChips";
import WalletRow from "./WalletRow";

interface WalletData {
  address: string;
  total_value_usd: number;
  change_24h_pct: number;
  position_count: number;
  positions: { asset_symbol: string; pct: number }[];
}

interface LeaderboardProps {
  wallets: WalletData[];
  totalValue: number;
  totalChange24h: number;
}

const FILTERS = ["All", "Top Value", "Biggest Movers"];

export default function Leaderboard({
  wallets,
  totalValue,
  totalChange24h,
}: LeaderboardProps) {
  const [filter, setFilter] = useState("All");

  const sorted = [...wallets].sort((a, b) => {
    switch (filter) {
      case "Top Value":
        return b.total_value_usd - a.total_value_usd;
      case "Biggest Movers":
        return Math.abs(b.change_24h_pct) - Math.abs(a.change_24h_pct);
      default:
        return b.total_value_usd - a.total_value_usd;
    }
  });

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <HeroCard totalValue={totalValue} change24h={totalChange24h} />
      <FilterChips options={FILTERS} active={filter} onChange={setFilter} />
      <div>
        {sorted.map((w, i) => (
          <WalletRow
            key={w.address}
            rank={i + 1}
            address={w.address}
            totalValue={w.total_value_usd}
            change24h={w.change_24h_pct}
            positions={w.positions}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
