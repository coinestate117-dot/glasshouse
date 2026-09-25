"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MarketRow, MarketCategory } from "@/lib/markets";
import { CATEGORY_LABELS, filterByCategory } from "@/lib/markets";

const usd = (n: number) =>
  n >= 1000
    ? `$${n.toLocaleString("de-CH", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
    : `$${n.toFixed(2)}`;

const compact = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)} Mio.` : `$${(n / 1000).toFixed(0)} Tsd.`;

function Change({ v }: { v: number | null }) {
  if (v === null) return <span className="mk-change">—</span>;
  return (
    <span className="mk-change" style={{ color: v >= 0 ? "var(--positive)" : "var(--negative)" }}>
      {v >= 0 ? "+" : "−"}
      {Math.abs(v).toFixed(2)} %
    </span>
  );
}

/** Kleiner Verlauf aus 7-Tage- und 24-Stunden-Veränderung. Keine Kurve aus
 *  erfundenen Punkten — nur drei echte Stützstellen, verbunden. */
function MiniTrend({ d7, d1 }: { d7: number | null; d1: number | null }) {
  if (d7 === null && d1 === null) return <span className="mk-spark" />;
  const a = 0;
  const b = (d7 ?? 0) - (d1 ?? 0);
  const c = d7 ?? 0;
  const vals = [a, b, c];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals
    .map((v, i) => `${(i / (vals.length - 1)) * 40},${14 - ((v - min) / span) * 12}`)
    .join(" ");
  const up = c >= 0;
  return (
    <svg className="mk-spark" viewBox="0 0 40 16" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "var(--positive)" : "var(--negative)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function MarketTable({
  rows,
  loading,
  ownedSymbols,
  onTrade,
}: {
  rows: MarketRow[];
  loading: boolean;
  ownedSymbols: Set<string>;
  onTrade: (row: MarketRow) => void;
}) {
  const [cat, setCat] = useState<MarketCategory | "depot">("alle");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const base =
      cat === "depot" ? rows.filter((r) => ownedSymbols.has(r.symbol)) : filterByCategory(rows, cat);
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (r) =>
        r.symbol.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.underlying ?? "").toLowerCase().includes(needle)
    );
  }, [rows, cat, q, ownedSymbols]);

  return (
    <section className="mk">
      <div className="mk-head">
        <h2 className="mk-title">Märkte</h2>
        <input
          className="mk-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Symbol oder Name suchen"
          aria-label="Märkte durchsuchen"
        />
      </div>

      <div className="mk-cats" role="tablist" aria-label="Kategorie">
        <button
          role="tab"
          aria-selected={cat === "depot"}
          className={`mk-cat ${cat === "depot" ? "is-active" : ""}`}
          onClick={() => setCat("depot")}
        >
          Im Depot
          {ownedSymbols.size > 0 && <span className="mk-cat-n">{ownedSymbols.size}</span>}
        </button>
        {CATEGORY_LABELS.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            className={`mk-cat ${cat === c.id ? "is-active" : ""}`}
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mk-colhead" aria-hidden="true">
        <span>Titel</span>
        <span className="mk-num">Kurs</span>
        <span className="mk-num mk-hide-s">24 h</span>
        <span className="mk-num mk-hide-m">Volumen 24 h</span>
        <span className="mk-num mk-hide-m">Trend 7 T.</span>
        <span />
      </div>

      <div className="mk-rows">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="mk-row">
              <div className="mk-titlecell">
                <span className="skeleton" style={{ width: "28px", height: "28px", borderRadius: "4px" }} />
                <span className="skeleton" style={{ width: "96px", height: "13px" }} />
              </div>
              <span className="skeleton" style={{ width: "58px", height: "13px", justifySelf: "end" }} />
              <span className="skeleton mk-hide-s" style={{ width: "46px", height: "13px", justifySelf: "end" }} />
              <span className="skeleton mk-hide-m" style={{ width: "62px", height: "13px", justifySelf: "end" }} />
              <span className="mk-hide-m" />
              <span />
            </div>
          ))}

        {!loading && visible.length === 0 && (
          <p className="mk-empty">
            {cat === "depot"
              ? "In diesem Depot liegen noch keine xStocks."
              : "Kein Titel passt zu dieser Auswahl."}
          </p>
        )}

        {!loading &&
          visible.map((r) => (
            <div key={r.mint} className="mk-row">
              <Link href={`/stock/${r.symbol}`} className="mk-titlecell">
                {r.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.logo} alt="" className="mk-logo" loading="lazy" />
                ) : (
                  <span className="mk-logo mk-logo-fallback">{r.symbol.slice(0, 2)}</span>
                )}
                <span className="mk-names">
                  <span className="mk-sym">
                    {r.symbol}
                    {ownedSymbols.has(r.symbol) && <span className="mk-owned" title="Im Depot">•</span>}
                  </span>
                  <span className="mk-name">{r.name.replace(" xStock", "")}</span>
                </span>
              </Link>

              <span className="mk-num mk-price">{r.price === null ? "—" : usd(r.price)}</span>
              <span className="mk-num mk-hide-s">
                <Change v={r.change24h} />
              </span>
              <span className="mk-num mk-hide-m mk-vol">
                {r.volume24h === null ? "—" : compact(r.volume24h)}
              </span>
              <span className="mk-num mk-hide-m">
                <MiniTrend d7={r.change7d} d1={r.change24h} />
              </span>

              <button
                className="mk-buy"
                onClick={() => onTrade(r)}
                disabled={r.halted}
                title={r.halted ? "Handel für diesen Titel ausgesetzt" : undefined}
              >
                {r.halted ? "Ausgesetzt" : "Kaufen"}
              </button>
            </div>
          ))}
      </div>
    </section>
  );
}
