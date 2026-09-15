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

interface MirrorPanelProps {
  walletAddress: string;
  positions: Position[];
}

const QUICK_AMOUNTS = [20, 50, 100, 500];

export default function MirrorPanel({
  walletAddress,
  positions,
}: MirrorPanelProps) {
  const { wallets, select, connected, connecting } = useWallet();
  const [customAmount, setCustomAmount] = useState("");
  const [activeAmount, setActiveAmount] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [noWallet, setNoWallet] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);

  // Auto-open review after wallet connects
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
    if (amt <= 0) return;

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
    if (installed.length === 0) {
      setNoWallet(true);
      return;
    }

    setPendingAmount(amt);
    const adapter = installed[0].adapter;
    select(adapter.name);
    try {
      await adapter.connect();
    } catch {
      setPendingAmount(0);
    }
  };

  const customParsed = parseFloat(customAmount) || 0;

  return (
    <>
      <div
        style={{
          background: "var(--card)",
          borderRadius: 8,
          padding: 20,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Copy this portfolio
        </div>

        {/* Chips = buy buttons, 2×2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => startBuy(v)}
              disabled={connecting}
              style={{
                padding: "14px 0",
                borderRadius: "var(--radius)",
                border: "1px solid var(--green)",
                background: "rgba(20,241,149,0.06)",
                color: "var(--green)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              ${v}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0 12px",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              $
            </span>
            <input
              type="number"
              placeholder="Other"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customParsed > 0) startBuy(customParsed);
              }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "10px 0",
                color: "var(--text)",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
          <button
            disabled={customParsed <= 0 || connecting}
            onClick={() => startBuy(customParsed)}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius)",
              border: "none",
              background:
                customParsed > 0 ? "var(--green)" : "var(--border)",
              color: customParsed > 0 ? "#000" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: customParsed > 0 ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            Buy
          </button>
        </div>

        {noWallet && (
          <div
            style={{
              fontSize: 13,
              color: "var(--red)",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Install Phantom or Solflare to buy.
          </div>
        )}
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
    </>
  );
}
