"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const AMOUNTS = [20, 50, 100, 500];

interface AmountSheetProps {
  title: string;
  onSelect: (amount: number) => void;
  onClose: () => void;
}

export default function AmountSheet({
  title,
  onSelect,
  onClose,
}: AmountSheetProps) {
  const [custom, setCustom] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const customParsed = parseFloat(custom) || 0;

  return (
    <div
      className="amount-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="amount-sheet">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => onSelect(v)}
              style={{
                padding: "18px 0",
                borderRadius: "var(--radius)",
                border: "1px solid var(--green)",
                background: "rgba(20,241,149,0.06)",
                color: "var(--green)",
                fontSize: 20,
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
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              $
            </span>
            <input
              type="number"
              placeholder="Other amount"
              value={custom}
              autoFocus
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customParsed > 0)
                  onSelect(customParsed);
              }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "14px 0",
                color: "var(--text)",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
          <button
            disabled={customParsed <= 0}
            onClick={() => onSelect(customParsed)}
            style={{
              padding: "14px 20px",
              borderRadius: "var(--radius)",
              border: "none",
              background: customParsed > 0 ? "var(--green)" : "var(--border)",
              color: customParsed > 0 ? "#000" : "var(--text-secondary)",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: customParsed > 0 ? "pointer" : "not-allowed",
            }}
          >
            Go
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            textAlign: "center",
            marginTop: 12,
          }}
        >
          You pay in USDC
        </div>
      </div>

      <style jsx>{`
        .amount-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: fadeIn 0.15s ease-out;
        }
        .amount-sheet {
          background: var(--card);
          border-top: 1px solid var(--border);
          border-radius: 16px 16px 0 0;
          padding: 24px 20px;
          width: 100%;
          animation: sheetSlideUp 0.25s cubic-bezier(0.23, 1, 0.32, 1);
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
          .amount-overlay {
            align-items: center;
          }
          .amount-sheet {
            border-radius: 12px;
            max-width: 400px;
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
          .amount-sheet {
            animation: fadeIn 0.15s ease-out;
          }
        }
      `}</style>
    </div>
  );
}
