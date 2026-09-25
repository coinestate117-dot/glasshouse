"use client";

import { useState } from "react";
import { GlassSparkline } from "@/components/GlassSparkline";
import { AllocationDonut } from "@/components/AllocationDonut";
import { CountUp } from "@/components/CountUp";
import { CopyTradeModal } from "@/components/CopyTradeModal";
import type { getWalletDirect } from "@/lib/direct";

type WalletData = Awaited<ReturnType<typeof getWalletDirect>>;

type Props = {
  address: string;
  data: WalletData;
  isCompareMode?: boolean;
  isDemo?: boolean;
};

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(3)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

function addrColor(addr: string): string {
  const h1 = parseInt(addr.slice(0, 6), 16) % 360;
  const h2 = (h1 + 120) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 65%, 50%), hsl(${h2}, 65%, 40%))`;
}

export function WalletDetailClient({ address, data, isCompareMode = false, isDemo = false }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { holdings, total_value, change_24h_pct } = data;
  
  // Roadmap Features State
  const [isWatching, setIsWatching] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const sparkSegments = holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }));
  const isPos = change_24h_pct !== null && change_24h_pct >= 0;
  const isNeg = change_24h_pct !== null && change_24h_pct < 0;

  return (
    <>
      {/* Wallet header card */}
      <div
        className="card g-border animate-in"
        style={{ padding: "18px", marginBottom: "12px", borderRadius: "var(--radius-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius)",
              background: addrColor(address),
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="addr" style={{ fontSize: "13px", marginBottom: "3px" }}>
              {address.slice(0, 8)}…{address.slice(-8)}
            </div>
            {isDemo ? (
              <span className="demo-badge">Beispieldaten</span>
            ) : (
              <a
                href={`https://solscan.io/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ext-link"
              >
                Auf Solscan ansehen ↗
              </a>
            )}
          </div>
          {!isCompareMode && <GlassSparkline segments={sparkSegments} height={32} showLabels />}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>Depotwert</div>
            <div
              className="mono"
              style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}
            >
              <CountUp value={total_value} format={fmtUSD} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", paddingBottom: "2px" }}>
            {change_24h_pct !== null && (
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>24h</div>
                <span className={`change-pill ${isPos ? "change-pos" : isNeg ? "change-neg" : "change-nil"}`} style={{ fontSize: "12px" }}>
                  {isPos ? "+" : ""}{change_24h_pct.toFixed(2)}%
                </span>
              </div>
            )}
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>Positionen</div>
              <span className="badge badge-dim">{holdings.length}</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
          {holdings.length > 0 && (
            <button
              id="open-copy-modal-btn"
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => setShowModal(true)}
            >
              Mit meinem Betrag nachbauen →
            </button>
          )}
          {!isCompareMode && (
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setIsWatching(!isWatching)}
            >
              {isWatching ? "★ Beobachtet" : "☆ Beobachten"}
            </button>
          )}
        </div>
      </div>
      
      {/* Aufteilung */}
      {!isCompareMode && holdings.length > 0 && (
        <div className="card animate-in delay-1" style={{ overflow: "hidden", marginBottom: "12px", padding: "16px" }}>
          <div className="section-header" style={{ marginBottom: "16px", paddingLeft: 0, paddingRight: 0 }}>
            <span className="section-title">Aufteilung</span>
          </div>
          <AllocationDonut segments={holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }))} />
        </div>
      )}

      {/* Holdings */}
      <div className="card animate-in delay-1" style={{ overflow: "hidden", marginBottom: "12px" }}>
        <div className="section-header">
          <span className="section-title">Positionen</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            {holdings.length} Positionen
          </span>
        </div>

        {holdings.length === 0 ? (
          <div className="no-data" style={{ padding: "32px" }}>
            <div className="no-data-sub">Keine xStocks-Positionen in dieser Wallet</div>
          </div>
        ) : (
          holdings.map((h) => (
            <div key={h.mint} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="badge badge-green">{h.symbol}</span>
                  <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {h.ui_amount.toFixed(4)}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    @ {fmtPrice(h.price_usd)}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="value-md">{fmtUSD(h.value_usd)}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    {(h.weight * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="wbar-track">
                <div className="wbar-fill" style={{ width: `${(h.weight * 100).toFixed(1)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Disclaimer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: 1.6 }}>
          {isDemo ? "Erfundene Demo-Daten — keine echte Wallet, keine echten Trades." : "Nur öffentliche On-Chain-Daten. Du entscheidest."}
        </div>
        
        {/* Claim / Notes */}
        {!isCompareMode && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNotes(!showNotes)}>
              Community-Notizen
            </button>
            <button className="btn btn-ghost btn-sm">
              Wallet beanspruchen
            </button>
          </div>
        )}
      </div>
      
      {showNotes && !isCompareMode && (
        <div className="card animate-in" style={{ padding: "16px", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>Community-Notizen</h3>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Verbinde deine Wallet, um eine Notiz zu dieser Wallet zu hinterlassen.
          </div>
          <textarea 
            className="input" 
            placeholder="Notiz schreiben…" 
            style={{ width: "100%", minHeight: "60px", marginBottom: "8px" }} 
          />
          <button className="btn btn-secondary btn-sm">Notiz posten</button>
        </div>
      )}

      {showModal && (
        <CopyTradeModal
          targetAddress={address}
          holdings={holdings.map((h) => ({ mint: h.mint, symbol: h.symbol, weight: h.weight }))}
          onClose={() => setShowModal(false)}
          isDemo={isDemo}
        />
      )}
    </>
  );
}
