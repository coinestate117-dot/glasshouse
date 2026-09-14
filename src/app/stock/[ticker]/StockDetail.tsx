"use client";

import Link from "next/link";
import TokenLogo from "@/components/TokenLogo";
import WalletTypeBadge from "@/components/WalletTypeBadge";
import { formatUsd, formatUsdFull, formatPct, shortenAddress } from "@/lib/format";
import type { WalletType } from "@/types";

interface Holder {
  address: string;
  wallet_type: string;
  total_value_usd: number;
  position: {
    asset_symbol: string;
    underlying_symbol: string;
    ui_amount: number;
    value_usd: number;
    pct: number;
    logo_url: string | null;
  };
}

interface StockDetailProps {
  ticker: string;
  assetSymbol: string;
  priceUsd: number;
  change24hPct: number;
  totalHeldUsd: number;
  totalShares: number;
  holderCount: number;
  largestHolder: { address: string; value_usd: number } | null;
  holders: Holder[];
  logoUrl: string | null;
}

export default function StockDetail({
  ticker,
  assetSymbol,
  priceUsd,
  change24hPct,
  totalHeldUsd,
  holderCount,
  largestHolder,
  holders,
  logoUrl,
}: StockDetailProps) {
  const isPositive = change24hPct >= 0;

  return (
    <div style={{ padding: "16px 16px 0" }}>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <TokenLogo symbol={assetSymbol} logoUrl={logoUrl} size={48} />
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{ticker}</div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginTop: 2,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              {formatUsdFull(priceUsd)}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: isPositive ? "var(--green)" : "var(--red)",
              }}
            >
              {formatPct(change24hPct)}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              today
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total on Solana" value={formatUsd(totalHeldUsd)} />
        <StatCard label="Holders" value={String(holderCount)} />
        <StatCard
          label="Largest holder"
          value={
            largestHolder ? formatUsd(largestHolder.value_usd) : "—"
          }
          sub={largestHolder ? shortenAddress(largestHolder.address) : undefined}
        />
      </div>

      {/* Holders list */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 8,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Who holds {ticker} ({holderCount})
      </div>
      <div
        style={{
          maxHeight: 600,
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {holders.map((h, i) => (
          <Link
            key={h.address}
            href={`/wallet/${h.address}`}
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
                  {shortenAddress(h.address)}
                </span>
                <WalletTypeBadge type={h.wallet_type as WalletType} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {h.position.ui_amount.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                shares · {h.position.pct.toFixed(1)}% of portfolio
              </div>
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {formatUsd(h.position.value_usd)}
            </div>
          </Link>
        ))}
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
