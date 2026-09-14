import { PublicKey } from "@solana/web3.js";
import { connection } from "./helius";
import { supabase } from "./supabase";
import { TOKEN_2022_PROGRAM } from "./constants";
import type { GhAsset } from "@/types";

// A4 — Build portfolios for all discovered wallets
export async function syncPortfolios(): Promise<number> {
  // Get known mints
  const { data: assets, error: assetErr } = await supabase
    .from("gh_assets")
    .select("symbol, mint_address");
  if (assetErr || !assets)
    throw new Error(`Read assets: ${assetErr?.message}`);

  const mintToSymbol = new Map(assets.map((a) => [a.mint_address, a.symbol]));
  const knownMints = new Set(assets.map((a) => a.mint_address));

  // Get all wallets
  const { data: wallets, error: walletErr } = await supabase
    .from("gh_wallets")
    .select("address");
  if (walletErr || !wallets)
    throw new Error(`Read wallets: ${walletErr?.message}`);

  console.log(`[A4] Building portfolios for ${wallets.length} wallets...`);

  let totalPositions = 0;

  // Process in batches of 3 (getTokenAccountsByOwner is heavy)
  for (let i = 0; i < wallets.length; i += 3) {
    const batch = wallets.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map(async (w) => {
        const positions = await getWalletXStockPositions(
          w.address,
          knownMints,
          mintToSymbol
        );

        if (positions.length > 0) {
          const { error } = await supabase.from("gh_positions").upsert(
            positions.map((p) => ({
              ...p,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "wallet_address,asset_symbol" }
          );
          if (error)
            console.warn(`Upsert positions for ${w.address}: ${error.message}`);
        }

        return positions.length;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") totalPositions += r.value;
    }
  }

  console.log(
    `[A4] Stored ${totalPositions} positions across ${wallets.length} wallets`
  );
  return totalPositions;
}

// Get all xStock token holdings for a single wallet
async function getWalletXStockPositions(
  walletAddress: string,
  knownMints: Set<string>,
  mintToSymbol: Map<string, string>
): Promise<
  {
    wallet_address: string;
    asset_symbol: string;
    mint_address: string;
    ui_amount: number;
    value_usd: number;
    pct: number;
  }[]
> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: new PublicKey(TOKEN_2022_PROGRAM) }
    );

    const positions: {
      wallet_address: string;
      asset_symbol: string;
      mint_address: string;
      ui_amount: number;
      value_usd: number;
      pct: number;
    }[] = [];

    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed;
      if (parsed.type !== "account") continue;

      const mint: string = parsed.info.mint;
      if (!knownMints.has(mint)) continue;

      const uiAmount: number =
        parsed.info.tokenAmount.uiAmount ?? 0;
      if (uiAmount <= 0) continue;

      const symbol = mintToSymbol.get(mint);
      if (!symbol) continue;

      positions.push({
        wallet_address: walletAddress,
        asset_symbol: symbol,
        mint_address: mint,
        ui_amount: uiAmount,
        value_usd: 0, // computed in A5
        pct: 0,
      });
    }

    return positions;
  } catch {
    return [];
  }
}
