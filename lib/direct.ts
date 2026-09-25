/**
 * Direct data fetcher — works WITHOUT Supabase.
 * Falls back to in-memory cache; uses Supabase if configured.
 *
 * Priority: Supabase (if configured) → in-memory cache → live API fetch
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { memCache, isSupabaseConfigured } from "./memcache";
import { createServerClient } from "./supabase";
import type { Asset, Holding, PortfolioStats } from "./supabase";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2/public";
// v2 wurde abgeschaltet (liefert 404) — v3 auf lite-api läuft ohne Zugangsdaten.
const JUPITER_PRICE_API = "https://lite-api.jup.ag/price/v3";
/** Jupiter begrenzt die Anzahl Mints je Anfrage. */
const JUPITER_BATCH = 50;

/**
 * Bekannte, liquide xStocks zuerst.
 *
 * Die xStocks-API liefert die Assets in einer Reihenfolge, die nichts mit
 * Bedeutung zu tun hat — vorn stehen Titel wie XRXx oder FLNCx. Wer nur die
 * ersten N nimmt (Ticker, Rangliste), erwischt genau die ohne Liquidität und
 * sieht am Ende nichts. Deshalb wird hier explizit sortiert.
 */
const PRIORITY_SYMBOLS = [
  "NVDAx", "AAPLx", "TSLAx", "MSFTx", "SPYx", "METAx", "GOOGLx", "AMZNx",
  "COINx", "MSTRx", "QQQx", "AMDx", "NFLXx", "AVGOx", "CRCLx", "HOODx",
  "JPMx", "VTIx", "GLDx", "PLTRx", "ORCLx", "WMTx",
];

/** Öffentlicher Mainnet-Knoten: langsamer und strenger limitiert,
 *  aber er braucht keine Zugangsdaten. */
const PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export function hasHeliusKey(): boolean {
  return Boolean(process.env.HELIUS_API_KEY);
}

function getConn(): Connection {
  const key = process.env.HELIUS_API_KEY;
  if (key) {
    return new Connection(`https://mainnet.helius-rpc.com/?api-key=${key}`, "confirmed");
  }
  // Früher wurde hier geworfen — dadurch war ohne Helius gar nichts möglich,
  // obwohl die genutzten RPC-Methoden alle Standard sind.
  return new Connection(PUBLIC_MAINNET_RPC, "confirmed");
}

// ── Asset list ───────────────────────────────────────────────────────────────

export type AssetSource = "xstocks" | "prestocks";

export async function getAssetsDirect(source: AssetSource = "xstocks"): Promise<Asset[]> {
  const TTL = 6 * 3600 * 1000;
  const cacheKey = `assets_${source}`;

  // 1. Memory cache
  if (memCache[cacheKey]?.length > 0 && Date.now() - (memCache[`${cacheKey}At`] || 0) < TTL) {
    return memCache[cacheKey];
  }

  // 2. Supabase cache
  if (isSupabaseConfigured()) {
    try {
      const db = createServerClient();
      const { data } = await db.from("assets").select("*").order("symbol");
      if (data && data.length > 0) {
        memCache.assets = data as Asset[];
        memCache.assetsAt = Date.now();
        return memCache.assets;
      }
    } catch { /* fall through */ }
  }

  // 3. Live from source
  let assets: Asset[] = [];
  
  if (source === "xstocks") {
    type AssetNode = {
      symbol: string;
      name?: string;
      logo?: string;
      deployments?: Array<{
        network: string;
        address: string;
        stablecoins?: Array<{ symbol: string; decimals: number }>;
      }>;
    };

    // Die API liefert 100 Einträge je Seite. Früher wurde nur die erste
    // geholt — dadurch fehlten die bekanntesten Titel (NVDAx, AAPLx, TSLAx …)
    // komplett, weil sie auf späteren Seiten liegen.
    const nodes: AssetNode[] = [];
    const MAX_PAGES = 15; // Sicherung gegen eine endlos "hasNextPage: true" meldende API

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = page === 0 ? `${XSTOCKS_API}/assets` : `${XSTOCKS_API}/assets?page=${page}`;
      const res = await fetch(url, { next: { revalidate: 21600 } });
      if (!res.ok) {
        if (page === 0) throw new Error(`xStocks API ${res.status}`);
        break; // spätere Seite fehlgeschlagen: mit dem arbeiten, was da ist
      }

      const json = (await res.json()) as {
        nodes?: AssetNode[];
        page?: { currentPage?: number; hasNextPage?: boolean };
      };

      const batch = json.nodes ?? [];
      nodes.push(...batch);

      if (!json.page?.hasNextPage || batch.length === 0) break;
    }
  // Hier stand ein zweites "const assets" — es überdeckte die äußere
  // Variable, sodass alle geparsten Assets beim Verlassen des Blocks
  // verloren gingen und die Funktion immer [] zurückgab.

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const solanaDep = node.deployments?.find((d) => d.network === "Solana");
      if (!solanaDep?.address) continue;
      const decimals = 6;

      assets.push({
        id: i + 1,
        symbol: node.symbol,
        name: node.name ?? null,
        mint: solanaDep.address,
        decimals,
        logo_url: node.logo ?? null,
        updated_at: new Date().toISOString(),
      });
    }
  } else if (source === "prestocks") {
    const res = await fetch(`https://prestocks.com/api/prestocks`, { next: { revalidate: 21600 } });
    if (!res.ok) {
      // If Prestocks API is down or doesn't exist yet, return empty or mock
      console.warn(`PreStocks API error ${res.status}`);
    } else {
      const raw = await res.json();
      // Assume it returns an array of { symbol, name, mint, decimals, logo_url } or similar
      // The prompt says: "Beide Quellen liefern am Ende dieselbe Form (Symbol, Mint, Decimals, Multiplier)"
      for (let i = 0; i < raw.length; i++) {
        const item = raw[i];
        if (!item.mint) continue;
        assets.push({
          id: i + 1,
          symbol: item.symbol,
          name: item.name ?? null,
          mint: item.mint,
          decimals: item.decimals ?? 6,
          logo_url: item.logo_url ?? item.logoUrl ?? null,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  // Nach Bekanntheit sortieren, damit Aufrufer, die nur die ersten N
  // Einträge nehmen, die liquiden Titel erwischen.
  assets.sort((a, b) => {
    const ia = PRIORITY_SYMBOLS.indexOf(a.symbol);
    const ib = PRIORITY_SYMBOLS.indexOf(b.symbol);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  (memCache as any)[cacheKey] = assets;
  (memCache as any)[`${cacheKey}At`] = Date.now();
  return assets;
}

// ── Jupiter prices ────────────────────────────────────────────────────────────

export type PriceQuote = {
  price: number;
  change24h: number | null;
  /** Pool-Tiefe in USD. Unter MIN_LIQUIDITY_USD ist der Kurs nicht belastbar. */
  liquidity: number | null;
  /** Kurs der zugrunde liegenden Aktie, falls die API ihn mitliefert. */
  underlyingPrice: number | null;
  /** Lässt sich der Kurs plausibilisieren? Siehe isTradableQuote(). */
  tradable: boolean;
};

export type PriceMap = Map<string, PriceQuote>;

/** Unterhalb dieser Pool-Tiefe ist jeder Kurs Rauschen aus einem toten Pool. */
export const MIN_LIQUIDITY_USD = 1000;

/** Grösste akzeptierte Abweichung vom Kurs der zugrunde liegenden Aktie. */
const MAX_UNDERLYING_DEVIATION_PCT = 35;

/**
 * Ist dieser Kurs handelbar, oder ist er das Artefakt eines leeren Pools?
 *
 * Hintergrund: Jupiter gibt Kurse korrekt wieder, auch für Pools ohne
 * nennenswerte Tiefe. Beispiel PYPLx — 0.05 USD Liquidität, 36 Halter, und
 * daraus ein "Kurs" von 248 953 USD gegen eine PayPal-Aktie von 52 USD.
 * Solche Zeilen sind keine Marktdaten und dürfen nicht als Kurs erscheinen.
 *
 * Geprüft wird nur mit Grössen, die die API selbst mitliefert; es wird
 * nichts geschätzt und nichts korrigiert.
 */
export function isTradableQuote(q: {
  price: number;
  liquidity: number | null;
  underlyingPrice: number | null;
}): boolean {
  if (!(q.price > 0)) return false;
  if (q.liquidity !== null && q.liquidity < MIN_LIQUIDITY_USD) return false;
  if (q.underlyingPrice !== null && q.underlyingPrice > 0) {
    const dev = (Math.abs(q.price - q.underlyingPrice) / q.underlyingPrice) * 100;
    if (dev > MAX_UNDERLYING_DEVIATION_PCT) return false;
  }
  return true;
}

export async function getPricesDirect(mints: string[]): Promise<PriceMap> {
  const map: PriceMap = new Map();
  if (mints.length === 0) return map;

  // Doppelte entfernen und in Blöcken abfragen — früher wurde nach 100
  // Mints hart abgeschnitten, der Rest blieb ohne Preis.
  const unique = [...new Set(mints)];

  for (let i = 0; i < unique.length; i += JUPITER_BATCH) {
    const batch = unique.slice(i, i + JUPITER_BATCH);
    try {
      const res = await fetch(`${JUPITER_PRICE_API}?ids=${batch.join(",")}`, {
        next: { revalidate: 30 },
      });
      if (!res.ok) continue;

      // v3 antwortet flach: { "<mint>": { usdPrice, priceChange24h, … } }
      const data = (await res.json()) as Record<
        string,
        {
          usdPrice?: number;
          priceChange24h?: number;
          liquidity?: number;
          stockData?: { price?: number };
        } | null
      >;

      for (const [mint, info] of Object.entries(data)) {
        if (!info || typeof info.usdPrice !== "number") continue;

        const liquidity = typeof info.liquidity === "number" ? info.liquidity : null;
        const underlyingPrice =
          typeof info.stockData?.price === "number" ? info.stockData.price : null;

        map.set(mint, {
          price: info.usdPrice,
          change24h: typeof info.priceChange24h === "number" ? info.priceChange24h : null,
          liquidity,
          underlyingPrice,
          tradable: isTradableQuote({ price: info.usdPrice, liquidity, underlyingPrice }),
        });
      }
    } catch {
      // Einzelner Block fehlgeschlagen — die übrigen trotzdem versuchen.
    }
  }

  return map;
}

// ── Leaderboard (no Supabase needed) ─────────────────────────────────────────

export type LeaderboardEntry = {
  address: string;
  total_value: number;
  position_count: number;
  top_symbol: string | null;
  top_weight: number | null;
  change_24h_pct: number | null;
  rank: number;
  holdings: Array<{ symbol: string; weight: number; value_usd: number }>;
};

/** Discover top holders from Helius and compute portfolio values live. */
export async function buildLeaderboard(source: AssetSource = "xstocks"): Promise<LeaderboardEntry[]> {
  const CACHE_TTL = 10 * 60 * 1000; // 10 min
  const cacheKey = `leaderboard_${source}`;

  // 1. Memory cache
  if ((memCache as any)[cacheKey]?.length > 0 && Date.now() - ((memCache as any)[`${cacheKey}At`] || 0) < CACHE_TTL) {
    return (memCache as any)[cacheKey].map((s: any, i: number) => ({
      address: s.wallet,
      total_value: Number(s.total_value),
      position_count: s.position_count,
      top_symbol: s.top_symbol,
      top_weight: s.top_weight !== null ? Number(s.top_weight) : null,
      change_24h_pct: s.change_24h_pct !== null ? Number(s.change_24h_pct) : null,
      rank: i + 1,
      holdings: [],
    }));
  }

  // 2. Supabase cache
  if (isSupabaseConfigured()) {
    try {
      const db = createServerClient();
      const { data: stats } = await db
        .from("portfolio_stats")
        .select("*")
        .gt("total_value", 0)
        .order("total_value", { ascending: false })
        .limit(50);

      if (stats && stats.length > 0) {
        const addresses = (stats as PortfolioStats[]).map((s) => s.wallet);
        const { data: holdingsRaw } = await db
          .from("holdings")
          .select("wallet, symbol, weight, value_usd")
          .in("wallet", addresses)
          .gt("weight", 0.005);

        const holdingsMap = new Map<string, Array<{ symbol: string; weight: number; value_usd: number }>>();
        for (const h of (holdingsRaw ?? []) as Holding[]) {
          if (!holdingsMap.has(h.wallet)) holdingsMap.set(h.wallet, []);
          holdingsMap.get(h.wallet)!.push({
            symbol: h.symbol,
            weight: Number(h.weight ?? 0),
            value_usd: Number(h.value_usd ?? 0),
          });
        }

        return (stats as PortfolioStats[]).map((s, i) => ({
          address: s.wallet,
          total_value: Number(s.total_value),
          position_count: s.position_count,
          top_symbol: s.top_symbol,
          top_weight: s.top_weight !== null ? Number(s.top_weight) : null,
          change_24h_pct: s.change_24h_pct !== null ? Number(s.change_24h_pct) : null,
          rank: i + 1,
          holdings: holdingsMap.get(s.wallet) ?? [],
        }));
      }
    } catch { /* fall through */ }
  }

  // 3. Discover live from Helius
  return discoverLeaderboardLive(source);
}

async function discoverLeaderboardLive(source: AssetSource): Promise<LeaderboardEntry[]> {
  const withHelius = hasHeliusKey();
  const conn = getConn();
  const assets = await getAssetsDirect(source);

  // Der öffentliche Knoten lässt nur wenige Anfragen pro Sekunde zu. Ohne
  // eigenen Key wird deshalb deutlich sparsamer gescannt — weniger Mints,
  // weniger Konten je Mint, längere Pausen. Ergebnis: kürzere Rangliste,
  // aber echte Daten statt gar keiner.
  const MINTS = withHelius ? 8 : 3;
  const ACCOUNTS_PER_MINT = withHelius ? 8 : 4;
  const PAUSE_MS = withHelius ? 150 : 700;

  const topAssets = assets.slice(0, 15); // top 15 by alphabetical (proxy for market cap)

  // Known AMM/DEX programs to skip
  const AMM_PROGRAMS = new Set([
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "5quBtoiQqxF9Jv6KYKctB59NT3gtFD2SQTTRTeVwtDd",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  ]);

  const candidates = new Map<string, Set<string>>(); // owner → mints

  for (const asset of topAssets.slice(0, MINTS)) {
    try {
      const { value: accounts } = await conn.getTokenLargestAccounts(new PublicKey(asset.mint));
      for (const acc of accounts.slice(0, ACCOUNTS_PER_MINT)) {
        const info = await conn.getParsedAccountInfo(acc.address);
        const owner = (info.value?.data as { parsed?: { info?: { owner?: string } } })?.parsed?.info?.owner;
        if (!owner) continue;
        if (!PublicKey.isOnCurve(new PublicKey(owner).toBytes())) continue;
        const ownerInfo = await conn.getAccountInfo(new PublicKey(owner));
        if (ownerInfo?.owner && AMM_PROGRAMS.has(ownerInfo.owner.toBase58())) continue;
        if (!candidates.has(owner)) candidates.set(owner, new Set());
        candidates.get(owner)!.add(asset.mint);
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    } catch { /* skip */ }
  }

  if (candidates.size === 0) return [];

  const mintSet = new Set(assets.map((a) => a.mint));
  const mintToAsset = new Map(assets.map((a) => [a.mint, a]));
  const allMints = assets.map((a) => a.mint);
  const prices = await getPricesDirect(allMints);

  const entries: LeaderboardEntry[] = [];

  for (const [owner] of candidates) {
    try {
      const walletPubkey = new PublicKey(owner);
      const [t22accounts, splAccounts] = await Promise.all([
        conn.getParsedTokenAccountsByOwner(walletPubkey, {
          programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
        }),
        conn.getParsedTokenAccountsByOwner(walletPubkey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        }),
      ]);

      const allAccs = [...t22accounts.value, ...splAccounts.value];
      const xStockAccs = allAccs.filter((a) => mintSet.has(a.account.data.parsed?.info?.mint));

      if (xStockAccs.length === 0) continue;

      let totalValue = 0;
      const holdings: Array<{ symbol: string; mint: string; weight: number; value_usd: number; ui_amount: number }> = [];

      for (const acc of xStockAccs) {
        const mint: string = acc.account.data.parsed?.info?.mint;
        const uiAmount: number = acc.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0;
        const price = prices.get(mint)?.price ?? 0;
        const valueUsd = uiAmount * price;
        const asset = mintToAsset.get(mint);
        if (!asset) continue;
        totalValue += valueUsd;
        holdings.push({ symbol: asset.symbol, mint, weight: 0, value_usd: valueUsd, ui_amount: uiAmount });
      }

      if (totalValue < 100) continue; // skip dust wallets

      const sorted = holdings
        .map((h) => ({ ...h, weight: totalValue > 0 ? h.value_usd / totalValue : 0 }))
        .sort((a, b) => b.value_usd - a.value_usd);

      const avgChange = (() => {
        const changes = sorted.map((h) => prices.get(h.mint)?.change24h).filter((c) => c !== null) as number[];
        if (changes.length === 0) return null;
        const weightedSum = sorted.reduce((sum, h) => {
          const change = prices.get(h.mint)?.change24h;
          return change !== null ? sum + (change ?? 0) * h.weight : sum;
        }, 0);
        return weightedSum;
      })();

      entries.push({
        address: owner,
        total_value: totalValue,
        position_count: sorted.length,
        top_symbol: sorted[0]?.symbol ?? null,
        top_weight: sorted[0]?.weight ?? null,
        change_24h_pct: avgChange,
        rank: 0,
        holdings: sorted.map((h) => ({ symbol: h.symbol, weight: h.weight, value_usd: h.value_usd })),
      });

      await new Promise((r) => setTimeout(r, 100));
    } catch { /* skip */ }
  }

  entries.sort((a, b) => b.total_value - a.total_value);
  entries.forEach((e, i) => { e.rank = i + 1; });

  // Cache result
  const cacheKey = `leaderboard_${source}`;
  (memCache as any)[cacheKey] = entries.map((e) => ({
    wallet: e.address,
    total_value: e.total_value,
    position_count: e.position_count,
    top_symbol: e.top_symbol,
    top_weight: e.top_weight,
    change_24h_pct: e.change_24h_pct,
    rank: e.rank,
    updated_at: new Date().toISOString(),
  }));
  (memCache as any)[`${cacheKey}At`] = Date.now();

  return entries;
}

/** Get full portfolio detail for one wallet. */
export async function getWalletDirect(address: string, source: AssetSource = "xstocks"): Promise<{
  holdings: Array<{ mint: string; symbol: string; ui_amount: number; price_usd: number; value_usd: number; weight: number }>;
  total_value: number;
  change_24h_pct: number | null;
}> {
  // Kein Helius-Key nötig: getTokenAccountsByOwner ist auf dem öffentlichen
  // Knoten freigegeben. Nur die Ranglisten-Suche braucht
  // getTokenLargestAccounts, das dort gesperrt ist.

  const conn = getConn();
  const assets = await getAssetsDirect(source);
  const mintSet = new Set(assets.map((a) => a.mint));
  const mintToAsset = new Map(assets.map((a) => [a.mint, a]));

  const walletPubkey = new PublicKey(address);
  const [t22, spl] = await Promise.all([
    conn.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
    }),
    conn.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    }),
  ]);

  const allAccs = [...t22.value, ...spl.value].filter((a) =>
    mintSet.has(a.account.data.parsed?.info?.mint)
  );

  const mints = allAccs.map((a) => a.account.data.parsed?.info?.mint as string);
  const prices = await getPricesDirect(mints);

  let total = 0;
  const holdings = allAccs.map((acc) => {
    const mint: string = acc.account.data.parsed?.info?.mint;
    const uiAmount: number = acc.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0;
    const price = prices.get(mint)?.price ?? 0;
    const valueUsd = uiAmount * price;
    total += valueUsd;
    return { mint, symbol: mintToAsset.get(mint)?.symbol ?? mint.slice(0, 6), ui_amount: uiAmount, price_usd: price, value_usd: valueUsd, weight: 0 };
  });

  const sorted = holdings
    .map((h) => ({ ...h, weight: total > 0 ? h.value_usd / total : 0 }))
    .sort((a, b) => b.value_usd - a.value_usd);

  const change = sorted.length > 0
    ? sorted.reduce((sum, h) => {
        const c = prices.get(h.mint)?.change24h ?? 0;
        return sum + c * h.weight;
      }, 0)
    : null;

  return { holdings: sorted, total_value: total, change_24h_pct: change };
}

/**
 * USDC-Guthaben einer Wallet.
 *
 * getTokenAccountsByOwner ist auf dem öffentlichen Knoten freigegeben, das
 * braucht also keinen eigenen RPC-Zugang. Gibt 0 zurück, wenn die Wallet
 * kein USDC-Konto hat — das ist kein Fehler, sondern der Normalfall für
 * eine frische Wallet.
 */
export async function getUsdcBalance(address: string): Promise<number> {
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  try {
    const conn = getConn();
    const res = await conn.getParsedTokenAccountsByOwner(new PublicKey(address), {
      mint: new PublicKey(USDC_MINT),
    });
    return res.value.reduce(
      (sum, acc) => sum + (acc.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0),
      0
    );
  } catch {
    return 0;
  }
}
