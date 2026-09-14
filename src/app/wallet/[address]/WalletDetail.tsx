"use client";

import CountUp from "@/components/CountUp";
import AllocationBar, { colorForSymbol } from "@/components/AllocationBar";
import WalletTypeBadge from "@/components/WalletTypeBadge";
import TokenLogo from "@/components/TokenLogo";
import MirrorPanel from "@/components/MirrorPanel";
import { formatUsdFull, formatUsd, formatPct } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import type { WalletType } from "@/types";

interface Position {
  asset_symbol: string;
  mint_address: string;
  ui_amount: number;
  value_usd: number;
  pct: number;
  logo_url: string | null;
  underlying_symbol: string;
}

interface RecentTrade {
  signature: string;
  blockTime: number;
  err: boolean;
}

interface WalletDetailProps {
  wallet: {
    address: string;
    total_value_usd: number;
    change_24h_pct: number;
    position_count: number;
    wallet_type: WalletType;
  };
  positions: Position[];
  recentTrades: RecentTrade[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function WalletDetail({
  wallet,
  positions,
  recentTrades,
}: WalletDetailProps) {
  const segments = positions.map((p) => ({
    symbol: p.underlying_symbol,
    pct: p.pct,
    color: colorForSymbol(p.asset_symbol),
  }));

  const mirrorPositions = positions.map((p) => ({
    asset_symbol: p.asset_symbol,
    underlying_symbol: p.underlying_symbol,
    pct: p.pct,
    logo_url: p.logo_url,
  }));

  return (
    <div className="wallet-detail-layout" style={{ padding: "16px 16px 0" }}>
      {/* Left column: content */}
      <div className="wallet-detail-main">
        {/* Hero */}
        <div
          style={{
            background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
            borderRadius: 8,
            padding: "36px 20px 32px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Portfolio Value
          </div>
          <CountUp
            end={wallet.total_value_usd}
            formatter={formatUsdFull}
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1,
              display: "block",
              letterSpacing: "-0.02em",
            }}
          />
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginTop: 8,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <CountUp
              end={wallet.change_24h_pct}
              duration={400}
              formatter={(v) => formatPct(v)}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
                marginLeft: 6,
              }}
            >
              24h
            </span>
          </div>
        </div>

        {/* Badge + address */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <WalletTypeBadge type={wallet.wallet_type} />
        </div>
        <a
          href={`https://solscan.io/account/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 16,
            wordBreak: "break-all",
            lineHeight: 1.4,
          }}
        >
          {wallet.address}
          <ExternalLink size={12} style={{ flexShrink: 0 }} />
        </a>

        {/* Allocation bar */}
        <div style={{ marginBottom: 20 }}>
          <AllocationBar segments={segments} height={8} />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 14px",
              marginTop: 10,
            }}
          >
            {positions.slice(0, 8).map((p) => (
              <div
                key={p.asset_symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                <TokenLogo
                  symbol={p.asset_symbol}
                  logoUrl={p.logo_url}
                  size={16}
                />
                <span>{p.underlying_symbol}</span>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>
                  {p.pct.toFixed(1)}%
                </span>
              </div>
            ))}
            {positions.length > 8 && (
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                +{positions.length - 8} more
              </span>
            )}
          </div>
        </div>

        {/* Positions */}
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
          Positions ({positions.length})
        </div>
        <div>
          {positions.map((p, i) => (
            <div
              key={p.asset_symbol}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
                opacity: 0,
                animation: `fadeSlideIn 0.3s ease-out ${Math.min(i, 12) * 30}ms forwards`,
              }}
            >
              <TokenLogo
                symbol={p.asset_symbol}
                logoUrl={p.logo_url}
                size={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
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
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {formatUsd(p.value_usd)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 1,
                  }}
                >
                  {p.pct.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        {recentTrades.length > 0 && (
          <div style={{ marginTop: 24 }}>
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
              Recent Activity
            </div>
            {recentTrades.map((tx, i) => (
              <a
                key={tx.signature}
                href={`https://solscan.io/tx/${tx.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  opacity: 0,
                  animation: `fadeSlideIn 0.3s ease-out ${Math.min(i, 12) * 30}ms forwards`,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    color: "var(--text)",
                  }}
                >
                  {tx.signature.slice(0, 8)}…{tx.signature.slice(-4)}
                  {tx.err && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--red)",
                        fontWeight: 600,
                        marginLeft: 6,
                      }}
                    >
                      Failed
                    </span>
                  )}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeAgo(tx.blockTime)}
                  <ExternalLink size={11} />
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Mirror panel — mobile only (below content) */}
        <div className="mirror-mobile" style={{ marginTop: 24 }}>
          <MirrorPanel
            walletAddress={wallet.address}
            positions={mirrorPositions}
          />
        </div>
      </div>

      {/* Right column: sticky mirror panel — desktop only */}
      <div className="wallet-detail-sidebar">
        <div style={{ position: "sticky", top: 80 }}>
          <MirrorPanel
            walletAddress={wallet.address}
            positions={mirrorPositions}
          />
        </div>
      </div>

      <style jsx>{`
        .wallet-detail-layout {
          display: block;
        }
        .wallet-detail-sidebar {
          display: none;
        }
        .mirror-mobile {
          display: block;
        }
        @media (min-width: 1024px) {
          .wallet-detail-layout {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 24px;
            align-items: start;
          }
          .wallet-detail-sidebar {
            display: block;
          }
          .mirror-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
