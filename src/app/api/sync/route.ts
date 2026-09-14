import { NextResponse } from "next/server";
import { syncAssets, syncMultipliers } from "@/lib/xstocks";
import { discoverWallets } from "@/lib/wallets";
import { syncPortfolios } from "@/lib/portfolio";
import { syncPrices, computeWalletValues } from "@/lib/prices";
import { supabase } from "@/lib/supabase";
import type { SyncResult } from "@/types";

export const maxDuration = 300; // 5 min for Vercel

export async function POST() {
  const start = Date.now();
  const log: string[] = [];

  try {
    // A1 — Assets
    log.push("Starting A1: Asset sync...");
    const assets = await syncAssets();
    log.push(`A1 done: ${assets.length} assets`);

    // A2 — Multipliers
    log.push("Starting A2: Multiplier sync...");
    const multipliers = await syncMultipliers();
    log.push(`A2 done: ${multipliers} multipliers updated`);

    // A3 — Wallet discovery
    log.push("Starting A3: Wallet discovery...");
    const { candidates, filtered } = await discoverWallets(assets);
    log.push(`A3 done: ${candidates} candidates → ${filtered} wallets`);

    // A4 — Portfolios
    log.push("Starting A4: Portfolio sync...");
    const positions = await syncPortfolios();
    log.push(`A4 done: ${positions} positions`);

    // A5 — Prices & values
    log.push("Starting A5: Price sync...");
    const priced = await syncPrices();
    await computeWalletValues();
    log.push(`A5 done: ${priced} prices, wallet values computed`);

    // Top 10 wallets
    const { data: topWallets } = await supabase
      .from("gh_wallets")
      .select("address, total_value_usd")
      .gt("total_value_usd", 0)
      .order("total_value_usd", { ascending: false })
      .limit(10);

    const result: SyncResult = {
      assets: assets.length,
      multipliers,
      candidateWallets: candidates,
      filteredWallets: filtered,
      positions,
      prices: priced,
      topWallets:
        topWallets?.map((w) => ({
          address: w.address,
          value: w.total_value_usd,
        })) ?? [],
    };

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log.push(`Sync complete in ${elapsed}s`);

    return NextResponse.json({ ok: true, result, log });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`ERROR: ${msg}`);
    return NextResponse.json({ ok: false, error: msg, log }, { status: 500 });
  }
}
