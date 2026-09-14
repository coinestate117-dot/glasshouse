"use client";

import CountUp from "@/components/CountUp";
import AllocationBar, { colorForSymbol } from "@/components/AllocationBar";
import MirrorDialog from "@/components/MirrorDialog";
import { formatUsdFull, formatUsd, formatPct } from "@/lib/format";

interface Position {
  asset_symbol: string;
  mint_address: string;
  ui_amount: number;
  value_usd: number;
  pct: number;
  logo_url: string | null;
  underlying_symbol: string;
}

interface WalletDetailProps {
  wallet: {
    address: string;
    total_value_usd: number;
    change_24h_pct: number;
    position_count: number;
  };
  positions: Position[];
}

export default function WalletDetail({
  wallet,
  positions,
}: WalletDetailProps) {
  const segments = positions.map((p) => ({
    symbol: p.asset_symbol,
    pct: p.pct,
    color: colorForSymbol(p.asset_symbol),
  }));

  const isPositive = wallet.change_24h_pct >= 0;

  return (
    <div style={{ padding: "16px 16px 0" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
          borderRadius: 8,
          padding: "28px 20px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 6,
          }}
        >
          Portfolio Value
        </div>
        <CountUp
          end={wallet.total_value_usd}
          formatter={formatUsdFull}
          style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, display: "block" }}
        />
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginTop: 6,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <CountUp
            end={wallet.change_24h_pct}
            duration={400}
            formatter={(v) => formatPct(v) + " (24h)"}
          />
        </div>
      </div>

      {/* Wallet address */}
      <a
        href={`https://solscan.io/account/${wallet.address}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 16,
          wordBreak: "break-all",
          lineHeight: 1.4,
        }}
      >
        {wallet.address} ↗
      </a>

      {/* Allocation bar */}
      <div style={{ marginBottom: 20 }}>
        <AllocationBar segments={segments} height={8} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            marginTop: 10,
          }}
        >
          {segments.map((s) => (
            <div
              key={s.symbol}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: s.color,
                  flexShrink: 0,
                }}
              />
              {s.symbol}
              <span style={{ color: "var(--text)" }}>
                {s.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Positions list */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
        Positions ({positions.length})
      </div>
      <div>
        {positions.map((p, i) => (
          <div
            key={p.asset_symbol}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 12,
              padding: "12px 0",
              borderBottom: "1px solid var(--border)",
              alignItems: "center",
              opacity: 0,
              animation: `fadeSlideIn 0.3s ease-out ${Math.min(i, 12) * 30}ms forwards`,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {p.underlying_symbol}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {p.ui_amount.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                shares
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {formatUsd(p.value_usd)}
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                textAlign: "right",
                minWidth: 44,
              }}
            >
              {p.pct.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Mirror */}
      <MirrorDialog
        walletAddress={wallet.address}
        positions={positions.map((p) => ({
          asset_symbol: p.asset_symbol,
          pct: p.pct,
        }))}
      />
    </div>
  );
}
