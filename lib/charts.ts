/**
 * Kursverläufe der xStocks-Token.
 *
 * Quelle ist Jupiters Chart-Endpunkt, also der tatsächliche On-Chain-Handel
 * des Tokens — bewusst nicht der Kurs der zugrunde liegenden Aktie an der
 * Börse. Die beiden laufen auseinander: der Token wird rund um die Uhr
 * gehandelt, die Börse nicht. Für diese App ist der On-Chain-Kurs der
 * richtige, weil hier genau der gehandelt wird.
 *
 * Parameterform am 24.09.2026 gegen die Live-API ermittelt:
 *   /v2/charts/{mint}?interval=1_HOUR&candles=N&to={ms}
 * `to` muss in Millisekunden stehen; mit Sekunden kommt eine leere Liste.
 */

const CHART_API = "https://datapi.jup.ag/v2/charts";

export type Candle = {
  /** Unix-Sekunden */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartRange = "1T" | "1W" | "1M" | "1J";

type RangeSpec = { interval: string; candles: number; label: string };

export const RANGES: Record<ChartRange, RangeSpec> = {
  "1T": { interval: "15_MINUTE", candles: 96, label: "1 Tag" },
  "1W": { interval: "1_HOUR", candles: 168, label: "1 Woche" },
  "1M": { interval: "4_HOUR", candles: 180, label: "1 Monat" },
  "1J": { interval: "1_DAY", candles: 365, label: "1 Jahr" },
};

export function isChartRange(v: string): v is ChartRange {
  return v in RANGES;
}

export type ChartResult = {
  candles: Candle[];
  range: ChartRange;
  /** Veränderung über den gesamten Zeitraum in Prozent. */
  changePct: number | null;
  low: number | null;
  high: number | null;
};

export async function getCandles(mint: string, range: ChartRange): Promise<ChartResult> {
  const spec = RANGES[range];
  const params = new URLSearchParams({
    interval: spec.interval,
    candles: String(spec.candles),
    to: String(Date.now()),
  });

  const res = await fetch(`${CHART_API}/${mint}?${params}`, {
    headers: { Accept: "application/json" },
    // Kurz zwischenspeichern: mehrere Besucher derselben Seite sollen nicht
    // je eine eigene Abfrage auslösen.
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Chart-Abfrage fehlgeschlagen: ${res.status}`);
  }

  const json = (await res.json()) as { candles?: Candle[] };
  const candles = (json.candles ?? []).filter(
    (c) => Number.isFinite(c.close) && c.close > 0
  );

  if (candles.length === 0) {
    return { candles: [], range, changePct: null, low: null, high: null };
  }

  const first = candles[0].open || candles[0].close;
  const last = candles[candles.length - 1].close;

  return {
    candles,
    range,
    changePct: first > 0 ? ((last - first) / first) * 100 : null,
    low: Math.min(...candles.map((c) => c.low)),
    high: Math.max(...candles.map((c) => c.high)),
  };
}

/**
 * Deterministischer Verlauf für den Demo-Modus.
 *
 * Erzeugt aus dem Symbol immer dieselbe Kurve, damit die Vorführung
 * reproduzierbar ist. Erfundene Daten bleiben strikt im Demo-Modus — im
 * Live-Betrieb wird diese Funktion nie aufgerufen.
 */
export function demoCandles(symbol: string, range: ChartRange, lastPrice: number): ChartResult {
  const spec = RANGES[range];
  const n = Math.min(spec.candles, 120);

  // Kleiner, wiederholbarer Zufallsgenerator aus dem Symbol.
  let seed = 0;
  for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const stepMs =
    range === "1T" ? 15 * 60_000 : range === "1W" ? 3_600_000 : range === "1M" ? 4 * 3_600_000 : 86_400_000;

  // Rückwärts vom aktuellen Preis laufen, damit die letzte Kerze passt.
  const closes: number[] = [lastPrice];
  for (let i = 1; i < n; i++) {
    const drift = (rnd() - 0.48) * 0.012;
    closes.unshift(closes[0] / (1 + drift));
  }

  const now = Date.now();
  const candles: Candle[] = closes.map((close, i) => {
    const open = i === 0 ? close * (1 - (rnd() - 0.5) * 0.004) : closes[i - 1];
    const spread = close * (0.002 + rnd() * 0.004);
    return {
      time: Math.floor((now - (n - 1 - i) * stepMs) / 1000),
      open,
      close,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      volume: 20_000 + rnd() * 180_000,
    };
  });

  const first = candles[0].open;
  const last = candles[candles.length - 1].close;

  return {
    candles,
    range,
    changePct: ((last - first) / first) * 100,
    low: Math.min(...candles.map((c) => c.low)),
    high: Math.max(...candles.map((c) => c.high)),
  };
}
