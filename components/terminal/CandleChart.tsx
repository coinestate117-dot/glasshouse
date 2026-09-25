"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle, ChartRange } from "@/lib/charts";

const RANGES: Array<{ id: ChartRange; label: string }> = [
  { id: "1T", label: "1T" },
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "1J", label: "1J" },
];

type ApiResult = {
  candles: Candle[];
  changePct: number | null;
  low: number | null;
  high: number | null;
  demo?: boolean;
};

const W = 1000;
const H = 300;
const PAD_R = 62; // Platz für die Preisachse rechts
const PAD_B = 26; // Platz für die Zeitachse unten
const VOL_H = 46; // Höhe der Volumenbalken

function fmt(p: number): string {
  if (p >= 1000) return p.toLocaleString("de-CH", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function fmtTime(ts: number, range: ChartRange): string {
  const d = new Date(ts * 1000);
  if (range === "1T") return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  if (range === "1J") return d.toLocaleDateString("de-CH", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short" });
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mio.`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)} Tsd.`;
  return v.toFixed(0);
}

export function CandleChart({
  mint,
  symbol,
  name,
  lastPrice,
}: {
  mint: string;
  symbol: string;
  name: string;
  lastPrice: number;
}) {
  const [range, setRange] = useState<ChartRange>("1W");
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    setHover(null);
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

  const geo = useMemo(() => {
    if (candles.length < 2) return null;

    const plotW = W - PAD_R;
    const priceTop = 8;
    const priceBottom = H - PAD_B - VOL_H - 8;

    let min = Math.min(...candles.map((c) => c.low));
    let max = Math.max(...candles.map((c) => c.high));
    const pad = (max - min) * 0.06 || max * 0.01;
    min -= pad;
    max += pad;

    const step = plotW / candles.length;
    const bodyW = Math.max(1.2, Math.min(step * 0.66, 12));

    const x = (i: number) => i * step + step / 2;
    const y = (v: number) => priceTop + (1 - (v - min) / (max - min)) * (priceBottom - priceTop);

    const maxVol = Math.max(...candles.map((c) => c.volume), 1);
    const volY = (v: number) => H - PAD_B - (v / maxVol) * VOL_H;

    // Preisstufen für die Achse rechts
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);

    // Zeitmarken: höchstens sechs, gleichmässig verteilt
    const tickEvery = Math.max(1, Math.ceil(candles.length / 6));
    const timeTicks = candles
      .map((c, i) => ({ i, t: c.time }))
      .filter((o) => o.i % tickEvery === 0);

    return { plotW, priceTop, priceBottom, min, max, step, bodyW, x, y, volY, ticks, timeTicks };
  }, [candles]);

  const last = candles.length > 0 ? candles[candles.length - 1] : null;
  const active = hover !== null && candles[hover] ? candles[hover] : last;
  const rising = active ? active.close >= active.open : true;

  const onMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || !geo || candles.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;
    // Bildkoordinaten: die Zeichenfläche ist W breit, der Plot nur plotW davon.
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.floor(px / geo.step);
    if (i < 0 || i >= candles.length) return;
    setHover(i);
  };

  return (
    <div className="cc">
      {/* Kopfzeile im Stil eines Chartfensters */}
      <div className="cc-head">
        <span className="cc-sym">{symbol}</span>
        <span className="cc-name">{name.replace(" xStock", "")}</span>

        {active && (
          <span className="cc-ohlc">
            <span>
              O<b>{fmt(active.open)}</b>
            </span>
            <span>
              H<b>{fmt(active.high)}</b>
            </span>
            <span>
              T<b>{fmt(active.low)}</b>
            </span>
            <span>
              S<b>{fmt(active.close)}</b>
            </span>
            <span style={{ color: rising ? "var(--positive)" : "var(--negative)" }}>
              {active.open > 0
                ? `${active.close >= active.open ? "+" : "−"}${Math.abs(
                    ((active.close - active.open) / active.open) * 100
                  ).toFixed(2)} %`
                : ""}
            </span>
          </span>
        )}

        <span className="cc-spacer" />

        {data?.demo && <span className="cc-demo">Demo</span>}

        <div className="cc-ranges" role="group" aria-label="Zeitraum">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={`cc-range ${r.id === range ? "is-active" : ""}`}
              onClick={() => setRange(r.id)}
              aria-pressed={r.id === range}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zeichenfläche */}
      <div className="cc-body">
        {loading && <div className="skeleton cc-skeleton" />}

        {!loading && failed && (
          <div className="cc-msg">
            Kursverlauf gerade nicht abrufbar.
            <button className="cc-retry" onClick={() => setRange((r) => r)}>
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !failed && !geo && (
          <div className="cc-msg">Für diesen Zeitraum liegen keine Kursdaten vor.</div>
        )}

        {!loading && !failed && geo && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="cc-svg"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={onMove}
            onTouchMove={onMove}
            role="img"
            aria-label={`Kerzenchart ${symbol}, Zeitraum ${range}`}
          >
            {/* Waagerechte Raster- und Preislinien */}
            {geo.ticks.map((v, i) => (
              <g key={i}>
                <line
                  x1="0"
                  x2={geo.plotW}
                  y1={geo.y(v)}
                  y2={geo.y(v)}
                  stroke="var(--border-dim)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <text x={geo.plotW + 7} y={geo.y(v) + 3.5} className="cc-axis">
                  {fmt(v)}
                </text>
              </g>
            ))}

            {/* Senkrechte Zeitlinien */}
            {geo.timeTicks.map(({ i, t }) => (
              <g key={t}>
                <line
                  x1={geo.x(i)}
                  x2={geo.x(i)}
                  y1={geo.priceTop}
                  y2={H - PAD_B}
                  stroke="var(--border-dim)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <text x={geo.x(i)} y={H - 9} className="cc-axis cc-axis-x">
                  {fmtTime(t, range)}
                </text>
              </g>
            ))}

            {/* Volumen */}
            {candles.map((c, i) => {
              const up = c.close >= c.open;
              return (
                <rect
                  key={`v${c.time}`}
                  x={geo.x(i) - geo.bodyW / 2}
                  y={geo.volY(c.volume)}
                  width={geo.bodyW}
                  height={Math.max(0.5, H - PAD_B - geo.volY(c.volume))}
                  fill={up ? "var(--positive)" : "var(--negative)"}
                  opacity="0.22"
                />
              );
            })}

            {/* Kerzen */}
            {candles.map((c, i) => {
              const up = c.close >= c.open;
              const col = up ? "var(--positive)" : "var(--negative)";
              const yO = geo.y(c.open);
              const yC = geo.y(c.close);
              const top = Math.min(yO, yC);
              const height = Math.max(1, Math.abs(yC - yO));
              return (
                <g key={c.time}>
                  <line
                    x1={geo.x(i)}
                    x2={geo.x(i)}
                    y1={geo.y(c.high)}
                    y2={geo.y(c.low)}
                    stroke={col}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={geo.x(i) - geo.bodyW / 2}
                    y={top}
                    width={geo.bodyW}
                    height={height}
                    fill={col}
                  />
                </g>
              );
            })}

            {/* Linie auf dem letzten Kurs */}
            {last && (
              <>
                <line
                  x1="0"
                  x2={geo.plotW}
                  y1={geo.y(last.close)}
                  y2={geo.y(last.close)}
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={geo.plotW + 2}
                  y={geo.y(last.close) - 8}
                  width={PAD_R - 4}
                  height="16"
                  rx="2"
                  fill={last.close >= last.open ? "var(--positive)" : "var(--negative)"}
                />
                <text
                  x={geo.plotW + 7}
                  y={geo.y(last.close) + 3.5}
                  className="cc-axis cc-axis-last"
                >
                  {fmt(last.close)}
                </text>
              </>
            )}

            {/* Fadenkreuz */}
            {hover !== null && candles[hover] && (
              <line
                x1={geo.x(hover)}
                x2={geo.x(hover)}
                y1={geo.priceTop}
                y2={H - PAD_B}
                stroke="var(--border-strong)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>

      {/* Fusszeile */}
      {geo && data && (
        <div className="cc-foot">
          <span>
            Tief <b>{fmt(data.low ?? 0)}</b>
          </span>
          <span>
            Hoch <b>{fmt(data.high ?? 0)}</b>
          </span>
          {active && (
            <span>
              Volumen <b>{fmtVol(active.volume)}</b>
            </span>
          )}
          <span className="cc-foot-src">
            {candles.length} Kerzen · {data.demo ? "Demo" : "On-Chain, Jupiter"}
          </span>
        </div>
      )}
    </div>
  );
}
