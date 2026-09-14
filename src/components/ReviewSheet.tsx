"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import TokenLogo from "./TokenLogo";
import { formatUsd } from "@/lib/format";
import {
  createOrder,
  executeOrder,
  deserializeTx,
  serializeTx,
  friendlyError,
  usdToLamports,
  USDC_MINT,
  MIN_ORDER_AMOUNT,
} from "@/lib/jupiter";
import { X, Check, ExternalLink } from "lucide-react";

/* ─── Types ─── */

export interface BreakdownItem {
  symbol: string;
  asset_symbol: string;
  logo_url: string | null;
  mint_address: string;
  value: number;
  pct: number;
}

type OrderStatus = "waiting" | "signing" | "confirmed" | "failed" | "skipped";
type Phase = "review" | "executing" | "done";

interface Order {
  symbol: string;
  asset_symbol: string;
  logo_url: string | null;
  mint_address: string;
  usdcAmount: number;
  status: OrderStatus;
  signature?: string;
  error?: string;
}

interface ReviewSheetProps {
  amount: number;
  breakdown: BreakdownItem[];
  onClose: () => void;
}

/* ─── Component ─── */

export default function ReviewSheet({
  amount,
  breakdown,
  onClose,
}: ReviewSheetProps) {
  const { publicKey, signTransaction } = useWallet();
  const [phase, setPhase] = useState<Phase>("review");
  const [orders, setOrders] = useState<Order[]>([]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Build orders from breakdown, filtering tiny amounts
  const buildOrders = useCallback((): Order[] => {
    const visible = breakdown.filter(
      (b) => usdToLamports(b.value) >= MIN_ORDER_AMOUNT
    );
    const skipped = breakdown.filter(
      (b) => b.value >= 0.01 && usdToLamports(b.value) < MIN_ORDER_AMOUNT
    );

    const result: Order[] = visible.map((b) => ({
      symbol: b.symbol,
      asset_symbol: b.asset_symbol,
      logo_url: b.logo_url,
      mint_address: b.mint_address,
      usdcAmount: b.value,
      status: "waiting" as const,
    }));

    // Add skipped items so user sees them
    for (const b of skipped) {
      result.push({
        symbol: b.symbol,
        asset_symbol: b.asset_symbol,
        logo_url: b.logo_url,
        mint_address: b.mint_address,
        usdcAmount: b.value,
        status: "skipped" as const,
        error: "Amount too small",
      });
    }

    return result;
  }, [breakdown]);

  // Execute orders sequentially
  const execute = useCallback(async () => {
    if (!publicKey || !signTransaction) return;

    const orderList = buildOrders();
    setOrders(orderList);
    setPhase("executing");

    const taker = publicKey.toBase58();

    for (let i = 0; i < orderList.length; i++) {
      const order = orderList[i];
      if (order.status === "skipped") continue;

      // Update status → signing
      setOrders((prev) =>
        prev.map((o, idx) => (idx === i ? { ...o, status: "signing" } : o))
      );

      try {
        // 1. Create order
        const jupOrder = await createOrder({
          inputMint: USDC_MINT,
          outputMint: order.mint_address,
          amount: usdToLamports(order.usdcAmount),
          taker,
        });

        // 2. Deserialize and sign
        const tx = deserializeTx(jupOrder.transaction);
        const signed = await signTransaction(tx);
        const signedBase64 = serializeTx(signed);

        // 3. Execute
        const result = await executeOrder(signedBase64, jupOrder.requestId);

        if (result.status === "Success") {
          setOrders((prev) =>
            prev.map((o, idx) =>
              idx === i
                ? { ...o, status: "confirmed", signature: result.signature }
                : o
            )
          );
        } else {
          setOrders((prev) =>
            prev.map((o, idx) =>
              idx === i
                ? {
                    ...o,
                    status: "failed",
                    error: friendlyError(result.error || "Swap failed"),
                  }
                : o
            )
          );
        }
      } catch (err) {
        setOrders((prev) =>
          prev.map((o, idx) =>
            idx === i
              ? { ...o, status: "failed", error: friendlyError(err) }
              : o
          )
        );
      }
    }

    setPhase("done");
  }, [publicKey, signTransaction, buildOrders]);

  const estimatedFee = amount * 0.003;
  const visibleBreakdown = breakdown.filter((b) => b.value >= 0.01);
  const tooSmall = breakdown.filter(
    (b) => b.value >= 0.01 && usdToLamports(b.value) < MIN_ORDER_AMOUNT
  );

  // Done summary
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const failed = orders.filter((o) => o.status === "failed");
  const totalSpent = confirmed.reduce((s, o) => s + o.usdcAmount, 0);

  return (
    <div
      className="review-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "executing") onClose();
      }}
    >
      <div className="review-sheet">
        {/* ─── REVIEW PHASE ─── */}
        {phase === "review" && (
          <>
            <div className="sheet-header">
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                Review your order
              </div>
              <button onClick={onClose} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="section-label">
              You&rsquo;re buying ({visibleBreakdown.length} stocks)
            </div>

            <div className="order-list">
              {visibleBreakdown.map((b, i) => (
                <div
                  key={b.symbol}
                  className="order-row"
                  style={{
                    opacity: 0,
                    animation: `fadeSlideIn 0.25s cubic-bezier(0.23,1,0.32,1) ${i * 40}ms forwards`,
                  }}
                >
                  <TokenLogo
                    symbol={b.asset_symbol}
                    logoUrl={b.logo_url}
                    size={28}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {b.symbol}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>
                      {b.pct.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {formatUsd(b.value)}
                  </div>
                </div>
              ))}
            </div>

            {tooSmall.length > 0 && (
              <div
                className="text-secondary"
                style={{ fontSize: 12, marginBottom: 12 }}
              >
                {tooSmall.length} position
                {tooSmall.length > 1 ? "s" : ""} under $0.50 — skipped
              </div>
            )}

            <div className="summary-box">
              <div className="summary-row">
                <span>Total</span>
                <span style={{ color: "var(--text)", fontWeight: 600 }}>
                  {formatUsd(amount)}
                </span>
              </div>
              <div className="summary-row">
                <span>Est. fee</span>
                <span>~{formatUsd(estimatedFee)}</span>
              </div>
            </div>

            <button onClick={execute} className="btn-primary">
              Confirm
            </button>
            <button onClick={onClose} className="btn-ghost">
              Cancel
            </button>
          </>
        )}

        {/* ─── EXECUTING PHASE ─── */}
        {(phase === "executing" || phase === "done") && (
          <>
            <div className="sheet-header">
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {phase === "executing" ? "Buying…" : "Done"}
              </div>
              {phase === "done" && (
                <button onClick={onClose} className="close-btn">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="order-list order-list-tall">
              {orders.map((o, i) => (
                <div
                  key={o.symbol}
                  className="order-row"
                  style={{
                    opacity: 0,
                    animation: `fadeSlideIn 0.25s cubic-bezier(0.23,1,0.32,1) ${i * 40}ms forwards`,
                  }}
                >
                  <TokenLogo
                    symbol={o.asset_symbol}
                    logoUrl={o.logo_url}
                    size={28}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {o.symbol}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>
                      {formatUsd(o.usdcAmount)}
                    </div>
                  </div>
                  <StatusBadge status={o.status} signature={o.signature} />
                </div>
              ))}
            </div>

            {/* Error details */}
            {failed.length > 0 && phase === "done" && (
              <div style={{ marginBottom: 16 }}>
                {failed.map((o) => (
                  <div
                    key={o.symbol}
                    className="text-secondary"
                    style={{
                      fontSize: 12,
                      padding: "4px 0",
                      color: "var(--red)",
                    }}
                  >
                    {o.symbol}: {o.error}
                  </div>
                ))}
              </div>
            )}

            {/* Done summary */}
            {phase === "done" && (
              <>
                <div className="summary-box">
                  <div className="summary-row">
                    <span>Completed</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>
                      {confirmed.length} of {orders.filter((o) => o.status !== "skipped").length}
                    </span>
                  </div>
                  {confirmed.length > 0 && (
                    <div className="summary-row">
                      <span>Total spent</span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>
                        {formatUsd(totalSpent)}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={onClose} className="btn-primary">
                  Close
                </button>
              </>
            )}
          </>
        )}
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
          animation: sheetSlideUp 0.25s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .section-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
        }
        .order-list {
          margin-bottom: 16px;
          max-height: 300px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .order-list-tall {
          max-height: 400px;
        }
        .order-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .text-secondary {
          color: var(--text-secondary);
        }
        .summary-box {
          background: var(--bg);
          border-radius: var(--radius);
          padding: 14px;
          margin-bottom: 20px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .summary-row + .summary-row {
          margin-top: 8px;
        }
        .btn-primary {
          width: 100%;
          padding: 14px 0;
          border-radius: var(--radius);
          border: none;
          background: var(--green);
          color: #000;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          margin-bottom: 10px;
          transition: opacity 0.15s ease;
        }
        .btn-primary:hover {
          opacity: 0.9;
        }
        .btn-ghost {
          width: 100%;
          padding: 12px 0;
          border-radius: var(--radius);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
        }

        @keyframes sheetSlideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @media (min-width: 1024px) {
          .review-overlay {
            align-items: center;
          }
          .review-sheet {
            border-radius: 12px;
            max-width: 440px;
            border: 1px solid var(--border);
            animation: sheetScaleIn 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          }
        }

        @keyframes sheetScaleIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .review-sheet {
            animation: fadeIn 0.15s ease-out;
          }
          .order-row {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─── Status Badge ─── */

function StatusBadge({
  status,
  signature,
}: {
  status: OrderStatus;
  signature?: string;
}) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    transition: "color 0.2s ease, opacity 0.2s ease",
  };

  if (status === "waiting") {
    return (
      <span style={{ ...base, color: "var(--text-secondary)" }} className="pulse-subtle">
        Waiting
      </span>
    );
  }

  if (status === "signing") {
    return (
      <span style={{ ...base, color: "var(--green)" }} className="pulse-subtle">
        Sign in wallet
      </span>
    );
  }

  if (status === "confirmed") {
    const inner = (
      <span style={{ ...base, color: "var(--green)" }}>
        <span className="check-pop">
          <Check size={14} strokeWidth={3} />
        </span>
        Done
      </span>
    );

    if (signature) {
      return (
        <a
          href={`https://solscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <span style={{ ...base, color: "var(--green)" }}>
            <span className="check-pop">
              <Check size={14} strokeWidth={3} />
            </span>
            Done
            <ExternalLink size={10} style={{ opacity: 0.6 }} />
          </span>
        </a>
      );
    }

    return inner;
  }

  if (status === "skipped") {
    return (
      <span style={{ ...base, color: "var(--text-secondary)", fontSize: 11 }}>
        Skipped
      </span>
    );
  }

  // failed
  return (
    <span style={{ ...base, color: "var(--red)" }}>
      Failed
    </span>
  );
}
