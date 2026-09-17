"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import TokenLogo from "@/components/TokenLogo";
import WalletTypeBadge from "@/components/WalletTypeBadge";
import { formatUsd, shortenAddress } from "@/lib/format";
import { Search } from "lucide-react";
import type { WalletType } from "@/types";

interface TopWallet {
  address: string;
  total_value_usd: number;
  wallet_type: WalletType;
  topTicker: string;
  positionCount: number;
}

interface StockInfo {
  symbol: string;
  asset_symbol: string;
  logo_url: string | null;
  totalValue: number;
  holders: number;
}

interface SearchViewProps {
  topWallets: TopWallet[];
  topStocks: StockInfo[];
  allTickers: string[];
}

export default function SearchView({
  topWallets,
  topStocks,
  allTickers,
}: SearchViewProps) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const isAddress = trimmed.length >= 32;
  const tickerMatch = useMemo(() => {
    if (!trimmed || isAddress) return null;
    const upper = trimmed.toUpperCase();
    if (allTickers.includes(upper)) return upper;
    return allTickers.find((t) => t.startsWith(upper)) ?? null;
  }, [trimmed, isAddress, allTickers]);

  const showDefault = !trimmed;

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
        <Search
          size={16}
          style={{ color: "var(--text-secondary)", flexShrink: 0 }}
        />
        <input
          type="text"
          placeholder="Search by ticker (NVDA) or wallet address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (isAddress) window.location.href = `/wallet/${trimmed}`;
              else if (tickerMatch)
                window.location.href = `/stock/${tickerMatch}`;
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

      {/* Address → wallet link */}
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

      {/* Ticker → stock page */}
      {tickerMatch && (
        <Link
          href={`/stock/${tickerMatch}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          <TokenLogo
            symbol={
              topStocks.find((s) => s.symbol === tickerMatch)?.asset_symbol ??
              tickerMatch
            }
            logoUrl={
              topStocks.find((s) => s.symbol === tickerMatch)?.logo_url ?? null
            }
            size={28}
          />
          View {tickerMatch} holders →
        </Link>
      )}

      {/* No match */}
      {trimmed && !isAddress && !tickerMatch && (
        <div
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          No results for &ldquo;{trimmed.toUpperCase()}&rdquo;
        </div>
      )}

      {/* Default view */}
      {showDefault && (
        <>
          {/* Top wallets */}
          <div style={sectionLabel}>Top wallets</div>
          {topWallets.map((w, i) => (
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
                <div
                  style={{ fontSize: 12, color: "var(--text-secondary)" }}
                >
                  {w.positionCount} stocks · top: {w.topTicker}
                </div>
              </div>
              <div
                style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}
              >
                {formatUsd(w.total_value_usd)}
              </div>
            </Link>
          ))}

          {/* Top stocks */}
          <div style={{ ...sectionLabel, marginTop: 24 }}>Top stocks</div>
          {topStocks.map((s, i) => (
            <Link
              key={s.symbol}
              href={`/stock/${s.symbol}`}
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
              <TokenLogo
                symbol={s.asset_symbol}
                logoUrl={s.logo_url}
                size={32}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {s.symbol}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--text-secondary)" }}
                >
                  {s.holders} holder{s.holders !== 1 ? "s" : ""}
                </div>
              </div>
              <div
                style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}
              >
                {formatUsd(s.totalValue)}
              </div>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 10,
};
