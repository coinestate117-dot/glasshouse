/**
 * Standalone sync script — run with: npx tsx scripts/sync.ts
 * Writes data/assets.json, data/wallets.json, data/prices.json
 */

import fs from "fs";
import path from "path";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const HELIUS = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const XSTOCKS_API = "https://api.xstocks.fi/api/v2/public";
const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const BLOCKLIST = new Set(["S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS"]);
const MIN_VALUE = 100;
const DATA_DIR = path.join(process.cwd(), "data");

type WalletType = "Market Maker" | "Whale" | "Investor" | "Holder";

interface Asset {
  symbol: string;
  name: string;
  underlying_symbol: string;
  mint_address: string;
  logo_url: string;
  current_multiplier: number;
}

// ── RPC helper ──────────────────────────────────────────────
async function rpc(method: string, params: unknown[]) {
  const res = await fetch(HELIUS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

// ── A1: Assets ──────────────────────────────────────────────
async function syncAssets(): Promise<Asset[]> {
  const all: Asset[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const res = await fetch(`${XSTOCKS_API}/assets?page=${page}`);
    const data = await res.json();
    for (const a of data.nodes) {
      const sol = a.deployments.find((d: any) => d.network === "Solana");
      if (!sol) continue;
      all.push({
        symbol: a.symbol,
        name: a.name,
        underlying_symbol: a.underlyingSymbol,
        mint_address: sol.address,
        logo_url: a.logo,
        current_multiplier: 1,
      });
    }
    hasNext = data.page.hasNextPage;
    page++;
  }

  // Fetch multipliers
  for (let i = 0; i < all.length; i += 10) {
    const batch = all.slice(i, i + 10);
    await Promise.allSettled(
      batch.map(async (a) => {
        try {
          const res = await fetch(
            `${XSTOCKS_API}/assets/${a.symbol}/multiplier?network=Solana`
          );
          if (!res.ok) return;
          const m = await res.json();
          if (m.newMultiplier > 0 && m.activationDateTime <= Date.now() / 1000) {
            a.current_multiplier = m.newMultiplier;
          } else {
            a.current_multiplier = m.currentMultiplier;
          }
        } catch {}
      })
    );
  }

  console.log(`[A1+A2] ${all.length} assets with multipliers`);
  return all;
}

// ── A3: Wallet discovery ────────────────────────────────────
async function discoverWallets(assets: Asset[]) {
  const walletMints = new Map<string, Set<string>>();

  for (let i = 0; i < assets.length; i += 5) {
    const batch = assets.slice(i, i + 5);
    await Promise.allSettled(
      batch.map(async (asset) => {
        try {
          const res = await rpc("getTokenLargestAccounts", [asset.mint_address]);
          for (const acc of res.value.filter((a: any) => a.uiAmount > 0)) {
            try {
              const info = await rpc("getAccountInfo", [acc.address, { encoding: "jsonParsed" }]);
              const owner = info.value?.data?.parsed?.info?.owner;
              if (!owner) continue;
              const ownerInfo = await rpc("getAccountInfo", [owner, { encoding: "jsonParsed" }]);
              if (ownerInfo.value?.owner === SYSTEM_PROGRAM) {
                const set = walletMints.get(owner) ?? new Set();
                set.add(asset.mint_address);
                walletMints.set(owner, set);
              }
            } catch {}
          }
        } catch {}
      })
    );
    if ((i + 5) % 50 === 0)
      console.log(`[A3] Scanned ${Math.min(i + 5, assets.length)}/${assets.length} mints, ${walletMints.size} wallets`);
  }

  for (const addr of BLOCKLIST) walletMints.delete(addr);
  console.log(`[A3] ${walletMints.size} wallets after blocklist`);
  return [...walletMints.keys()];
}

// ── Classify wallet ─────────────────────────────────────────
function deriveType(xstockCount: number, xstockRatio: number): WalletType {
  if (xstockCount > 40) return "Market Maker";
  if (xstockRatio < 0.3) return "Whale";
  if (xstockCount >= 2 && xstockRatio >= 0.6) return "Investor";
  if (xstockCount === 1) return "Holder";
  if (xstockRatio < 0.6) return "Whale";
  return "Holder";
}

// ── A4: Build portfolios + classify ─────────────────────────
async function buildPortfolios(
  addresses: string[],
  assets: Asset[],
  prices: Map<string, { price: number; prevClose: number | null }>
) {
  const mintToAsset = new Map(assets.map((a) => [a.mint_address, a]));
  const knownMints = new Set(assets.map((a) => a.mint_address));
  const results: any[] = [];

  for (let i = 0; i < addresses.length; i += 3) {
    const batch = addresses.slice(i, i + 3);
    await Promise.allSettled(
      batch.map(async (addr) => {
        try {
          // Account info for SOL balance
          const info = await rpc("getAccountInfo", [addr, { encoding: "jsonParsed" }]);
          const solBalance = (info.value?.lamports || 0) / 1e9;

          // Token-2022 accounts
          const t22 = await rpc("getTokenAccountsByOwner", [
            addr,
            { programId: TOKEN_2022 },
            { encoding: "jsonParsed" },
          ]);

          let xstockCount = 0;
          let totalT22 = 0;
          const positions: any[] = [];

          for (const a of t22.value || []) {
            const pi = a.account.data.parsed.info;
            const uiAmount = pi.tokenAmount.uiAmount || 0;
            if (uiAmount <= 0) continue;
            totalT22++;

            if (pi.mint.startsWith("Xs")) xstockCount++;

            if (knownMints.has(pi.mint)) {
              const asset = mintToAsset.get(pi.mint)!;
              const p = prices.get(asset.underlying_symbol);
              const valueUsd = uiAmount * (p?.price || 0);
              positions.push({
                asset_symbol: asset.symbol,
                mint_address: pi.mint,
                ui_amount: uiAmount,
                value_usd: valueUsd,
                pct: 0,
                underlying_symbol: asset.underlying_symbol,
                logo_url: asset.logo_url,
              });
            }
          }

          const totalValue = positions.reduce((s: number, p: any) => s + p.value_usd, 0);
          for (const p of positions) {
            p.pct = totalValue > 0 ? (p.value_usd / totalValue) * 100 : 0;
          }

          // 24h change
          let totalPrev = 0;
          let hasPrev = false;
          for (const pos of positions) {
            const asset = mintToAsset.get(pos.mint_address);
            if (!asset) continue;
            const p = prices.get(asset.underlying_symbol);
            if (p?.prevClose) {
              totalPrev += pos.ui_amount * p.prevClose;
              hasPrev = true;
            }
          }
          const change24h = hasPrev && totalPrev > 0
            ? ((totalValue - totalPrev) / totalPrev) * 100
            : 0;

          // Recent activity
          let recentTxCount = 0;
          const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
          try {
            const sigs = await rpc("getSignaturesForAddress", [addr, { limit: 20 }]);
            for (const s of sigs) {
              if (s.blockTime > thirtyDaysAgo) recentTxCount++;
            }
          } catch {}

          const xstockRatio = totalT22 > 0 ? xstockCount / totalT22 : 0;

          if (totalValue >= MIN_VALUE) {
            results.push({
              address: addr,
              total_value_usd: totalValue,
              change_24h_pct: change24h,
              position_count: xstockCount,
              wallet_type: deriveType(xstockCount, xstockRatio),
              xstock_count: xstockCount,
              xstock_ratio: Math.round(xstockRatio * 100) / 100,
              sol_balance: Math.round(solBalance * 100) / 100,
              recent_tx_count: recentTxCount,
              positions: positions
                .filter((p: any) => p.value_usd > 0)
                .sort((a: any, b: any) => b.value_usd - a.value_usd),
            });
          }
        } catch {}
      })
    );
    if ((i + 3) % 15 === 0)
      console.log(`[A4] Built ${Math.min(i + 3, addresses.length)}/${addresses.length} portfolios, ${results.length} visible`);
  }

  return results.sort((a, b) => b.total_value_usd - a.total_value_usd);
}

// ── A5: Prices ──────────────────────────────────────────────
async function fetchPrices(assets: Asset[]) {
  const unique = [...new Map(assets.map((a) => [a.underlying_symbol, a])).values()];
  const priceMap = new Map<string, { price: number; prevClose: number | null }>();
  const priceRecords: any[] = [];

  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    await Promise.allSettled(
      batch.map(async (a) => {
        try {
          const res = await fetch(
            `${YAHOO_API}/${a.underlying_symbol}?interval=1d&range=2d`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          if (!res.ok) return;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) return;
          const price = meta.regularMarketPrice ?? 0;
          const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
          if (price > 0) {
            priceMap.set(a.underlying_symbol, { price, prevClose });
            priceRecords.push({
              mint_address: a.mint_address,
              symbol: a.symbol,
              underlying_symbol: a.underlying_symbol,
              price_usd: price,
              prev_close_usd: prevClose,
            });
          }
        } catch {}
      })
    );
    if (i + 5 < unique.length) await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[A5] Priced ${priceMap.size}/${unique.length} underlyings`);
  return { priceMap, priceRecords };
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  if (!HELIUS_API_KEY) {
    console.error("HELIUS_API_KEY not set. Source .env.local first.");
    process.exit(1);
  }

  const start = Date.now();
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const assets = await syncAssets();
  fs.writeFileSync(path.join(DATA_DIR, "assets.json"), JSON.stringify(assets, null, 2));

  const { priceMap, priceRecords } = await fetchPrices(assets);
  fs.writeFileSync(path.join(DATA_DIR, "prices.json"), JSON.stringify(priceRecords, null, 2));

  const addresses = await discoverWallets(assets);
  const wallets = await buildPortfolios(addresses, assets, priceMap);
  fs.writeFileSync(path.join(DATA_DIR, "wallets.json"), JSON.stringify(wallets, null, 2));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const types: Record<string, number> = {};
  for (const w of wallets) types[w.wallet_type] = (types[w.wallet_type] ?? 0) + 1;

  console.log(`\nDone in ${elapsed}s`);
  console.log(`Assets: ${assets.length}`);
  console.log(`Wallets (>=$${MIN_VALUE}): ${wallets.length}`);
  console.log(`Types:`, types);
  console.log(`Top 5:`);
  for (const w of wallets.slice(0, 5)) {
    console.log(`  ${w.address.slice(0, 8)}... $${w.total_value_usd.toFixed(0)} [${w.wallet_type}]`);
  }
}

main().catch(console.error);
