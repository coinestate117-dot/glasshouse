"use client";

import CountUp from "@/components/CountUp";
import AllocationBar, { colorForSymbol } from "@/components/AllocationBar";
import WalletTypeBadge from "@/components/WalletTypeBadge";
import TokenLogo from "@/components/TokenLogo";
import MirrorPanel from "@/components/MirrorPanel";
import ActivityFeed from "@/components/ActivityFeed";
import { formatUsdFull, formatUsd, formatPct } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import type { WalletType } from "@/types";
import type { ActivityItem } from "@/lib/activity";

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
    wallet_type: WalletType;
  };
  positions: Position[];
  activity: ActivityItem[];
}

export default function WalletDetail({
  wallet,
  positions,
  activity,
}: WalletDetailProps) {
  const topN = positions.slice(0, 6);
  const otherPct = positions.slice(6).reduce((s, p) => s + p.pct, 0);
  const segments = [
    ...topN.map((p) => ({
      symbol: p.underlying_symbol,
      pct: p.pct,
      color: colorForSymbol(p.asset_symbol),
    })),
    ...(otherPct > 0
      ? [{ symbol: "Other", pct: otherPct, color: "var(--border)" }]
      : []),
  ];

  const mirrorPositions = positions.map((p) => ({
    asset_symbol: p.asset_symbol,
    underlying_symbol: p.underlying_symbol,
    mint_address: p.mint_address,
    pct: p.pct,
    logo_url: p.logo_url,
  }));

  return (
    <div className="wallet-detail-layout" style={{ padding: "16px 16px 0" }}>
      {/* Left column */}
      <div className="wallet-detail-main">
        {/* Hero */}
        <div
          style={{
            background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
            borderRadius: 8,
            padding: "32px 20px 28px",
            marginBottom: 12,
          }}
        >
          <CountUp
            end={wallet.total_value_usd}
            formatter={formatUsdFull}
            style={{
              fontSize: 42,
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
              today
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
        </div>

        {/* Positions — scrollable */}
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
          Holdings ({positions.length})
        </div>
        <div className="scrollable-list">
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

        {/* Recent Activity with filter chips */}
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
          <ActivityFeed items={activity} showWallet={false} />
        </div>

        {/* Mirror panel — mobile only */}
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
        .scrollable-list {
          max-height: 600px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
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
