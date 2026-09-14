import { PublicKey } from "@solana/web3.js";
import { connection, rpc } from "./helius";
import { supabase } from "./supabase";
import { SYSTEM_PROGRAM, BLOCKLIST, MIN_PORTFOLIO_VALUE_USD } from "./constants";
import type { GhAsset } from "@/types";

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

// A3 — Discover wallets holding xStocks
export async function discoverWallets(
  assets: GhAsset[]
): Promise<{ candidates: number; filtered: number }> {
  // Map: wallet address → Set of mints they hold
  const walletMints = new Map<string, Set<string>>();
  // Map: wallet address → mint → uiAmount
  const walletHoldings = new Map<string, Map<string, number>>();

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
        // Track which mints this wallet holds
        const mints = walletMints.get(holder.wallet) ?? new Set();
        mints.add(holder.mint);
        walletMints.set(holder.wallet, mints);

        // Track amounts
        const holdings =
          walletHoldings.get(holder.wallet) ?? new Map<string, number>();
        holdings.set(holder.mint, holder.uiAmount);
        walletHoldings.set(holder.wallet, holdings);
      }
    }

    // Progress log every 25 mints
    if ((i + 5) % 25 === 0 || i + 5 >= assets.length) {
      console.log(
        `[A3] Scanned ${Math.min(i + 5, assets.length)}/${assets.length} mints, ${walletMints.size} unique wallets so far`
      );
    }
  }

  const candidates = walletMints.size;

  // Filter: remove blocklisted wallets
  for (const addr of BLOCKLIST) {
    walletMints.delete(addr);
    walletHoldings.delete(addr);
  }

  // Identify additional treasury addresses: if a wallet is the #1 holder
  // on 10+ different tokens, it's almost certainly an issuer treasury
  const treasuryCandidates = new Set<string>();
  for (const [wallet, mints] of walletMints) {
    if (mints.size >= 10) {
      treasuryCandidates.add(wallet);
    }
  }
  for (const addr of treasuryCandidates) {
    walletMints.delete(addr);
    walletHoldings.delete(addr);
    console.log(
      `[A3] Auto-blocked likely treasury: ${addr.slice(0, 8)}... (holds ${treasuryCandidates.size >= 10 ? "10+" : ""} tokens)`
    );
  }

  // Upsert surviving wallets to DB
  const wallets = [...walletMints.keys()];
  if (wallets.length > 0) {
    const { error } = await supabase.from("gh_wallets").upsert(
      wallets.map((address) => ({
        address,
        total_value_usd: 0,
        change_24h_pct: 0,
        position_count: walletMints.get(address)?.size ?? 0,
        last_synced: new Date().toISOString(),
      })),
      { onConflict: "address" }
    );
    if (error) throw new Error(`Upsert wallets: ${error.message}`);
  }

  const filtered = wallets.length;
  console.log(
    `[A3] Candidates: ${candidates}, after filter: ${filtered} (removed ${candidates - filtered})`
  );

  return { candidates, filtered };
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

    // Resolve owners for non-zero accounts
    for (const account of nonZero) {
      try {
        const info = await rpc<AccountInfoResult>("getAccountInfo", [
          account.address,
          { encoding: "jsonParsed" },
        ]);

        if (!info.value?.data?.parsed?.info?.owner) continue;
        const ownerWallet = info.value.data.parsed.info.owner;

        // Verify this is a real wallet (owned by System Program)
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
        // Skip accounts we can't resolve
      }
    }
  } catch {
    // Skip mints that fail (some may not exist on-chain yet)
  }

  return holders;
}
