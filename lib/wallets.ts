/**
 * Wallet candidate discovery and filtering.
 *
 * Strategy:
 * 1. getTokenLargestAccounts(mint) for top 20-25 xStocks → ~400-500 candidates
 * 2. Resolve token account → owner address
 * 3. Filter: remove PDAs of known AMM programs, remove blocklist
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { createServerClient } from "./supabase";
import { getTopAssets } from "./xstocks";

// Known DEX/AMM program IDs that should never appear as real users
const KNOWN_AMM_PROGRAMS = new Set([
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM v4
  "5quBtoiQqxF9Jv6KYKctB59NT3gtFD2SQTTRTeVwtDd",  // Raydium AMM v3 (CPMM)
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca Whirlpools
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP", // Orca v1
  "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1", // Orca v2
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX",  // Serum DEX v3
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", // Serum DEX v2
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",  // SPL Token program (never an owner)
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",  // Token-2022 program
]);

function getHeliusConnection(): Connection {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error("Missing HELIUS_API_KEY");
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, "confirmed");
}

/** Check if a public key is a PDA (has no corresponding private key / is off-curve). */
function isPDA(pubkey: PublicKey): boolean {
  return !PublicKey.isOnCurve(pubkey.toBytes());
}

export type CandidateResult = {
  address: string;
  discoveredFromMints: string[];
};

/**
 * Step 1: Discover candidate wallet addresses from largest token holders.
 * Returns raw candidates BEFORE filtering.
 */
export async function discoverCandidates(): Promise<Map<string, string[]>> {
  const conn = getHeliusConnection();
  const assets = await getTopAssets(25);
  
  // address → list of mints where this address appears
  const candidates = new Map<string, string[]>();

  console.log(`[wallets] Discovering candidates from ${assets.length} assets...`);

  for (const asset of assets) {
    try {
      const mintPubkey = new PublicKey(asset.mint);
      const { value: largestAccounts } = await conn.getTokenLargestAccounts(mintPubkey);

      for (const account of largestAccounts) {
        // Resolve token account → owner
        const info = await conn.getParsedAccountInfo(account.address);
        if (!info.value) continue;
        
        const parsed = (info.value.data as { parsed?: { info?: { owner?: string } } })?.parsed;
        const owner = parsed?.info?.owner;
        if (!owner) continue;

        const existing = candidates.get(owner) ?? [];
        if (!existing.includes(asset.mint)) {
          candidates.set(owner, [...existing, asset.mint]);
        }
      }

      // Rate limit: small delay between mints
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[wallets] Error processing mint ${asset.mint} (${asset.symbol}):`, err);
    }
  }

  console.log(`[wallets] Discovered ${candidates.size} raw candidates`);
  return candidates;
}

/**
 * Step 2: Filter candidates — remove AMM pools, PDAs, and blocklisted addresses.
 * Returns filtered list with before/after counts logged.
 */
export async function filterCandidates(
  candidates: Map<string, string[]>
): Promise<string[]> {
  const db = createServerClient();
  const conn = getHeliusConnection();

  // Load blocklist from Supabase
  const { data: blocklist } = await db.from("blocked_addresses").select("address");
  const blockedSet = new Set((blocklist ?? []).map((b: { address: string }) => b.address));

  const before = candidates.size;
  const filtered: string[] = [];
  let removedPDA = 0, removedAMM = 0, removedBlocklist = 0;

  for (const [address] of candidates) {
    // 1. Blocklist check
    if (blockedSet.has(address)) {
      removedBlocklist++;
      continue;
    }

    const pubkey = new PublicKey(address);

    // 2. PDA check (off-curve = program controlled)
    if (isPDA(pubkey)) {
      removedPDA++;
      continue;
    }

    // 3. Check if the account is owned by a known AMM program
    try {
      const accountInfo = await conn.getAccountInfo(pubkey);
      if (accountInfo?.owner && KNOWN_AMM_PROGRAMS.has(accountInfo.owner.toBase58())) {
        removedAMM++;
        continue;
      }
    } catch {
      // If we can't fetch, skip conservatively
      continue;
    }

    filtered.push(address);
  }

  console.log(
    `[wallets] Filter results: ${before} → ${filtered.length} ` +
    `(removed: ${removedPDA} PDAs, ${removedAMM} AMM-owned, ${removedBlocklist} blocklisted)`
  );

  return filtered;
}

/**
 * Upsert filtered wallets into Supabase.
 */
export async function saveWallets(addresses: string[]): Promise<void> {
  const db = createServerClient();
  const rows = addresses.map((address) => ({ address, is_curated: false, is_blocked: false }));
  
  const { error } = await db
    .from("wallets")
    .upsert(rows, { onConflict: "address", ignoreDuplicates: true });
  
  if (error) throw new Error(`Supabase wallet upsert error: ${error.message}`);
  console.log(`[wallets] Saved ${addresses.length} wallets to Supabase`);
}

/**
 * Get all active (non-blocked) wallets from Supabase.
 */
export async function getActiveWallets(): Promise<string[]> {
  const db = createServerClient();
  const { data, error } = await db
    .from("wallets")
    .select("address")
    .eq("is_blocked", false);
  
  if (error) throw new Error(`Supabase wallet fetch error: ${error.message}`);
  return (data ?? []).map((w: { address: string }) => w.address);
}
