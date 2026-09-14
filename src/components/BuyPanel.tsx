"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import TokenLogo from "./TokenLogo";
import ReviewSheet from "./ReviewSheet";
import type { BreakdownItem } from "./ReviewSheet";

interface BuyPanelProps {
  ticker: string;
  assetSymbol: string;
  mintAddress: string;
  priceUsd: number;
  logoUrl: string | null;
}

const QUICK_AMOUNTS = [20, 50, 100, 500];

export default function BuyPanel({
  ticker,
  assetSymbol,
  mintAddress,
  priceUsd,
  logoUrl,
}: BuyPanelProps) {
  const { wallets, select, connected, connecting } = useWallet();
  const [amount, setAmount] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [noWallet, setNoWallet] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const parsed = parseFloat(amount) || 0;

  const estimatedShares = priceUsd > 0 ? parsed / priceUsd : 0;

  useEffect(() => {
    if (pendingReview && connected) {
      setPendingReview(false);
      setShowReview(true);
    }
  }, [pendingReview, connected]);

  const breakdown: BreakdownItem[] =
    parsed > 0
      ? [
          {
            symbol: ticker,
            asset_symbol: assetSymbol,
            logo_url: logoUrl,
            mint_address: mintAddress,
            value: parsed,
            pct: 100,
          },
        ]
      : [];

  const handleBuy = async () => {
    if (parsed <= 0) return;

    if (connected) {
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

    const adapter = installed[0].adapter;
    select(adapter.name);
    setPendingReview(true);

    try {
      await adapter.connect();
    } catch {
      setPendingReview(false);
    }
  };

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
          Buy {ticker}
        </div>

        {/* Amount — mobile: big centered, desktop: input */}
        <div className="buy-amount-mobile">
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              textAlign: "center",
              padding: "8px 0",
              letterSpacing: "-0.02em",
              color: parsed > 0 ? "var(--text)" : "var(--text-secondary)",
            }}
          >
            ${parsed > 0 ? parsed.toLocaleString("en-US") : "0"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            USDC
          </div>
        </div>

        <div className="buy-amount-desktop">
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              $
            </span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                flex: 1,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                color: "var(--text)",
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "inherit",
                fontVariantNumeric: "tabular-nums",
                outline: "none",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 12,
            }}
          >
            You pay in USDC
          </div>
        </div>

        {/* Quick chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "var(--radius)",
                border: `1px solid ${
                  parsed === v ? "var(--green)" : "var(--border)"
                }`,
                background:
                  parsed === v ? "rgba(20,241,149,0.08)" : "var(--bg)",
                color:
                  parsed === v ? "var(--green)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                transition:
                  "border-color 0.15s ease, background 0.15s ease",
              }}
            >
              ${v}
            </button>
          ))}
        </div>

        {/* Estimated output */}
        {parsed > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              marginBottom: 16,
            }}
          >
            <TokenLogo symbol={assetSymbol} logoUrl={logoUrl} size={24} />
            <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              You&rsquo;ll get ~
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {estimatedShares.toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}{" "}
                {ticker}
              </span>
            </div>
          </div>
        )}

        {noWallet && (
          <div
            style={{
              fontSize: 13,
              color: "var(--red)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            No wallet found. Install Phantom or Solflare.
          </div>
        )}

        <button
          disabled={parsed <= 0 || connecting}
          onClick={handleBuy}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "var(--radius)",
            border: "none",
            background: parsed > 0 ? "var(--green)" : "var(--border)",
            color: parsed > 0 ? "#000" : "var(--text-secondary)",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: parsed > 0 ? "pointer" : "not-allowed",
            transition: "opacity 0.15s ease",
          }}
        >
          {connecting
            ? "Connecting…"
            : parsed > 0
              ? `Buy ${ticker}`
              : "Enter an amount"}
        </button>
      </div>

      {showReview && (
        <ReviewSheet
          amount={parsed}
          breakdown={breakdown}
          onClose={() => setShowReview(false)}
        />
      )}

      <style jsx>{`
        .buy-amount-desktop {
          display: none;
        }
        @media (min-width: 1024px) {
          .buy-amount-mobile {
            display: none;
          }
          .buy-amount-desktop {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
