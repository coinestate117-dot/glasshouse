"use client";

import { useState } from "react";
import FilterChips from "./FilterChips";
import TokenLogo from "./TokenLogo";
import { formatUsd, shortenAddress } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import type { ActivityItem } from "@/lib/activity";

const FILTERS = ["All", "Buys", "Sells", "Today"];

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isToday(ts: number): boolean {
  const now = new Date();
  const d = new Date(ts * 1000);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface ActivityFeedProps {
  items: ActivityItem[];
  showWallet?: boolean;
}

export default function ActivityFeed({
  items,
  showWallet = true,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState("All");

  const filtered = items.filter((item) => {
    if (filter === "Buys") return item.type === "buy";
    if (filter === "Sells") return item.type === "sell";
    if (filter === "Today") return isToday(item.blockTime);
    return true;
  });

  return (
    <div>
      <FilterChips options={FILTERS} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          {items.length === 0
            ? "No recent stock trades found."
            : "No trades match this filter."}
        </div>
      ) : (
        <div
          style={{
            maxHeight: 600,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--border) transparent",
          }}
        >
          {filtered.map((item, i) => (
            <a
              key={`${item.signature}-${item.symbol}-${item.type}`}
              href={`https://solscan.io/tx/${item.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
                opacity: 0,
                animation: `fadeSlideIn 0.25s cubic-bezier(0.23,1,0.32,1) ${Math.min(i, 15) * 30}ms forwards`,
              }}
            >
              <TokenLogo
                symbol={item.asset_symbol}
                logoUrl={item.logo_url}
                size={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {showWallet && (
                    <span style={{ color: "var(--text-secondary)" }}>
                      {shortenAddress(item.walletAddress)}{" "}
                    </span>
                  )}
                  <span
                    style={{
                      color:
                        item.type === "buy" ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {item.type === "buy" ? "bought" : "sold"}
                  </span>{" "}
                  {formatUsd(item.value_usd)} {item.symbol}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {item.amount.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  shares
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {timeAgo(item.blockTime)}
                <ExternalLink size={11} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
