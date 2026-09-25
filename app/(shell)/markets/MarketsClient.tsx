"use client";

import { useState } from "react";

type Market = {
  symbol: string;
  name: string | null;
  mint: string;
  price: number;
  change24h: number | null;
  logoUrl: string | null;
};

type Props = { markets: Market[] };

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

export function MarketsClient({ markets }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"price" | "change" | "symbol">("price");

  const filtered = markets
    .filter((m) =>
      query === "" ||
      m.symbol.toLowerCase().includes(query.toLowerCase()) ||
      (m.name ?? "").toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "price") return b.price - a.price;
      if (sort === "change") return (b.change24h ?? 0) - (a.change24h ?? 0);
      return a.symbol.localeCompare(b.symbol);
    });

  if (markets.length === 0) {
    return (
      <div className="no-data">
        <div className="no-data-icon">📈</div>
        <div className="no-data-title">Keine Marktdaten</div>
        <div className="no-data-sub">xStocks-Kurse konnten nicht geladen werden. Prüfe deine Verbindung.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Search + sort */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--text-muted)" }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            id="market-search"
            className="input"
            style={{ paddingLeft: "32px", fontSize: "13px" }}
            placeholder="Symbol oder Name suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="price">Nach Kurs</option>
          <option value="change">Nach 24h Δ</option>
          <option value="symbol">A–Z</option>
        </select>
      </div>

      {/* Markets list */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="section-header">
          <span className="section-title">Alle xStocks</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            {filtered.length} Werte
          </span>
        </div>

        {filtered.map((m, i) => {
          const isPos = m.change24h !== null && m.change24h >= 0;
          const isNeg = m.change24h !== null && m.change24h < 0;

          return (
            <div
              key={m.mint}
              className="card-row animate-in"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, cursor: "pointer" }}
              aria-label={`${m.symbol} Kurs ${fmtPrice(m.price)}`}
              onClick={() => window.location.href = `/stock/${m.symbol}`}
            >
              {/* Symbol circle */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius)",
                  background: `linear-gradient(135deg, hsl(${(m.symbol.charCodeAt(0) * 17) % 360}, 55%, 40%), hsl(${(m.symbol.charCodeAt(0) * 17 + 100) % 360}, 55%, 30%))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                {m.symbol.replace("x", "").slice(0, 4)}
              </div>

              {/* Name + symbol */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "2px" }}>
                  {m.symbol}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.name ?? "xStock"}
                </div>
              </div>

              {/* Price + change */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="value-md" style={{ marginBottom: "4px" }}>
                  {fmtPrice(m.price)}
                </div>
                {m.change24h !== null && (
                  <span className={`change-pill ${isPos ? "change-pos" : isNeg ? "change-neg" : "change-nil"}`}>
                    {isPos ? "+" : ""}{m.change24h.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="no-data" style={{ padding: "32px" }}>
            <div className="no-data-sub">Keine Treffer für „{query}“</div>
          </div>
        )}
      </div>
    </div>
  );
}
