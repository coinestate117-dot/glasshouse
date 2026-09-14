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
  // Fill logos from wallet positions
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
  err: boolean;
  walletAddress: string;
}

interface TokenBal {
  mint: string;
  owner?: string;
  uiTokenAmount: { uiAmount: number | null };
}

async function rpcCall(rpc: string, method: string, params: unknown[]) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 300 },
  });
  const json = await res.json();
  return json.result;
}

function parseXStockChanges(
  walletAddress: string,
  pre: TokenBal[],
  post: TokenBal[],
  mintMap: Map<string, MintInfo>
): { mint: string; net: number }[] {
  // Build map: (owner, mint) → { pre, post }
  const balances = new Map<string, { pre: number; post: number }>();

  for (const b of pre) {
    if (b.owner !== walletAddress) continue;
    if (!mintMap.has(b.mint)) continue;
    const key = b.mint;
    const entry = balances.get(key) ?? { pre: 0, post: 0 };
    entry.pre += b.uiTokenAmount.uiAmount ?? 0;
    balances.set(key, entry);
  }

  for (const b of post) {
    if (b.owner !== walletAddress) continue;
    if (!mintMap.has(b.mint)) continue;
    const key = b.mint;
    const entry = balances.get(key) ?? { pre: 0, post: 0 };
    entry.post += b.uiTokenAmount.uiAmount ?? 0;
    balances.set(key, entry);
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

  const items: ActivityItem[] = [];

  const txResults = await Promise.all(
    sigs.map((s: { signature: string }) =>
      rpcCall(rpc, "getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ])
    )
  );

  for (let i = 0; i < sigs.length; i++) {
    const s = sigs[i];
    const tx = txResults[i];
    if (!tx?.meta) continue;

    const changes = parseXStockChanges(
      walletAddress,
      tx.meta.preTokenBalances ?? [],
      tx.meta.postTokenBalances ?? [],
      mintMap
    );

    for (const c of changes) {
      const info = mintMap.get(c.mint);
      if (!info) continue;
      items.push({
        signature: s.signature,
        blockTime: s.blockTime,
        walletAddress,
        type: c.net > 0 ? "buy" : "sell",
        symbol: info.underlying,
        asset_symbol: info.symbol,
        logo_url: info.logo,
        amount: Math.abs(c.net),
        value_usd: Math.abs(c.net) * info.price,
      });
    }
  }

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

  // 1. Fetch signatures for all wallets in parallel
  const allSigs: RpcSig[] = [];
  const sigResults = await Promise.all(
    wallets.map(async (w) => {
      const result = await rpcCall(rpc, "getSignaturesForAddress", [
        w.address,
        { limit: 5 },
      ]);
      return (result ?? []).map(
        (s: { signature: string; blockTime: number; err: unknown }) => ({
          signature: s.signature,
          blockTime: s.blockTime,
          err: !!s.err,
          walletAddress: w.address,
        })
      );
    })
  );

  for (const sigs of sigResults) allSigs.push(...sigs);

  // 2. Deduplicate by signature (keep the one with wallet info)
  const sigMap = new Map<string, RpcSig>();
  for (const s of allSigs) {
    if (!sigMap.has(s.signature) || s.blockTime > (sigMap.get(s.signature)?.blockTime ?? 0)) {
      sigMap.set(s.signature, s);
    }
  }

  // 3. Sort by time, take top 60
  const sorted = [...sigMap.values()].sort((a, b) => b.blockTime - a.blockTime);
  const top = sorted.slice(0, 60);

  // 4. Parse transactions in parallel
  const txResults = await Promise.all(
    top.map((s) =>
      rpcCall(rpc, "getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ])
    )
  );

  // 5. Extract xStock changes
  const items: ActivityItem[] = [];

  for (let i = 0; i < top.length; i++) {
    const sig = top[i];
    const tx = txResults[i];
    if (!tx?.meta) continue;

    const pre: TokenBal[] = tx.meta.preTokenBalances ?? [];
    const post: TokenBal[] = tx.meta.postTokenBalances ?? [];

    // Check all tracked wallets that appear in this tx
    const ownersInTx = new Set<string>();
    for (const b of [...pre, ...post]) {
      if (b.owner && walletSet.has(b.owner)) ownersInTx.add(b.owner);
    }

    for (const owner of ownersInTx) {
      const changes = parseXStockChanges(owner, pre, post, mintMap);
      for (const c of changes) {
        const info = mintMap.get(c.mint);
        if (!info) continue;
        items.push({
          signature: sig.signature,
          blockTime: sig.blockTime,
          walletAddress: owner,
          type: c.net > 0 ? "buy" : "sell",
          symbol: info.underlying,
          asset_symbol: info.symbol,
          logo_url: info.logo,
          amount: Math.abs(c.net),
          value_usd: Math.abs(c.net) * info.price,
        });
      }
    }
  }

  // Sort by time
  items.sort((a, b) => b.blockTime - a.blockTime);
  return items;
}
