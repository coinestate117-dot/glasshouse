"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassSparkline } from "@/components/GlassSparkline";
import { CountUp } from "@/components/CountUp";
import type { LeaderboardEntry } from "@/lib/direct";

type Props = {
  leaderboard: LeaderboardEntry[];
  hasHeliusKey: boolean;
  isDemo?: boolean;
};

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function shorten(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? "rank rank-gold" : rank === 2 ? "rank rank-silver" : rank === 3 ? "rank rank-bronze" : "rank rank-normal";
  return <span className={cls}>{rank}</span>;
}

function getTags(entry: LeaderboardEntry): string[] {
  const tags: string[] = [];
  if (entry.total_value >= 1000000) tags.push("Whale");
  else if (entry.total_value >= 100000) tags.push("Dolphin");
  
  if (entry.position_count >= 15) tags.push("Index");
  else if (entry.top_weight && entry.top_weight >= 0.75) tags.push("Concentrated");
  else tags.push("Investor");
  
  return tags;
}

function SkeletonRow() {
  return (
    <div className="card-row" style={{ cursor: "default", gap: "14px" }}>
      <div className="skel" style={{ width: "26px", height: "26px", borderRadius: "3px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div className="skel" style={{ width: "120px", height: "13px" }} />
        <div className="skel" style={{ width: "80px", height: "11px" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
        <div className="skel" style={{ width: "64px", height: "17px" }} />
        <div className="skel" style={{ width: "42px", height: "11px" }} />
      </div>
    </div>
  );
}

export function LeaderboardClient({ leaderboard, hasHeliusKey, isDemo = false }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "top10">("all");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);

  const displayed = filter === "top10" ? leaderboard.slice(0, 10) : leaderboard;
  const maxValue = displayed[0]?.total_value ?? 1;

  // Balken erst nach dem ersten Paint füllen, damit die Animation läuft.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleCompare = (address: string) => {
    setSelectedWallets((prev) => 
      prev.includes(address) 
        ? prev.filter((a) => a !== address)
        : prev.length < 3 ? [...prev, address] : prev
    );
  };

  const handleRowClick = (address: string) => {
    if (isCompareMode) {
      toggleCompare(address);
    } else {
      router.push(`/wallet/${address}`);
    }
  };

  if (!hasHeliusKey) {
    return (
      <div
        className="card"
        style={{ overflow: "hidden" }}
      >
        <div className="no-data">
          <div className="no-data-icon">🔑</div>
          <div className="no-data-title">Helius API-Key erforderlich</div>
          <div className="no-data-sub">
            Füge <code style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontSize: "11px" }}>HELIUS_API_KEY</code> zu deiner{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "11px" }}>.env.local</code> hinzu und starte den Server neu.
          </div>
          <a
            href="https://helius.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "8px" }}
          >
            Kostenlosen Key auf helius.dev holen ↗
          </a>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        {/* Loading skeletons */}
        <div className="section-header">
          <span className="section-title">Top Wallets</span>
          <div className="skel" style={{ width: "40px", height: "16px" }} />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
        <div style={{ padding: "14px 16px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px" }}>
            <div className="spinner" style={{ width: "14px", height: "14px" }} />
            Wallets auf Solana Mainnet werden gesucht…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "6px" }}>
        {(["all", "top10"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn btn-sm"
            style={{
              background: filter === f ? "var(--surface-2)" : "transparent",
              color: filter === f ? "var(--text)" : "var(--text-muted)",
              border: `1px solid ${filter === f ? "var(--border-glow)" : "var(--border)"}`,
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "5px 12px",
            }}
          >
            {f === "all" ? `Alle (${leaderboard.length})` : "Top 10"}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
          <span className="pulse-dot" style={{ width: "5px", height: "5px" }} />
          Live
        </div>
      </div>

      {/* Compare Mode Toggle */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={isCompareMode} 
              onChange={() => {
                setIsCompareMode(!isCompareMode);
                if (isCompareMode) setSelectedWallets([]);
              }} 
            />
            Vergleichen (bis zu 3 auswählen)
          </label>
        </div>
        {isCompareMode && (
          <button 
            className="btn btn-primary btn-sm"
            disabled={selectedWallets.length < 2}
            onClick={() => router.push(`/compare?wallets=${selectedWallets.join(',')}`)}
          >
            {selectedWallets.length}/3 vergleichen →
          </button>
        )}
      </div>

      {/* Card list */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="section-header">
          <span className="section-title">Rang · Wallet · Depot</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            {displayed.length} Wallets
          </span>
        </div>

        {displayed.map((entry, idx) => {
          const change = entry.change_24h_pct;
          const isPos = change !== null && change >= 0;
          const isNeg = change !== null && change < 0;

          return (
            <div
              key={entry.address}
              id={`wallet-row-${entry.rank}`}
              className={`card-row animate-in ${selectedWallets.includes(entry.address) ? "selected" : ""}`}
              style={{ 
                animationDelay: `${Math.min(idx * 40, 400)}ms`,
                background: selectedWallets.includes(entry.address) ? "rgba(20, 241, 149, 0.05)" : undefined,
                borderColor: selectedWallets.includes(entry.address) ? "var(--green)" : undefined
              }}
              onClick={() => handleRowClick(entry.address)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleRowClick(entry.address)}
              aria-label={`Rang ${entry.rank}, Depotwert ${fmtUSD(entry.total_value)}`}
            >
              {isCompareMode && (
                <div style={{ paddingRight: "12px", display: "flex", alignItems: "center" }}>
                  <input 
                    type="checkbox" 
                    checked={selectedWallets.includes(entry.address)} 
                    readOnly 
                    style={{ pointerEvents: "none" }}
                  />
                </div>
              )}
              {/* Rank */}
              <RankBadge rank={entry.rank} />

              {/* Center info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
                  <span className="addr">{shorten(entry.address)}</span>
                  {getTags(entry).map(tag => (
                    <span key={tag} className="badge badge-dim" style={{ fontSize: "10px" }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    {entry.position_count} Pos.
                  </span>
                  {change !== null && (
                    <span
                      className={`change-pill ${isPos ? "change-pos" : isNeg ? "change-neg" : "change-nil"}`}
                    >
                      {isPos ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  )}
                </div>

                {/* Depotwert relativ zur größten Wallet — 60ms Versatz pro Zeile */}
                <div className="bar-track" style={{ height: "6px" }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: mounted ? `${Math.max((entry.total_value / maxValue) * 100, 1.5)}%` : "0%",
                      transitionDelay: `${Math.min(idx * 60, 600)}ms`,
                    }}
                  />
                </div>
              </div>

              {/* Right — value + sparkline */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                <span className="value-md">
                  <CountUp value={entry.total_value} format={fmtUSD} />
                </span>
                <GlassSparkline segments={entry.holdings} height={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 0",
          color: "var(--text-muted)",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{isDemo ? "Erfundene Demo-Daten · keine echten Wallets" : "Öffentliche On-Chain-Daten · du entscheidest"}</span>
        {isDemo ? (
          <span className="demo-badge">Beispieldaten</span>
        ) : (
          <a
            href="https://solscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="ext-link"
          >
            Auf Solscan prüfen ↗
          </a>
        )}
      </div>
    </div>
  );
}
