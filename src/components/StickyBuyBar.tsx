"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import ReviewSheet from "./ReviewSheet";
import type { BreakdownItem } from "./ReviewSheet";

interface Position {
  asset_symbol: string;
  underlying_symbol: string;
  mint_address: string;
  pct: number;
  logo_url: string | null;
}

interface StickyBuyBarProps {
  walletAddress: string;
  positions: Position[];
}

const AMOUNTS = [50, 100, 500];

export default function StickyBuyBar({
  walletAddress,
  positions,
}: StickyBuyBarProps) {
  const { wallets, select, connected, connecting } = useWallet();
  const [activeAmount, setActiveAmount] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);

  useEffect(() => {
    if (pendingAmount > 0 && connected) {
      setActiveAmount(pendingAmount);
      setPendingAmount(0);
      setShowReview(true);
    }
  }, [pendingAmount, connected]);

  const buildBreakdown = useCallback(
    (amt: number): BreakdownItem[] =>
      positions
        .filter((p) => p.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .map((p) => ({
          symbol: p.underlying_symbol,
          asset_symbol: p.asset_symbol,
          logo_url: p.logo_url,
          mint_address: p.mint_address,
          value: (amt * p.pct) / 100,
          pct: p.pct,
        })),
    [positions]
  );

  const startBuy = async (amt: number) => {
    if (connected) {
      setActiveAmount(amt);
      setShowReview(true);
      return;
    }

    const SOLANA_WALLETS = ["Phantom", "Solflare"];
    const installed = wallets.filter(
      (w) =>
        w.readyState === "Installed" &&
        SOLANA_WALLETS.includes(w.adapter.name)
    );
    if (installed.length === 0) return;

    setPendingAmount(amt);
    const adapter = installed[0].adapter;
    select(adapter.name);
    try {
      await adapter.connect();
    } catch {
      setPendingAmount(0);
    }
  };

  return (
    <>
      <div className="sticky-buy-bar">
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
          }}
        >
          Copy portfolio
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => startBuy(v)}
              disabled={connecting}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius)",
                border: "none",
                background: "var(--green)",
                color: "#000",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              ${v}
            </button>
          ))}
        </div>
      </div>

      {showReview && activeAmount > 0 && (
        <ReviewSheet
          amount={activeAmount}
          breakdown={buildBreakdown(activeAmount)}
          onClose={() => {
            setShowReview(false);
            setActiveAmount(0);
          }}
        />
      )}

      <style jsx>{`
        .sticky-buy-bar {
          position: fixed;
          bottom: 64px;
          left: 0;
          right: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          background: var(--card);
          border-top: 1px solid var(--border);
        }
        @media (min-width: 1024px) {
          .sticky-buy-bar {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
