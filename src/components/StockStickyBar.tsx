"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import AmountSheet from "./AmountSheet";
import ReviewSheet from "./ReviewSheet";
import type { BreakdownItem } from "./ReviewSheet";

interface StockStickyBarProps {
  ticker: string;
  assetSymbol: string;
  mintAddress: string;
  logoUrl: string | null;
}

export default function StockStickyBar({
  ticker,
  assetSymbol,
  mintAddress,
  logoUrl,
}: StockStickyBarProps) {
  const { wallets, select, connected } = useWallet();
  const [showAmount, setShowAmount] = useState(false);
  const [activeAmount, setActiveAmount] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [sellMsg, setSellMsg] = useState(false);

  useEffect(() => {
    if (pendingAmount > 0 && connected) {
      setActiveAmount(pendingAmount);
      setPendingAmount(0);
      setShowAmount(false);
      setShowReview(true);
    }
  }, [pendingAmount, connected]);

  const handleAmount = async (amt: number) => {
    if (connected) {
      setActiveAmount(amt);
      setShowAmount(false);
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

  const handleSell = () => {
    setSellMsg(true);
    setTimeout(() => setSellMsg(false), 2000);
  };

  const breakdown: BreakdownItem[] =
    activeAmount > 0
      ? [
          {
            symbol: ticker,
            asset_symbol: assetSymbol,
            logo_url: logoUrl,
            mint_address: mintAddress,
            value: activeAmount,
            pct: 100,
          },
        ]
      : [];

  return (
    <>
      <div className="stock-sticky-bar">
        <button
          onClick={() => setShowAmount(true)}
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: "var(--radius)",
            border: "none",
            background: "var(--green)",
            color: "#000",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "inherit",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          BUY
        </button>
        <button
          onClick={handleSell}
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: "var(--radius)",
            border: "none",
            background: "rgba(255,77,77,0.15)",
            color: "var(--text-secondary)",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "inherit",
            cursor: "pointer",
            letterSpacing: "0.04em",
            opacity: 0.5,
          }}
        >
          SELL
        </button>
      </div>

      {sellMsg && (
        <div className="sell-toast">
          You don&rsquo;t hold {ticker}
        </div>
      )}

      {showAmount && (
        <AmountSheet
          title={`Buy ${ticker}`}
          onSelect={handleAmount}
          onClose={() => setShowAmount(false)}
        />
      )}

      {showReview && activeAmount > 0 && (
        <ReviewSheet
          amount={activeAmount}
          breakdown={breakdown}
          onClose={() => {
            setShowReview(false);
            setActiveAmount(0);
          }}
        />
      )}

      <style jsx>{`
        .stock-sticky-bar {
          position: fixed;
          bottom: 64px;
          left: 0;
          right: 0;
          z-index: 90;
          display: flex;
          gap: 8;
          padding: 10px 16px;
          padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          background: var(--card);
          border-top: 1px solid var(--border);
        }
        .sell-toast {
          position: fixed;
          bottom: 130px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 95;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          color: var(--red);
          animation: fadeIn 0.15s ease-out;
        }
        @media (min-width: 1024px) {
          .stock-sticky-bar {
            display: none;
          }
          .sell-toast {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
