"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CandleChart } from "@/components/terminal/CandleChart";
import { TradePanel } from "@/components/dashboard/TradePanel";
import { CopyPanel } from "@/components/terminal/CopyPanel";
import type { MarketRow, MarketCategory } from "@/lib/markets";
import { filterByCategory } from "@/lib/markets";

type Summary = {
  demo: boolean;
  address: string;
  total_value: number;
  change_24h_pct: number | null;
  position_count: number;
  usdc_balance: number;
  holdings: Array<{ mint: string; symbol: string; weight: number; value_usd: number; ui_amount: number }>;
};

type Quote = { buy: number | null; sell: number | null; spreadPct: number | null; demo?: boolean };

const usd = (n: number, d = 2) =>
  n.toLocaleString("de-CH", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });

const price = (n: number) =>
  n >= 1000 ? n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toFixed(2);

/* ---------- Listen links ---------- */

type ListId = MarketCategory | "depot";

const LISTS: Array<{ id: ListId; label: string; icon: string }> = [
  { id: "depot", label: "Im Depot", icon: "◆" },
  { id: "meistgehandelt", label: "Meistgehandelt", icon: "≡" },
  { id: "gewinner", label: "Gewinner", icon: "↗" },
  { id: "verlierer", label: "Verlierer", icon: "↘" },
  { id: "indizes", label: "Indizes & ETFs", icon: "◈" },
  { id: "nasdaq", label: "Nasdaq", icon: "▣" },
  { id: "nyse", label: "NYSE", icon: "▤" },
  { id: "alle", label: "Alle Märkte", icon: "▦" },
];

/* ---------- Kennzahlenleiste ---------- */

function TopStrip({
  summary,
  loading,
  marketOpen,
  nextChangeAt,
}: {
  summary: Summary | null;
  loading: boolean;
  marketOpen: boolean | null;
  nextChangeAt: string | null;
}) {
  const invested = summary?.total_value ?? 0;
  const free = summary?.usdc_balance ?? 0;
  const change = summary?.change_24h_pct ?? null;
  const pnl = change !== null ? (invested * change) / 100 : null;

  const hint = (() => {
    if (!nextChangeAt || marketOpen === null) return null;
    const mins = Math.round((new Date(nextChangeAt).getTime() - Date.now()) / 60000);
    if (!Number.isFinite(mins) || mins < 0) return null;
    const h = Math.floor(mins / 60);
    const dur = h > 0 ? `${h} Std. ${mins % 60} Min.` : `${mins} Min.`;
    return marketOpen ? `schliesst in ${dur}` : `öffnet in ${dur}`;
  })();

  const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="tm-cell">
      <span className="tm-cell-label">{label}</span>
      {loading ? (
        <span className="skeleton" style={{ height: "14px", width: "72px", display: "block", marginTop: "3px" }} />
      ) : (
        <span className="tm-cell-value">{children}</span>
      )}
    </div>
  );

  return (
    <div className="tm-strip">
      <Cell label="Verfügbar">{usd(free)}</Cell>
      <Cell label="Investiert">{usd(invested)}</Cell>
      <Cell label="Gesamtwert">{usd(invested + free)}</Cell>
      <Cell label="GuV heute">
        <span style={{ color: (pnl ?? 0) >= 0 ? "var(--positive)" : "var(--negative)" }}>
          {pnl === null ? "—" : `${pnl >= 0 ? "+" : "−"}${usd(Math.abs(pnl))}`}
          {change !== null && (
            <span className="tm-cell-sub">
              {" "}
              ({change >= 0 ? "+" : "−"}
              {Math.abs(change).toFixed(2)} %)
            </span>
          )}
        </span>
      </Cell>
      <Cell label="Positionen">{summary?.position_count ?? "—"}</Cell>

      <div className="tm-cell tm-cell-wide">
        <span className="tm-cell-label">Markt</span>
        <span className="tm-cell-value tm-market">
          {marketOpen === null ? (
            "—"
          ) : (
            <>
              <span className={`tm-dot ${marketOpen ? "is-open" : ""}`} aria-hidden="true" />
              {marketOpen ? "Offen" : "Geschlossen"}
              {hint && <span className="tm-cell-sub"> · {hint}</span>}
            </>
          )}
        </span>
      </div>

      <div className="tm-strip-end">
        {summary?.demo ? (
          <span className="tm-badge tm-badge-demo">DEMO</span>
        ) : (
          <span className="tm-badge tm-badge-live">
            <span className="tm-dot is-open" aria-hidden="true" />
            LIVE
          </span>
        )}
        <span className="tm-badge tm-badge-quiet">NON-CUSTODIAL</span>
      </div>
    </div>
  );
}

/* ---------- Terminal ---------- */

export function Terminal() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsFailed, setRowsFailed] = useState(false);
  const [list, setList] = useState<ListId>("alle");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MarketRow | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [trade, setTradeSide] = useState<{ row: MarketRow; side: "kaufen" | "verkaufen" } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  /** Märkte handeln oder fremde Depots nachbauen. */
  const [view, setView] = useState<"depots" | "maerkte">("depots");

  const loadSummary = useCallback(() => {
    fetch("/api/account/summary")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => loadSummary(), [loadSummary]);

  useEffect(() => {
    let alive = true;
    fetch("/api/markets/live")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        const list: MarketRow[] = d.rows ?? [];
        setRows(list);
        setSelected((cur) => cur ?? list[0] ?? null);
        setRowsLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setRowsFailed(true);
        setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Echte Kauf-/Verkaufskurse für den ausgewählten Titel.
  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setQuote(null);
    const t = setTimeout(() => {
      fetch(`/api/quote/${selected.mint}?decimals=${selected.decimals}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: Quote) => alive && setQuote(d))
        .catch(() => alive && setQuote({ buy: null, sell: null, spreadPct: null }));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [selected]);

  const owned = useMemo(
    () => new Set((summary?.holdings ?? []).map((h) => h.symbol)),
    [summary]
  );

  /** Gehaltene Anteile eines Titels — Obergrenze beim Verkaufen. */
  const heldOf = (symbol: string) =>
    summary?.holdings.find((h) => h.symbol === symbol)?.ui_amount ?? 0;

  const visible = useMemo(() => {
    const base = list === "depot" ? rows.filter((r) => owned.has(r.symbol)) : filterByCategory(rows, list);
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (r) =>
        r.symbol.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.underlying ?? "").toLowerCase().includes(needle)
    );
  }, [rows, list, q, owned]);

  const market = useMemo(() => {
    const w = rows.find((r) => r.openNow !== null);
    return { open: w?.openNow ?? null, nextChangeAt: w?.nextChangeAt ?? null };
  }, [rows]);

  return (
    <div className="tm">
      <TopStrip
        summary={summary}
        loading={!summary}
        marketOpen={market.open}
        nextChangeAt={market.nextChangeAt}
      />

      <div className="tm-body">
        {/* Listen */}
        <aside
          className={`tm-lists ${panelOpen ? "is-open" : ""} ${view === "depots" ? "is-hidden" : ""}`}
        >
          <div className="tm-search-wrap">
            <input
              className="tm-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suchen"
              aria-label="Märkte durchsuchen"
            />
          </div>
          <div className="tm-lists-title">Watchlists</div>
          {view === "maerkte" && LISTS.map((l) => (
            <button
              key={l.id}
              className={`tm-list ${list === l.id ? "is-active" : ""}`}
              onClick={() => {
                setList(l.id);
                setPanelOpen(false);
              }}
            >
              <span className="tm-list-icon" aria-hidden="true">{l.icon}</span>
              {l.label}
              {l.id === "depot" && owned.size > 0 && <span className="tm-list-n">{owned.size}</span>}
            </button>
          ))}
        </aside>

        {/* Hauptbereich */}
        <main className="tm-main">
          {/* Ansichtsreiter oben: Nachbauen steht vorn, das ist der Kern —
              die Marktliste ist der Nebenweg für einzelne Titel. */}
          <div className="tm-tabs" role="tablist" aria-label="Ansicht">
            <button
              role="tab"
              aria-selected={view === "depots"}
              className={`tm-tab ${view === "depots" ? "is-active" : ""}`}
              onClick={() => setView("depots")}
            >
              Depots nachbauen
            </button>
            <button
              role="tab"
              aria-selected={view === "maerkte"}
              className={`tm-tab ${view === "maerkte" ? "is-active" : ""}`}
              onClick={() => setView("maerkte")}
            >
              Einzelne Titel
            </button>
          </div>

          {view === "depots" ? (
            <div className="tm-copy-wrap">
              <CopyPanel isDemo={Boolean(summary?.demo)} />
            </div>
          ) : (
          <>
          {/* Liste der Instrumente */}
          <section className="tm-table">
            <div className="tm-thead">
              <span>Markt</span>
              <span className="tm-r">Änderung</span>
              <span className="tm-r tm-hide-m">Trend</span>
              <span className="tm-r">Kurs</span>
              <span className="tm-r tm-hide-s">Volumen 24 h</span>
              <span className="tm-r">Handeln</span>
            </div>

            <div className="tm-rows">
              {rowsLoading &&
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="tm-row">
                    <span className="tm-mkt">
                      <span className="skeleton" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
                      <span className="skeleton" style={{ width: "90px", height: "12px" }} />
                    </span>
                    <span className="skeleton tm-r" style={{ width: "52px", height: "12px", justifySelf: "end" }} />
                    <span className="tm-hide-m" />
                    <span className="skeleton tm-r" style={{ width: "60px", height: "12px", justifySelf: "end" }} />
                    <span className="tm-hide-s" />
                    <span />
                  </div>
                ))}

              {rowsFailed && (
                <p className="tm-empty">
                  Die Marktdaten sind gerade nicht abrufbar. Kurse kommen live von Jupiter.
                </p>
              )}

              {!rowsLoading && !rowsFailed && visible.length === 0 && (
                <p className="tm-empty">
                  {list === "depot"
                    ? "In diesem Depot liegen noch keine xStocks."
                    : "Kein Titel passt zu dieser Auswahl."}
                </p>
              )}

              {!rowsLoading &&
                visible.map((r) => {
                  const isSel = selected?.mint === r.mint;
                  const up = (r.change24h ?? 0) >= 0;
                  return (
                    <div
                      key={r.mint}
                      className={`tm-row ${isSel ? "is-selected" : ""}`}
                      onClick={() => setSelected(r)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(r);
                        }
                      }}
                    >
                      <span className="tm-mkt">
                        {r.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.logo} alt="" className="tm-logo" loading="lazy" />
                        ) : (
                          <span className="tm-logo tm-logo-fb">{r.symbol.slice(0, 2)}</span>
                        )}
                        <span className="tm-mkt-names">
                          <span className="tm-mkt-sym">
                            {r.symbol}
                            {owned.has(r.symbol) && <i className="tm-owned" title="Im Depot" />}
                          </span>
                          <span className="tm-mkt-name">{r.name.replace(" xStock", "")}</span>
                        </span>
                      </span>

                      <span
                        className="tm-r tm-chg"
                        style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                      >
                        {r.change24h === null
                          ? "—"
                          : `${up ? "+" : "−"}${Math.abs(r.change24h).toFixed(2)} %`}
                      </span>

                      <span className="tm-r tm-hide-m">
                        <Spark d7={r.change7d} d1={r.change24h} />
                      </span>

                      <span className="tm-r tm-price">{r.price === null ? "—" : price(r.price)}</span>

                      <span className="tm-r tm-hide-s tm-vol">
                        {r.volume24h === null
                          ? "—"
                          : r.volume24h >= 1_000_000
                            ? `$${(r.volume24h / 1_000_000).toFixed(1)} Mio.`
                            : `$${(r.volume24h / 1000).toFixed(0)} Tsd.`}
                      </span>

                      <span className="tm-r">
                        <button
                          className="tm-buy"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTradeSide({ row: r, side: "kaufen" });
                          }}
                          disabled={r.halted}
                        >
                          {r.halted ? "Ausgesetzt" : "Kaufen"}
                        </button>
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Chart des ausgewählten Titels */}
          <section className="tm-chart">
            {selected ? (
              <>
                <CandleChart
                  mint={selected.mint}
                  symbol={selected.symbol}
                  name={selected.name}
                  lastPrice={selected.price ?? 0}
                />

                {/* Handelsleiste: zwei Kursknöpfe, Spread dazwischen. */}
                <div className="tm-dealbar">
                  <button
                    className="tm-deal tm-deal-sell"
                    onClick={() => setTradeSide({ row: selected, side: "verkaufen" })}
                    disabled={heldOf(selected.symbol) <= 0}
                    title={
                      heldOf(selected.symbol) <= 0
                        ? "Du hältst diesen Titel derzeit nicht"
                        : undefined
                    }
                  >
                    <span className="tm-deal-label">Verkaufen</span>
                    <span className="tm-deal-price">
                      {quote?.sell != null ? price(quote.sell) : "· · ·"}
                    </span>
                  </button>

                  <div className="tm-deal-mid">
                    <span className="tm-spread">
                      {quote?.spreadPct != null ? `${quote.spreadPct.toFixed(2)} %` : "—"}
                    </span>
                    <span className="tm-spread-label">Spread</span>
                  </div>

                  <button
                    className="tm-deal tm-deal-buy"
                    onClick={() => setTradeSide({ row: selected, side: "kaufen" })}
                    disabled={selected.halted}
                  >
                    <span className="tm-deal-label">Kaufen</span>
                    <span className="tm-deal-price">
                      {quote?.buy != null ? price(quote.buy) : "· · ·"}
                    </span>
                  </button>

                  <p className="tm-deal-note">
                    {summary?.demo
                      ? "Demo — es wird nichts signiert oder gesendet."
                      : "Du signierst jede Transaktion selbst in deiner Wallet. Glasshouse verwahrt keine Gelder."}
                  </p>
                </div>
              </>
            ) : (
              <div className="tm-empty">Wähle links einen Titel, um den Verlauf zu sehen.</div>
            )}
          </section>
          </>
          )}
        </main>
      </div>

      {trade && (
        <TradePanel
          row={trade.row}
          side={trade.side}
          heldAmount={heldOf(trade.row.symbol)}
          usdcAvailable={summary?.usdc_balance ?? 0}
          isDemo={Boolean(summary?.demo)}
          onClose={() => setTradeSide(null)}
          onDone={loadSummary}
        />
      )}

      {/* Listen auf schmalen Schirmen einblenden — nur in der Marktansicht,
          die Depotansicht braucht keine Watchlists. */}
      {view === "maerkte" && (
        <button
          className="tm-lists-toggle"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          {panelOpen ? "Schliessen" : "Listen"}
        </button>
      )}
    </div>
  );
}

/** Drei echte Stützstellen: vor 7 Tagen, vor 24 Stunden, jetzt. */
function Spark({ d7, d1 }: { d7: number | null; d1: number | null }) {
  if (d7 === null && d1 === null) return <span className="tm-spark" />;
  const vals = [0, (d7 ?? 0) - (d1 ?? 0), d7 ?? 0];
  const min = Math.min(...vals);
  const span = Math.max(...vals) - min || 1;
  const pts = vals.map((v, i) => `${(i / 2) * 44},${13 - ((v - min) / span) * 11}`).join(" ");
  return (
    <svg className="tm-spark" viewBox="0 0 44 15" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={(d7 ?? 0) >= 0 ? "var(--positive)" : "var(--negative)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
