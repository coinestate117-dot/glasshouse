"use client";

import { useEffect, useRef } from "react";
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
  mintAddress: string;
  priceUsd: number;
  change24hPct: number;
  totalHeldUsd: number;
  totalShares: number;
  holderCount: number;
  largestHolder: { address: string; value_usd: number } | null;
  holders: Holder[];
  logoUrl: string | null;
  dexPairAddress: string | null;
}

export default function StockDetail({
  ticker,
  assetSymbol,
  mintAddress,
  priceUsd,
  change24hPct,
  totalHeldUsd,
  holderCount,
  largestHolder,
  holders,
  logoUrl,
  dexPairAddress,
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
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
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
          value={largestHolder ? formatUsd(largestHolder.value_usd) : "—"}
          sub={largestHolder ? shortenAddress(largestHolder.address) : undefined}
        />
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gap: 16,
          marginBottom: 24,
        }}
        className="charts-grid"
      >
        {/* TradingView — Nasdaq */}
        <div>
          <div style={chartLabel}>{ticker} on Nasdaq</div>
          <TradingViewChart ticker={ticker} />
        </div>

        {/* DexScreener — Solana */}
        <div>
          <div style={chartLabel}>{assetSymbol} on Solana</div>
          {dexPairAddress ? (
            <div
              style={{
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid var(--border)",
                height: 360,
              }}
            >
              <iframe
                src={`https://dexscreener.com/solana/${dexPairAddress}?embed=1&theme=dark&info=0&trades=0`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                title={`${assetSymbol} on Solana`}
              />
            </div>
          ) : (
            <div
              style={{
                height: 360,
                borderRadius: 8,
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              No chart data available
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          marginBottom: 24,
        }}
      >
        Prices can differ between Nasdaq and Solana, especially outside
        US trading hours. This is normal for tokenized assets.
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
            <div style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {formatUsd(h.position.value_usd)}
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .charts-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/* ─── TradingView embed ─── */

function TradingViewChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `NASDAQ:${ticker}`,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(28, 28, 33, 0.5)",
      hide_top_toolbar: false,
      hide_legend: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    container.appendChild(wrapper);
    container.appendChild(script);
  }, [ticker]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{
        height: 360,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    />
  );
}

/* ─── Stat card ─── */

const chartLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 8,
};

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
          style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
