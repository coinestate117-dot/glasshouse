import { supabase } from "./supabase";
import { XSTOCKS_API_BASE } from "./constants";
import type { XStockAsset, XStockMultiplier, GhAsset } from "@/types";

// A1 — Fetch all xStock assets with Solana deployments, paginate, upsert to DB
export async function syncAssets(): Promise<GhAsset[]> {
  const allAssets: GhAsset[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const res = await fetch(`${XSTOCKS_API_BASE}/assets?page=${page}`);
    if (!res.ok) throw new Error(`xStocks assets page ${page}: ${res.status}`);
    const data: { nodes: XStockAsset[]; page: { hasNextPage: boolean } } =
      await res.json();

    for (const asset of data.nodes) {
      const solDeploy = asset.deployments.find((d) => d.network === "Solana");
      if (!solDeploy) continue;

      allAssets.push({
        symbol: asset.symbol,
        name: asset.name,
        underlying_symbol: asset.underlyingSymbol,
        mint_address: solDeploy.address,
        decimals: 8,
        logo_url: asset.logo,
        current_multiplier: 1,
        new_multiplier: 0,
        activation_timestamp: 0,
      });
    }

    hasNext = data.page.hasNextPage;
    page++;
  }

  // Upsert to Supabase
  const { error } = await supabase.from("gh_assets").upsert(
    allAssets.map((a) => ({ ...a, updated_at: new Date().toISOString() })),
    { onConflict: "symbol" }
  );
  if (error) throw new Error(`Upsert assets: ${error.message}`);

  console.log(`[A1] Synced ${allAssets.length} Solana xStocks`);
  return allAssets;
}

// A2 — THE multiplier function. Resolves the correct effective multiplier.
export function resolveEffectiveMultiplier(m: XStockMultiplier): number {
  if (m.newMultiplier > 0 && m.activationDateTime > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (m.activationDateTime <= nowSec) {
      return m.newMultiplier;
    }
  }
  return m.currentMultiplier;
}

// Fetch multiplier for one symbol from xStocks API
async function fetchMultiplier(symbol: string): Promise<XStockMultiplier> {
  const res = await fetch(
    `${XSTOCKS_API_BASE}/assets/${symbol}/multiplier?network=Solana`
  );
  if (!res.ok)
    throw new Error(`Multiplier ${symbol}: ${res.status}`);
  return res.json();
}

// Sync multipliers for all assets in DB
export async function syncMultipliers(): Promise<number> {
  const { data: assets, error } = await supabase
    .from("gh_assets")
    .select("symbol");
  if (error || !assets) throw new Error(`Read assets: ${error?.message}`);

  let updated = 0;
  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < assets.length; i += 10) {
    const batch = assets.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(async (a) => {
        const m = await fetchMultiplier(a.symbol);
        const effective = resolveEffectiveMultiplier(m);
        await supabase
          .from("gh_assets")
          .update({
            current_multiplier: effective,
            new_multiplier: m.newMultiplier,
            activation_timestamp: m.activationDateTime,
            updated_at: new Date().toISOString(),
          })
          .eq("symbol", a.symbol);
        return effective;
      })
    );
    updated += results.filter((r) => r.status === "fulfilled").length;
  }

  console.log(`[A2] Updated multipliers for ${updated}/${assets.length} assets`);
  return updated;
}
