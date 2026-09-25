/**
 * Marktkennzahlen eines xStocks-Tokens.
 *
 * Alle Werte stammen aus Jupiters Asset-Endpunkt und beschreiben den
 * tatsächlichen On-Chain-Handel. `underlying` ist der Kurs der zugrunde
 * liegenden Aktie und dient nur als Vergleich — gehandelt wird hier der
 * Token, nicht die Aktie.
 */

const ASSET_API = "https://datapi.jup.ag/v1/assets/search";

export type TokenStats = {
  symbol: string;
  name: string;
  usdPrice: number;
  liquidity: number;
  holderCount: number;
  mcap: number;
  circSupply: number;
  isVerified: boolean;
  change: { h1: number | null; h24: number | null; d7: number | null; d30: number | null };
  day: {
    buyVolume: number;
    sellVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
  } | null;
  underlying: {
    name: string | null;
    symbol: string | null;
    price: number | null;
    changePct: number | null;
    tradingHours: string | null;
  } | null;
};

export async function getTokenStats(mint: string): Promise<TokenStats | null> {
  try {
    const res = await fetch(`${ASSET_API}?query=${encodeURIComponent(mint)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;

    const list = (await res.json()) as Array<Record<string, unknown>>;
    const a = list?.find((x) => x.id === mint) ?? list?.[0];
    if (!a) return null;

    const stats = (k: string) => a[k] as { priceChange?: number } | undefined;
    const d = a.stats24h as Record<string, number> | undefined;
    const stock = a.stockData as Record<string, unknown> | undefined;

    return {
      symbol: String(a.symbol ?? ""),
      name: String(a.name ?? ""),
      usdPrice: Number(a.usdPrice ?? 0),
      liquidity: Number(a.liquidity ?? 0),
      holderCount: Number(a.holderCount ?? 0),
      mcap: Number(a.mcap ?? 0),
      circSupply: Number(a.circSupply ?? 0),
      isVerified: Boolean(a.isVerified),
      change: {
        h1: stats("stats1h")?.priceChange ?? null,
        h24: stats("stats24h")?.priceChange ?? null,
        d7: stats("stats7d")?.priceChange ?? null,
        d30: stats("stats30d")?.priceChange ?? null,
      },
      day: d
        ? {
            buyVolume: d.buyVolume ?? 0,
            sellVolume: d.sellVolume ?? 0,
            numBuys: d.numBuys ?? 0,
            numSells: d.numSells ?? 0,
            numTraders: d.numTraders ?? 0,
          }
        : null,
      underlying: stock
        ? {
            name: (stock.underlyingName as string) ?? null,
            symbol: (stock.underlyingSymbol as string) ?? null,
            price: Number(stock.price ?? 0) || null,
            changePct: Number(stock.priceChange24h ?? 0) || null,
            tradingHours: (stock.issuerTradingHours as string) ?? null,
          }
        : null,
    };
  } catch {
    // Kennzahlen sind Beiwerk — die Seite muss auch ohne sie funktionieren.
    return null;
  }
}
