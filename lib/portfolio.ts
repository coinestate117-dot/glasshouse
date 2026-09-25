/**
 * Portfolio management — fetch holdings per wallet, compute values, cache in Supabase.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { createServerClient } from "./supabase";
import { getAssets } from "./xstocks";
import { getPrices } from "./jupiter";
import type { Holding, PortfolioStats } from "./supabase";

function getHeliusConnection(): Connection {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error("Missing HELIUS_API_KEY");
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, "confirmed");
}

export type EnrichedHolding = Holding & {
  price_usd: number;
  value_usd: number;
  weight: number;
  change_24h: number | null;
};

export type PortfolioDetail = {
  address: string;
  holdings: EnrichedHolding[];
  stats: PortfolioStats;
};

/**
 * Sync holdings for a single wallet — fetches live from Helius and upserts to Supabase.
 */
export async function syncWalletHoldings(walletAddress: string): Promise<Holding[]> {
  const db = createServerClient();
  const conn = getHeliusConnection();
  const assets = await getAssets();

  const mintSet = new Set(assets.map((a) => a.mint));
  const mintToSymbol = new Map(assets.map((a) => [a.mint, a.symbol]));

  const walletPubkey = new PublicKey(walletAddress);

  // Fetch all token accounts for this wallet
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(walletPubkey, {
    programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"), // Token-2022
  });

  // Also check classic SPL tokens
  const splAccounts = await conn.getParsedTokenAccountsByOwner(walletPubkey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  const allAccounts = [...tokenAccounts.value, ...splAccounts.value];

  // Filter to xStocks mints only
  const xStockAccounts = allAccounts.filter((acc) => {
    const mint = acc.account.data.parsed?.info?.mint;
    return mint && mintSet.has(mint);
  });

  if (xStockAccounts.length === 0) return [];

  // Fetch current prices for these mints
  const relevantMints = xStockAccounts.map((acc) => acc.account.data.parsed?.info?.mint as string);
  const prices = await getPrices(relevantMints);

  const holdingRows = xStockAccounts.map((acc) => {
    const info = acc.account.data.parsed?.info;
    const mint: string = info?.mint;
    const rawAmount = BigInt(info?.tokenAmount?.amount ?? "0");
    // uiAmount is already correctly scaled by Helius for Token-2022 accounts
    const uiAmount: number = info?.tokenAmount?.uiAmount ?? 0;
    const priceData = prices.get(mint);
    const priceUsd = priceData?.price ?? 0;
    const valueUsd = uiAmount * priceUsd;

    return {
      wallet: walletAddress,
      mint,
      symbol: mintToSymbol.get(mint) ?? mint.slice(0, 8),
      raw_amount: Number(rawAmount),
      ui_amount: uiAmount,
      price_usd: priceUsd,
      value_usd: valueUsd,
      weight: 0, // computed below
    };
  });

  // Compute total value and weights
  const totalValue = holdingRows.reduce((sum, h) => sum + h.value_usd, 0);
  const rowsWithWeight = holdingRows.map((h) => ({
    ...h,
    weight: totalValue > 0 ? h.value_usd / totalValue : 0,
  }));

  // Upsert holdings
  const { error: holdingError } = await db
    .from("holdings")
    .upsert(rowsWithWeight, { onConflict: "wallet,mint" });

  if (holdingError) throw new Error(`Holdings upsert error: ${holdingError.message}`);

  // Compute portfolio stats
  const sorted = [...rowsWithWeight].sort((a, b) => b.value_usd - a.value_usd);
  const top = sorted[0];

  await db.from("portfolio_stats").upsert({
    wallet: walletAddress,
    total_value: totalValue,
    position_count: rowsWithWeight.length,
    top_symbol: top?.symbol ?? null,
    top_weight: top?.weight ?? null,
    change_24h_pct: null, // TODO: compute from cached yesterday prices
  }, { onConflict: "wallet" });

  return rowsWithWeight as Holding[];
}

/**
 * Get portfolio detail for a wallet (from Supabase cache, sync if stale).
 */
export async function getPortfolio(walletAddress: string): Promise<PortfolioDetail> {
  const db = createServerClient();

  // Check cache freshness
  const { data: statsData } = await db
    .from("portfolio_stats")
    .select("*")
    .eq("wallet", walletAddress)
    .single();

  const isStale =
    !statsData ||
    (Date.now() - new Date(statsData.updated_at).getTime()) > 5 * 60 * 1000; // 5 min

  if (isStale) {
    await syncWalletHoldings(walletAddress);
  }

  const { data: holdings, error: holdingsError } = await db
    .from("holdings")
    .select("*")
    .eq("wallet", walletAddress)
    .order("value_usd", { ascending: false });

  if (holdingsError) throw new Error(`Holdings fetch error: ${holdingsError.message}`);

  const { data: stats } = await db
    .from("portfolio_stats")
    .select("*")
    .eq("wallet", walletAddress)
    .single();

  return {
    address: walletAddress,
    holdings: (holdings ?? []) as EnrichedHolding[],
    stats: stats ?? {
      wallet: walletAddress,
      total_value: 0,
      position_count: 0,
      top_symbol: null,
      top_weight: null,
      change_24h_pct: null,
      rank: null,
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Get the leaderboard — all wallets sorted by portfolio value.
 */
export async function getLeaderboard(limit = 50): Promise<Array<{
  address: string;
  total_value: number;
  position_count: number;
  top_symbol: string | null;
  top_weight: number | null;
  change_24h_pct: number | null;
  rank: number;
}>> {
  const db = createServerClient();

  const { data, error } = await db
    .from("portfolio_stats")
    .select("*")
    .gt("total_value", 0)
    .order("total_value", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Leaderboard fetch error: ${error.message}`);

  return (data ?? []).map((row: PortfolioStats, i: number) => ({
    ...row,
    rank: i + 1,
    total_value: Number(row.total_value),
    top_weight: row.top_weight !== null ? Number(row.top_weight) : null,
    change_24h_pct: row.change_24h_pct !== null ? Number(row.change_24h_pct) : null,
  }));
}

/**
 * Fetch recent swap history for a wallet (xStocks mints only).
 */
export async function getWalletTradeHistory(walletAddress: string): Promise<Array<{
  signature: string;
  timestamp: number;
  type: "buy" | "sell" | "unknown";
  symbol: string;
  amount: number;
  valueUsd: number;
}>> {
  const conn = getHeliusConnection();
  const assets = await getAssets();
  const mintSet = new Set(assets.map((a) => a.mint));
  const mintToSymbol = new Map(assets.map((a) => [a.mint, a.symbol]));

  const signatures = await conn.getSignaturesForAddress(
    new PublicKey(walletAddress),
    { limit: 50 }
  );

  const trades: Array<{
    signature: string;
    timestamp: number;
    type: "buy" | "sell" | "unknown";
    symbol: string;
    amount: number;
    valueUsd: number;
  }> = [];

  for (const sig of signatures.slice(0, 20)) {
    try {
      const tx = await conn.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta) continue;

      // Look for token balance changes involving xStocks mints
      const preBalances = tx.meta.preTokenBalances ?? [];
      const postBalances = tx.meta.postTokenBalances ?? [];

      for (const post of postBalances) {
        if (!post.mint || !mintSet.has(post.mint)) continue;
        if (post.owner !== walletAddress) continue;

        const pre = preBalances.find((p) => p.mint === post.mint && p.owner === walletAddress);
        const preAmount = pre?.uiTokenAmount?.uiAmount ?? 0;
        const postAmount = post.uiTokenAmount?.uiAmount ?? 0;
        const delta = postAmount - preAmount;

        if (Math.abs(delta) < 0.0001) continue;

        trades.push({
          signature: sig.signature,
          timestamp: sig.blockTime ?? 0,
          type: delta > 0 ? "buy" : "sell",
          symbol: mintToSymbol.get(post.mint) ?? post.mint.slice(0, 8),
          amount: Math.abs(delta),
          valueUsd: 0, // would need historical prices
        });
      }
    } catch {
      // Skip failed transactions
    }
  }

  return trades.sort((a, b) => b.timestamp - a.timestamp);
}
