import { getWallets, getPrices } from "./data";

export interface ActivityItem {
  signature: string;
  blockTime: number;
  walletAddress: string;
  type: "buy" | "sell";
  symbol: string;
  asset_symbol: string;
  logo_url: string | null;
  amount: number;
  value_usd: number;
}

interface MintInfo {
  symbol: string;
  underlying: string;
  logo: string | null;
  price: number;
}

function buildMintMap(): Map<string, MintInfo> {
  const prices = getPrices();
  const wallets = getWallets();
  const map = new Map<string, MintInfo>();

  for (const p of prices) {
    map.set(p.mint_address, {
      symbol: p.symbol,
      underlying: p.underlying_symbol,
      logo: null,
      price: p.price_usd,
    });
  }
  for (const w of wallets) {
    for (const pos of w.positions) {
      const entry = map.get(pos.mint_address);
      if (entry && !entry.logo) entry.logo = pos.logo_url;
    }
  }
  return map;
}

interface RpcSig {
  signature: string;
  blockTime: number;
  walletAddress: string;
}

interface TokenBal {
  mint: string;
  owner?: string;
  uiTokenAmount: { uiAmount: number | null };
}

async function rpcCall(rpc: string, method: string, params: unknown[]) {
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result ?? null;
  } catch {
    return null;
  }
}

/** Run promises in batches to avoid rate limits */
async function batchAll<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

function parseXStockChanges(
  walletAddress: string,
  pre: TokenBal[],
  post: TokenBal[],
  mintMap: Map<string, MintInfo>
): { mint: string; net: number }[] {
  const balances = new Map<string, { pre: number; post: number }>();

  for (const b of pre) {
    if (b.owner !== walletAddress) continue;
    if (!mintMap.has(b.mint)) continue;
    const entry = balances.get(b.mint) ?? { pre: 0, post: 0 };
    entry.pre += b.uiTokenAmount.uiAmount ?? 0;
    balances.set(b.mint, entry);
  }

  for (const b of post) {
    if (b.owner !== walletAddress) continue;
    if (!mintMap.has(b.mint)) continue;
    const entry = balances.get(b.mint) ?? { pre: 0, post: 0 };
    entry.post += b.uiTokenAmount.uiAmount ?? 0;
    balances.set(b.mint, entry);
  }

  const changes: { mint: string; net: number }[] = [];
  for (const [mint, bal] of balances) {
    const net = bal.post - bal.pre;
    if (Math.abs(net) > 0.001) {
      changes.push({ mint, net });
    }
  }
  return changes;
}

function extractItems(
  sig: RpcSig,
  tx: { meta?: { preTokenBalances?: TokenBal[]; postTokenBalances?: TokenBal[] } } | null,
  walletAddress: string,
  mintMap: Map<string, MintInfo>
): ActivityItem[] {
  if (!tx?.meta) return [];
  const changes = parseXStockChanges(
    walletAddress,
    tx.meta.preTokenBalances ?? [],
    tx.meta.postTokenBalances ?? [],
    mintMap
  );
  return changes.map((c) => {
    const info = mintMap.get(c.mint)!;
    return {
      signature: sig.signature,
      blockTime: sig.blockTime,
      walletAddress,
      type: c.net > 0 ? ("buy" as const) : ("sell" as const),
      symbol: info.underlying,
      asset_symbol: info.symbol,
      logo_url: info.logo,
      amount: Math.abs(c.net),
      value_usd: Math.abs(c.net) * info.price,
    };
  });
}

/** Fetch activity for a single wallet */
export async function getWalletActivity(
  walletAddress: string,
  limit = 10
): Promise<ActivityItem[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) return [];
  const rpc = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const mintMap = buildMintMap();

  const sigs = await rpcCall(rpc, "getSignaturesForAddress", [
    walletAddress,
    { limit },
  ]);
  if (!sigs || !Array.isArray(sigs)) return [];

  const txResults = await batchAll(
    sigs.map(
      (s: { signature: string }) => () =>
        rpcCall(rpc, "getTransaction", [
          s.signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ])
    ),
    5
  );

  const items: ActivityItem[] = [];
  for (let i = 0; i < sigs.length; i++) {
    items.push(
      ...extractItems(
        { signature: sigs[i].signature, blockTime: sigs[i].blockTime, walletAddress },
        txResults[i],
        walletAddress,
        mintMap
      )
    );
  }

  items.sort((a, b) => b.blockTime - a.blockTime);
  return items;
}

/** Fetch activity across ALL tracked wallets */
export async function getGlobalActivity(): Promise<ActivityItem[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) return [];
  const rpc = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const wallets = getWallets();
  const mintMap = buildMintMap();
  const walletSet = new Set(wallets.map((w) => w.address));

  // 1. Fetch signatures in batches of 10 wallets
  const allSigs: RpcSig[] = [];
  const sigResults = await batchAll(
    wallets.map(
      (w) => async () => {
        const result = await rpcCall(rpc, "getSignaturesForAddress", [
          w.address,
          { limit: 5 },
        ]);
        if (!result || !Array.isArray(result)) return [];
        return result.map(
          (s: { signature: string; blockTime: number }) => ({
            signature: s.signature,
            blockTime: s.blockTime,
            walletAddress: w.address,
          })
        );
      }
    ),
    10
  );

  for (const sigs of sigResults) allSigs.push(...sigs);

  // 2. Deduplicate by signature
  const sigMap = new Map<string, RpcSig>();
  for (const s of allSigs) {
    if (!sigMap.has(s.signature)) sigMap.set(s.signature, s);
  }

  // 3. Sort by time, take top 40
  const sorted = [...sigMap.values()].sort((a, b) => b.blockTime - a.blockTime);
  const top = sorted.slice(0, 40);

  // 4. Parse transactions in batches of 5
  const txResults = await batchAll(
    top.map(
      (s) => () =>
        rpcCall(rpc, "getTransaction", [
          s.signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ])
    ),
    5
  );

  // 5. Extract xStock changes
  const items: ActivityItem[] = [];

  for (let i = 0; i < top.length; i++) {
    const sig = top[i];
    const tx = txResults[i];
    if (!tx?.meta) continue;

    const pre: TokenBal[] = tx.meta.preTokenBalances ?? [];
    const post: TokenBal[] = tx.meta.postTokenBalances ?? [];

    const ownersInTx = new Set<string>();
    for (const b of [...pre, ...post]) {
      if (b.owner && walletSet.has(b.owner)) ownersInTx.add(b.owner);
    }

    for (const owner of ownersInTx) {
      items.push(...extractItems(sig, tx, owner, mintMap));
    }
  }

  items.sort((a, b) => b.blockTime - a.blockTime);
  return items;
}
