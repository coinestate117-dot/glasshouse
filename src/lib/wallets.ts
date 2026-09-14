import { PublicKey } from "@solana/web3.js";
import { connection, rpc } from "./helius";
import { supabase } from "./supabase";
import { SYSTEM_PROGRAM, BLOCKLIST, TOKEN_2022_PROGRAM } from "./constants";
import type { GhAsset, WalletType } from "@/types";

interface LargestAccountValue {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

interface AccountInfoResult {
  value: {
    owner: string;
    executable: boolean;
    lamports: number;
    data: {
      parsed?: {
        info?: {
          owner?: string;
          mint?: string;
          tokenAmount?: {
            uiAmount: number;
            amount: string;
            decimals: number;
          };
        };
      };
    };
  } | null;
}

interface TokenAccountsResult {
  value: {
    account: {
      data: {
        parsed: {
          type: string;
          info: {
            mint: string;
            tokenAmount: { uiAmount: number };
          };
        };
      };
    };
  }[];
}

// Derive wallet type label from on-chain data
export function deriveWalletType(
  xstockCount: number,
  xstockRatio: number
): WalletType {
  // Market Maker: over 40 xStock positions
  if (xstockCount > 40) return "Market Maker";
  // Whale: xStocks under 30% of Token-2022 holdings
  if (xstockRatio < 0.3) return "Whale";
  // Investor: 2-20 positions, xStocks >= 60% of holdings
  if (xstockCount >= 2 && xstockCount <= 20 && xstockRatio >= 0.6)
    return "Investor";
  // Investor: 21-40 positions with >= 60% ratio (serious but not MM)
  if (xstockCount > 20 && xstockCount <= 40 && xstockRatio >= 0.6)
    return "Investor";
  // Holder: 1 position
  if (xstockCount === 1) return "Holder";
  // Remaining: low ratio with multiple positions = Whale
  if (xstockRatio < 0.6) return "Whale";
  // Fallback
  return "Holder";
}

// A3 — Discover wallets holding xStocks, classify them
export async function discoverWallets(
  assets: GhAsset[]
): Promise<{ candidates: number; filtered: number }> {
  const walletMints = new Map<string, Set<string>>();

  console.log(`[A3] Scanning ${assets.length} mints for holders...`);

  // Process mints in batches of 5
  for (let i = 0; i < assets.length; i += 5) {
    const batch = assets.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((asset) => scanMintHolders(asset))
    );

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const holder of result.value) {
        const mints = walletMints.get(holder.wallet) ?? new Set();
        mints.add(holder.mint);
        walletMints.set(holder.wallet, mints);
      }
    }

    if ((i + 5) % 25 === 0 || i + 5 >= assets.length) {
      console.log(
        `[A3] Scanned ${Math.min(i + 5, assets.length)}/${assets.length} mints, ${walletMints.size} unique wallets`
      );
    }
  }

  const candidates = walletMints.size;

  // Remove only blocklisted addresses (truly non-human)
  for (const addr of BLOCKLIST) {
    walletMints.delete(addr);
  }

  // Classify each wallet: get Token-2022 breakdown + SOL balance + activity
  const addresses = [...walletMints.keys()];
  console.log(`[A3] Classifying ${addresses.length} wallets...`);

  const walletRows: {
    address: string;
    wallet_type: WalletType;
    xstock_count: number;
    xstock_ratio: number;
    sol_balance: number;
    recent_tx_count: number;
    position_count: number;
  }[] = [];

  for (let i = 0; i < addresses.length; i += 3) {
    const batch = addresses.slice(i, i + 3);
    const classResults = await Promise.allSettled(
      batch.map((addr) => classifyWallet(addr))
    );

    for (const r of classResults) {
      if (r.status === "fulfilled" && r.value) {
        walletRows.push(r.value);
      }
    }
  }

  // Upsert to DB
  if (walletRows.length > 0) {
    const { error } = await supabase.from("gh_wallets").upsert(
      walletRows.map((w) => ({
        ...w,
        total_value_usd: 0,
        change_24h_pct: 0,
        last_synced: new Date().toISOString(),
      })),
      { onConflict: "address" }
    );
    if (error) throw new Error(`Upsert wallets: ${error.message}`);
  }

  // Log type distribution
  const typeCounts: Record<string, number> = {};
  for (const w of walletRows) {
    typeCounts[w.wallet_type] = (typeCounts[w.wallet_type] ?? 0) + 1;
  }
  console.log(`[A3] Classification:`, typeCounts);
  console.log(
    `[A3] Candidates: ${candidates}, kept: ${walletRows.length} (removed ${candidates - walletRows.length} blocklisted)`
  );

  return { candidates, filtered: walletRows.length };
}

// Classify a single wallet by its Token-2022 holdings and activity
async function classifyWallet(address: string): Promise<{
  address: string;
  wallet_type: WalletType;
  xstock_count: number;
  xstock_ratio: number;
  sol_balance: number;
  recent_tx_count: number;
  position_count: number;
} | null> {
  try {
    // SOL balance
    const info = await rpc<AccountInfoResult>("getAccountInfo", [
      address,
      { encoding: "jsonParsed" },
    ]);
    if (!info.value || info.value.owner !== SYSTEM_PROGRAM) return null;
    const solBalance = (info.value.lamports || 0) / 1e9;

    // Token-2022 accounts
    const t22 = await rpc<TokenAccountsResult>(
      "getTokenAccountsByOwner",
      [
        address,
        { programId: TOKEN_2022_PROGRAM },
        { encoding: "jsonParsed" },
      ]
    );

    let xstockCount = 0;
    let totalT22 = 0;
    for (const a of t22.value || []) {
      const pi = a.account.data.parsed.info;
      const amt = pi.tokenAmount.uiAmount || 0;
      if (amt <= 0) continue;
      totalT22++;
      if (pi.mint.startsWith("Xs")) xstockCount++;
    }

    const xstockRatio = totalT22 > 0 ? xstockCount / totalT22 : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
    let recentTxCount = 0;
    try {
      const sigs = await rpc<{ signature: string; blockTime: number }[]>(
        "getSignaturesForAddress",
        [address, { limit: 20 }]
      );
      for (const s of sigs) {
        if (s.blockTime > thirtyDaysAgo) recentTxCount++;
      }
    } catch {
      // non-critical
    }

    const walletType = deriveWalletType(xstockCount, xstockRatio);

    return {
      address,
      wallet_type: walletType,
      xstock_count: xstockCount,
      xstock_ratio: Math.round(xstockRatio * 100) / 100,
      sol_balance: Math.round(solBalance * 100) / 100,
      recent_tx_count: recentTxCount,
      position_count: xstockCount,
    };
  } catch {
    return null;
  }
}

// Scan a single mint for its largest holders and resolve their wallet owners
async function scanMintHolders(
  asset: GhAsset
): Promise<{ wallet: string; mint: string; uiAmount: number }[]> {
  const holders: { wallet: string; mint: string; uiAmount: number }[] = [];

  try {
    const result = await rpc<{ value: LargestAccountValue[] }>(
      "getTokenLargestAccounts",
      [asset.mint_address]
    );

    const nonZero = result.value.filter((a) => a.uiAmount > 0);

    for (const account of nonZero) {
      try {
        const info = await rpc<AccountInfoResult>("getAccountInfo", [
          account.address,
          { encoding: "jsonParsed" },
        ]);

        if (!info.value?.data?.parsed?.info?.owner) continue;
        const ownerWallet = info.value.data.parsed.info.owner;

        const ownerInfo = await rpc<AccountInfoResult>("getAccountInfo", [
          ownerWallet,
          { encoding: "jsonParsed" },
        ]);

        if (ownerInfo.value?.owner === SYSTEM_PROGRAM) {
          holders.push({
            wallet: ownerWallet,
            mint: asset.mint_address,
            uiAmount: account.uiAmount,
          });
        }
      } catch {
        // Skip unresolvable accounts
      }
    }
  } catch {
    // Skip mints that fail
  }

  return holders;
}
