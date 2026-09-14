"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import TokenLogo from "@/components/TokenLogo";
import WalletTypeBadge from "@/components/WalletTypeBadge";
import { formatUsd, shortenAddress } from "@/lib/format";
import { Search } from "lucide-react";
import type { WalletType } from "@/types";

interface Position {
  underlying_symbol: string;
  asset_symbol: string;
  value_usd: number;
  logo_url: string | null;
  pct: number;
}

interface WalletData {
  address: string;
  total_value_usd: number;
  wallet_type: WalletType;
  positions: Position[];
}

interface TickerResult {
  address: string;
  wallet_type: WalletType;
  total_value_usd: number;
  position: Position;
}

export default function SearchView({ wallets }: { wallets: WalletData[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  // All unique tickers for matching
  const allTickers = useMemo(() => {
    const set = new Set<string>();
    for (const w of wallets) {
      for (const p of w.positions) set.add(p.underlying_symbol);
    }
    return set;
  }, [wallets]);

  // Determine search mode
  const isAddress = trimmed.length >= 32;
  const tickerMatch = useMemo(() => {
    if (!trimmed || isAddress) return null;
    const upper = trimmed.toUpperCase();
    // Exact match first, then prefix
    if (allTickers.has(upper)) return upper;
    for (const t of allTickers) {
      if (t.startsWith(upper)) return t;
    }
    return null;
  }, [trimmed, isAddress, allTickers]);

  // Ticker search results: wallets holding this ticker, sorted by position size
  const tickerResults = useMemo((): TickerResult[] => {
    if (!tickerMatch) return [];
    const results: TickerResult[] = [];
    for (const w of wallets) {
      const pos = w.positions.find(
        (p) => p.underlying_symbol === tickerMatch
      );
      if (pos) {
        results.push({
          address: w.address,
          wallet_type: w.wallet_type,
          total_value_usd: w.total_value_usd,
          position: pos,
        });
      }
    }
    results.sort((a, b) => b.position.value_usd - a.position.value_usd);
    return results;
  }, [tickerMatch, wallets]);

  // Top 5 wallets
  const topWallets = useMemo(
    () =>
      [...wallets]
        .sort((a, b) => b.total_value_usd - a.total_value_usd)
        .slice(0, 5),
    [wallets]
  );

  const showTickerResults = tickerMatch && tickerResults.length > 0;
  const showTopWallets = !trimmed;

  return (
    <div style={{ padding: "24px 16px" }}>
      {/* Search input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "0 14px",
          marginBottom: 20,
        }}
      >
        <Search size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search by ticker (NVDA) or wallet address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isAddress) {
              window.location.href = `/wallet/${trimmed}`;
            }
          }}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            padding: "14px 0",
            color: "var(--text)",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>

      {/* Address match → direct link */}
      {isAddress && (
        <Link
          href={`/wallet/${trimmed}`}
          style={{
            display: "block",
            padding: "14px 16px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          Go to wallet{" "}
          <span style={{ fontFamily: "monospace", color: "var(--green)" }}>
            {trimmed.slice(0, 8)}…{trimmed.slice(-4)}
          </span>
        </Link>
      )}

      {/* Ticker results: who holds X? */}
      {showTickerResults && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            {tickerResults.length} wallet{tickerResults.length !== 1 ? "s" : ""} holding{" "}
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              {tickerMatch}
            </span>
          </div>
          {tickerResults.map((r, i) => (
            <Link
              key={r.address}
              href={`/wallet/${r.address}`}
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
                symbol={r.position.asset_symbol}
                logoUrl={r.position.logo_url}
                size={36}
              />
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
                    {shortenAddress(r.address)}
                  </span>
                  <WalletTypeBadge type={r.wallet_type} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {r.position.pct.toFixed(1)}% of portfolio
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {formatUsd(r.position.value_usd)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  in {tickerMatch}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No results for ticker */}
      {trimmed && !isAddress && !showTickerResults && (
        <div
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          No wallets found holding &ldquo;{trimmed.toUpperCase()}&rdquo;
        </div>
      )}

      {/* Default: top wallets */}
      {showTopWallets && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 10,
            }}
          >
            Top wallets
          </div>
          {topWallets.map((w, i) => {
            const top = w.positions.sort(
              (a, b) => b.value_usd - a.value_usd
            )[0];
            return (
              <Link
                key={w.address}
                href={`/wallet/${w.address}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                  opacity: 0,
                  animation: `fadeSlideIn 0.25s cubic-bezier(0.23,1,0.32,1) ${i * 30}ms forwards`,
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
                  {i + 1}
                </span>
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
                      {shortenAddress(w.address)}
                    </span>
                    <WalletTypeBadge type={w.wallet_type} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {w.positions.length} stocks · top: {top?.underlying_symbol}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {formatUsd(w.total_value_usd)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
