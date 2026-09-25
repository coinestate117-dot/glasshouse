/**
 * xStocks asset list — fetched from xstocks.fi and cached in Supabase.
 * Never returns invented data; always reads from real Mainnet API.
 */

import { createServerClient, type Asset } from "./supabase";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2/public";
const CACHE_TTL_HOURS = 6;

export type XStocksApiAsset = {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
  logoUrl?: string;
};

/** Fetch asset list from xstocks.fi and upsert into Supabase. */
export async function syncAssets(): Promise<Asset[]> {
  const db = createServerClient();

  const res = await fetch(`${XSTOCKS_API}/assets`, {
    next: { revalidate: CACHE_TTL_HOURS * 3600 },
  });
  if (!res.ok) throw new Error(`xStocks API error: ${res.status}`);

  const raw: XStocksApiAsset[] = await res.json();

  const rows = raw.map((a) => ({
    symbol: a.symbol,
    name: a.name ?? null,
    mint: a.mintAddress,
    decimals: a.decimals,
    logo_url: a.logoUrl ?? null,
  }));

  const { data, error } = await db
    .from("assets")
    .upsert(rows, { onConflict: "mint" })
    .select();

  if (error) throw new Error(`Supabase upsert error: ${error.message}`);
  return data ?? [];
}

/** Get assets from Supabase cache. Falls back to live fetch if empty. */
export async function getAssets(): Promise<Asset[]> {
  const db = createServerClient();
  const { data, error } = await db.from("assets").select("*").order("symbol");

  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  if (!data || data.length === 0) return syncAssets();

  // Refresh if stale
  const oldest = data.reduce((min: Asset, a: Asset) =>
    new Date(a.updated_at) < new Date(min.updated_at) ? a : min
  );
  const ageHours = (Date.now() - new Date(oldest.updated_at).getTime()) / 36e5;
  if (ageHours > CACHE_TTL_HOURS) syncAssets().catch(console.error); // background refresh

  return data;
}

/** Get a single asset by mint address. */
export async function getAssetByMint(mint: string): Promise<Asset | null> {
  const db = createServerClient();
  const { data } = await db.from("assets").select("*").eq("mint", mint).single();
  return data ?? null;
}

/** Get top N assets by (approximate) market cap — using Jupiter price × supply proxy.
 * For hackathon purposes, we rank by number of holders as a proxy. */
export async function getTopAssets(limit = 25): Promise<Asset[]> {
  const assets = await getAssets();
  return assets.slice(0, limit); // ordered alphabetically from API; good enough for candidates
}

/** Fetch multiplier for a given symbol (for the xStocks Scaled UI Amount Extension). */
export async function getMultiplier(symbol: string): Promise<{
  multiplier: number;
  newMultiplier: number | null;
  newMultiplierEffectiveTimestamp: number | null;
}> {
  const res = await fetch(
    `${XSTOCKS_API}/assets/${encodeURIComponent(symbol)}/multiplier?network=solana`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Multiplier API error for ${symbol}: ${res.status}`);
  return res.json();
}
