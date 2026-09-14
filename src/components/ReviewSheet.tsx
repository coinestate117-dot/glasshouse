"use client";

import { useEffect } from "react";
import TokenLogo from "./TokenLogo";
import { formatUsd } from "@/lib/format";
import { X } from "lucide-react";

interface BreakdownItem {
  symbol: string;
  asset_symbol: string;
  logo_url: string | null;
  value: number;
  pct: number;
}

interface ReviewSheetProps {
  amount: number;
  breakdown: BreakdownItem[];
  onClose: () => void;
}

export default function ReviewSheet({
  amount,
  breakdown,
  onClose,
}: ReviewSheetProps) {
  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const estimatedFee = amount * 0.003; // ~0.3% estimated
  const slippage = 0.5; // 0.5%

  return (
    <div
      className="review-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="review-sheet">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            Review Transaction
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Orders */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
          }}
        >
          Orders ({breakdown.filter((b) => b.value >= 0.01).length})
        </div>

        <div style={{ marginBottom: 20 }}>
          {breakdown
            .filter((b) => b.value >= 0.01)
            .map((b) => (
              <div
                key={b.symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <TokenLogo
                  symbol={b.asset_symbol}
                  logoUrl={b.logo_url}
                  size={28}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Buy {b.symbol}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {b.pct.toFixed(1)}% of portfolio
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: "right",
                  }}
                >
                  {formatUsd(b.value)}
                </div>
              </div>
            ))}
        </div>

        {/* Summary */}
        <div
          style={{
            background: "var(--bg)",
            borderRadius: "var(--radius)",
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            <span>Total</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              {formatUsd(amount)} USDC
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            <span>Est. fee</span>
            <span>~{formatUsd(estimatedFee)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            <span>Max slippage</span>
            <span>{slippage}%</span>
          </div>
        </div>

        {/* Actions */}
        <button
          disabled
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "var(--radius)",
            border: "none",
            background: "var(--border)",
            color: "var(--text-secondary)",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "not-allowed",
            marginBottom: 10,
          }}
        >
          Connect Wallet to Confirm
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: "var(--radius)",
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>

      <style jsx>{`
        .review-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: fadeIn 0.15s ease-out;
        }
        .review-sheet {
          background: var(--card);
          border-top: 1px solid var(--border);
          border-radius: 16px 16px 0 0;
          padding: 24px 20px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (min-width: 1024px) {
          .review-overlay {
            align-items: center;
          }
          .review-sheet {
            border-radius: 12px;
            max-width: 440px;
            border: 1px solid var(--border);
            animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }
      `}</style>
    </div>
  );
}
