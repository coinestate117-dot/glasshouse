"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle, ChartRange } from "@/lib/charts";

const RANGE_ORDER: ChartRange[] = ["1T", "1W", "1M", "1J"];

type ApiResult = {
  candles: Candle[];
  changePct: number | null;
  low: number | null;
  high: number | null;
  demo?: boolean;
  error?: string;
};

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("de-CH", { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

function fmtTime(ts: number, range: ChartRange): string {
  const d = new Date(ts * 1000);
  if (range === "1T") return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  if (range === "1J") return d.toLocaleDateString("de-CH", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short" });
}

export function PriceChart({
  mint,
  symbol,
  lastPrice,
}: {
  mint: string;
  symbol: string;
  lastPrice: number;
}) {
  const [range, setRange] = useState<ChartRange>("1W");
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  /** Index der Kerze unter dem Zeiger, null wenn der Zeiger draussen ist. */
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    const q = new URLSearchParams({ range, symbol, last: String(lastPrice) });
    fetch(`/api/chart/${mint}?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ApiResult) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mint, symbol, lastPrice, range]);

  const candles = data?.candles ?? [];

  // Geometrie einmal pro Datensatz rechnen, nicht bei jeder Mausbewegung.
  const geo = useMemo(() => {
    if (candles.length < 2) return null;

    const W = 1000;
    const H = 300;
    const padTop = 12;
    const padBottom = 22;

    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    // Etwas Luft, damit die Linie nicht am Rand klebt.
    const pad = (max - min) * 0.08 || max * 0.01;
    min -= pad;
    max += pad;

    const x = (i: number) => (i / (candles.length - 1)) * W;
    const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);

    const line = candles.map((c, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(c.close).toFixed(2)}`).join(" ");
    const area = `${line} L${W},${H - padBottom} L0,${H - padBottom} Z`;

    return { W, H, padTop, padBottom, min, max, x, y, line, area };
  }, [candles]);

  const rising = (data?.changePct ?? 0) >= 0;
  const stroke = rising ? "var(--positive)" : "var(--negative)";
  const active = hover !== null && candles[hover] ? candles[hover] : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || candles.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;
    const ratio = (clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (candles.length - 1));
    setHover(Math.max(0, Math.min(candles.length - 1, i)));
  };

  return (
    <div className="chart-wrap">
      {/* Kopfzeile: Preis und Zeitraumwahl */}
      <div className="chart-head">
        <div>
          <div className="chart-price">
            {active ? fmtPrice(active.close) : fmtPrice(lastPrice)}
          </div>
          <div className="chart-sub">
            {active ? (
              <span className="chart-sub-time">{fmtTime(active.time, range)}</span>
            ) : data?.changePct !== null && data?.changePct !== undefined ? (
              <span style={{ color: stroke }}>
                {data.changePct >= 0 ? "+" : "−"}
                {Math.abs(data.changePct).toFixed(2)} %
                <span className="chart-sub-time"> · {range}</span>
              </span>
            ) : (
              <span className="chart-sub-time">&nbsp;</span>
            )}
          </div>
        </div>

        <div className="chart-ranges" role="group" aria-label="Zeitraum">
          {RANGE_ORDER.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`chart-range ${r === range ? "is-active" : ""}`}
              aria-pressed={r === range}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Zeichenfläche */}
      <div className="chart-body">
        {loading && <div className="skeleton chart-skeleton" />}

        {!loading && failed && (
          <div className="chart-msg">
            Kursverlauf gerade nicht abrufbar.
            <button className="chart-retry" onClick={() => setRange((r) => r)}>
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !failed && !geo && (
          <div className="chart-msg">Für diesen Zeitraum liegen keine Kursdaten vor.</div>
        )}

        {!loading && !failed && geo && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${geo.W} ${geo.H}`}
            preserveAspectRatio="none"
            className="chart-svg"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={onMove}
            onTouchMove={onMove}
            onTouchEnd={() => setHover(null)}
            role="img"
            aria-label={`Kursverlauf ${symbol}, Zeitraum ${range}`}
          >
            <defs>
              <linearGradient id={`fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Waagerechte Hilfslinien */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const v = geo.min + (geo.max - geo.min) * f;
              return (
                <line
                  key={f}
                  x1="0"
                  x2={geo.W}
                  y1={geo.y(v)}
                  y2={geo.y(v)}
                  stroke="var(--border-dim)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            <path d={geo.area} fill={`url(#fill-${symbol})`} />
            <path
              d={geo.line}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Fadenkreuz */}
            {active && hover !== null && (
              <>
                <line
                  x1={geo.x(hover)}
                  x2={geo.x(hover)}
                  y1={geo.padTop}
                  y2={geo.H - geo.padBottom}
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={geo.x(hover)}
                  cy={geo.y(active.close)}
                  r="4"
                  fill="var(--bg)"
                  stroke={stroke}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>
        )}
      </div>

      {/* Eckwerte */}
      {geo && data && (
        <div className="chart-foot">
          <span>
            Tief <strong>{fmtPrice(data.low ?? 0)}</strong>
          </span>
          <span>
            Hoch <strong>{fmtPrice(data.high ?? 0)}</strong>
          </span>
          <span>
            {candles.length} Kerzen
            {data.demo ? " · Demo" : " · On-Chain"}
          </span>
        </div>
      )}
    </div>
  );
}
