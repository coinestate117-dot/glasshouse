/**
 * Marktliste für das Depot-Dashboard.
 *
 * Führt drei Quellen zusammen:
 *  - xStocks-API: Symbol, Name, Mint, Börse und Handelszeiten
 *  - Jupiter Asset-API: Preis, Veränderung, Volumen, Liquidität
 * Alles echte Mainnet-Daten. Es wird nichts geschätzt und nichts ergänzt,
 * wenn eine Quelle nichts liefert — dann fehlt das Feld und die Oberfläche
 * zeigt dafür einen Strich.
 */

import { getAssetsDirect, getPricesDirect } from "./direct";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2/public";
const JUP_ASSETS = "https://datapi.jup.ag/v1/assets/search";

/** Wie viele Mints Jupiter pro Anfrage verträgt (geprüft: 30 gehen sicher). */
const BATCH = 30;

export type MarketCategory =
  | "alle"
  | "meistgehandelt"
  | "gewinner"
  | "verlierer"
  | "indizes"
  | "nasdaq"
  | "nyse";

export type MarketRow = {
  symbol: string;
  name: string;
  mint: string;
  logo: string | null;
  price: number | null;
  change24h: number | null;
  change7d: number | null;
  volume24h: number | null;
  liquidity: number | null;
  holders: number | null;
  /** Börse des zugrunde liegenden Titels, z. B. NASDAQ. */
  exchange: string | null;
  /** Ist die zugrunde liegende Börse gerade offen? */
  openNow: boolean | null;
  /** Wann wechselt der Handelszustand das nächste Mal? ISO-Zeit. */
  nextChangeAt: string | null;
  halted: boolean;
  underlying: string | null;
  decimals: number;
};

/** Titel, die Indizes abbilden statt einzelner Unternehmen. */
const INDEX_SYMBOLS = new Set([
  "SPYx", "QQQx", "VTIx", "GLDx", "IWMx", "DIAx", "TQQQx", "VOOx", "SLVx",
]);

type TradingInfo = {
  exchange: string | null;
  openNow: boolean | null;
  nextChangeAt: string | null;
  halted: boolean;
  underlying: string | null;
};

let tradingCache: Map<string, TradingInfo> | null = null;
let tradingCacheAt = 0;
const TRADING_TTL = 10 * 60 * 1000; // Handelszustand ändert sich im Tagesverlauf

/** Börse und Handelszustand je Symbol aus der xStocks-API. */
async function getTradingInfo(): Promise<Map<string, TradingInfo>> {
  if (tradingCache && Date.now() - tradingCacheAt < TRADING_TTL) return tradingCache;

  const map = new Map<string, TradingInfo>();

  type Node = {
    symbol: string;
    underlyingSymbol?: string;
    trading?: {
      isTradingHalted?: boolean;
      openNow?: boolean;
      nextChangeAt?: string;
      exchange?: { abbreviation?: string; mic?: string };
    };
  };

  for (let page = 0; page < 15; page++) {
    const url = page === 0 ? `${XSTOCKS_API}/assets` : `${XSTOCKS_API}/assets?page=${page}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) break;

    const json = (await res.json()) as {
      nodes?: Node[];
      page?: { hasNextPage?: boolean };
    };

    for (const n of json.nodes ?? []) {
      map.set(n.symbol, {
        exchange: n.trading?.exchange?.abbreviation ?? n.trading?.exchange?.mic ?? null,
        openNow: n.trading?.openNow ?? null,
        nextChangeAt: n.trading?.nextChangeAt ?? null,
        halted: Boolean(n.trading?.isTradingHalted),
        underlying: n.underlyingSymbol ?? null,
      });
    }

    if (!json.page?.hasNextPage || (json.nodes ?? []).length === 0) break;
  }

  tradingCache = map;
  tradingCacheAt = Date.now();
  return map;
}

type JupAsset = {
  id: string;
  symbol: string;
  name: string;
  icon?: string;
  decimals?: number;
  usdPrice?: number;
  liquidity?: number;
  holderCount?: number;
  stats24h?: { priceChange?: number; buyVolume?: number; sellVolume?: number };
  stats7d?: { priceChange?: number };
};

/** Kennzahlen für eine Menge Mints, in Blöcken abgefragt. */
async function getJupStats(mints: string[]): Promise<Map<string, JupAsset>> {
  const out = new Map<string, JupAsset>();

  const batches: string[][] = [];
  for (let i = 0; i < mints.length; i += BATCH) batches.push(mints.slice(i, i + BATCH));

  // Nacheinander statt parallel: die API antwortet sonst zeitweise mit 429.
  for (const batch of batches) {
    try {
      const res = await fetch(`${JUP_ASSETS}?query=${batch.join(",")}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 30 },
      });
      if (!res.ok) continue;
      for (const a of (await res.json()) as JupAsset[]) out.set(a.id, a);
    } catch {
      // Ein fehlgeschlagener Block darf die übrigen nicht mitreissen.
    }
  }

  return out;
}

/**
 * Marktliste, nach Bekanntheit vorsortiert.
 * `limit` begrenzt, wie viele Titel abgefragt werden — das Dashboard braucht
 * nicht alle 1000+ xStocks, und jede Abfrage kostet Zeit.
 */
export async function getMarketRows(limit = 60): Promise<MarketRow[]> {
  const assets = (await getAssetsDirect()).slice(0, limit);
  if (assets.length === 0) return [];

  const [trading, stats] = await Promise.all([
    getTradingInfo(),
    getJupStats(assets.map((a) => a.mint)),
  ]);

  const rows: MarketRow[] = assets.map((a) => {
    const s = stats.get(a.mint);
    const t = trading.get(a.symbol);
    const vol =
      s?.stats24h && (s.stats24h.buyVolume != null || s.stats24h.sellVolume != null)
        ? (s.stats24h.buyVolume ?? 0) + (s.stats24h.sellVolume ?? 0)
        : null;

    return {
      symbol: a.symbol,
      name: s?.name ?? a.name ?? a.symbol,
      mint: a.mint,
      logo: s?.icon ?? a.logo_url ?? null,
      price: s?.usdPrice ?? null,
      change24h: s?.stats24h?.priceChange ?? null,
      change7d: s?.stats7d?.priceChange ?? null,
      volume24h: vol,
      liquidity: s?.liquidity ?? null,
      holders: s?.holderCount ?? null,
      exchange: t?.exchange ?? null,
      openNow: t?.openNow ?? null,
      nextChangeAt: t?.nextChangeAt ?? null,
      halted: t?.halted ?? false,
      underlying: t?.underlying ?? null,
      decimals: s?.decimals ?? a.decimals ?? 8,
    };
  });

  // Nur Titel mit belastbarem Kurs. Ohne diese Prüfung stünden Pools ohne
  // Tiefe mit absurden Kursen in der Liste (siehe isTradableQuote).
  const quotes = await getPricesDirect(rows.map((r) => r.mint));
  return rows.filter((r) => {
    if (r.price === null || r.price <= 0) return false;
    const q = quotes.get(r.mint);
    return q ? q.tradable : true;
  });
}

/** Zeilen für eine Kategorie auswählen und passend sortieren. */
export function filterByCategory(rows: MarketRow[], cat: MarketCategory): MarketRow[] {
  switch (cat) {
    case "meistgehandelt":
      return [...rows]
        .filter((r) => r.volume24h !== null)
        .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
    case "gewinner":
      return [...rows]
        .filter((r) => (r.change24h ?? 0) > 0)
        .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
    case "verlierer":
      return [...rows]
        .filter((r) => (r.change24h ?? 0) < 0)
        .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0));
    case "indizes":
      return rows.filter((r) => INDEX_SYMBOLS.has(r.symbol));
    case "nasdaq":
      return rows.filter((r) => r.exchange === "NASDAQ");
    case "nyse":
      return rows.filter((r) => r.exchange === "NYSE");
    case "alle":
    default:
      return rows;
  }
}

export const CATEGORY_LABELS: Array<{ id: MarketCategory; label: string }> = [
  { id: "alle", label: "Alle" },
  { id: "meistgehandelt", label: "Meistgehandelt" },
  { id: "gewinner", label: "Gewinner" },
  { id: "verlierer", label: "Verlierer" },
  { id: "indizes", label: "Indizes & ETFs" },
  { id: "nasdaq", label: "Nasdaq" },
  { id: "nyse", label: "NYSE" },
];
