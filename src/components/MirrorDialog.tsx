"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";

interface Position {
  asset_symbol: string;
  pct: number;
}

interface MirrorDialogProps {
  walletAddress: string;
  positions: Position[];
}

export default function MirrorDialog({
  walletAddress,
  positions,
}: MirrorDialogProps) {
  const [amount, setAmount] = useState("");
  const parsed = parseFloat(amount) || 0;

  const breakdown = positions
    .filter((p) => p.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .map((p) => ({
      symbol: p.asset_symbol,
      value: (parsed * p.pct) / 100,
      pct: p.pct,
    }));

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 20,
        marginTop: 24,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        Mirror this Portfolio
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 600 }}>$</span>
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
            padding: "10px 12px",
            color: "var(--text)",
            fontSize: 18,
            fontWeight: 600,
            fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
            outline: "none",
          }}
        />
      </div>

      {parsed > 0 && (
        <div style={{ marginBottom: 16 }}>
          {breakdown.map((b) => (
            <div
              key={b.symbol}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontSize: 14,
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{b.symbol}</span>
              <span style={{ color: "var(--text)" }}>
                {formatUsd(b.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        disabled
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: "var(--radius)",
          border: "none",
          background: "var(--border)",
          color: "var(--text-secondary)",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "not-allowed",
        }}
      >
        Coming Day 3
      </button>
    </div>
  );
}
