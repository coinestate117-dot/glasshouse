/**
 * Full wallet scan — discovers ALL xStock holders via getProgramAccounts
 * for top mints + getTokenLargestAccounts for the long tail.
 *
 * Run: source .env.local && npx tsx scripts/fullscan.ts
 */

import fs from "fs";
import path from "path";
import { PublicKey } from "@solana/web3.js";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const HELIUS = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const BLOCKLIST = new Set([
  "S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS",
  "9U76mo3WuP28s4kYJ9CMH1CiQh6Ph3r5Zg5awZM5vMQd",
  "6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF",
  "41Mjig92SfveWPKkqis78hF3a75cpe96n1uuVuMAdkJF",
  "9A9dUreQvTNoqNrqQC2DN1onfZWBtCBsTiuA6oGXZwc6",
]);
const MIN_VALUE = 1_000;
const DATA_DIR = path.join(process.cwd(), "data");

type WalletType = "Market Maker" | "Whale" | "Investor" | "Holder";

// ── RPC ─────────────────────────────────────────────────────
async function rpc(method: string, params: unknown[], timeout = 120_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(HELIUS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Phase 1: Deep scan top mints with getProgramAccounts ────
async function deepScan(
  mints: { mint: string; symbol: string; price: number; decimals: number; multiplier: number }[]
) {
  // wallet -> { mint -> uiAmount * price }
  const walletValues = new Map<string, Map<string, number>>();
  let totalAccounts = 0;

  for (let i = 0; i < mints.length; i++) {
    const { mint, symbol, price, decimals, multiplier } = mints[i];
    console.log(
      `[Deep ${i + 1}/${mints.length}] ${symbol} (${mint.slice(0, 12)}...)`
    );

    try {
      // dataSlice: get owner (32 bytes at offset 32) + amount (8 bytes at offset 64)
      const result = await rpc(
        "getProgramAccounts",
        [
          TOKEN_2022,
          {
            encoding: "base64",
            dataSlice: { offset: 32, length: 40 },
            filters: [{ memcmp: { offset: 0, bytes: mint } }],
          },
        ],
        180_000
      );

      let holders = 0;
      for (const acc of result) {
        const buf = Buffer.from(acc.account.data[0], "base64");
        if (buf.length < 40) continue;

        // Read amount as u64 little-endian
        const lo = buf.readUInt32LE(32);
        const hi = buf.readUInt32LE(36);
        const rawAmount = hi * 2 ** 32 + lo;
        if (rawAmount === 0) continue;

        // Decode owner pubkey
        const ownerBytes = buf.slice(0, 32);
        let owner: string;
        try {
          owner = new PublicKey(ownerBytes).toBase58();
        } catch {
          continue;
        }

        if (BLOCKLIST.has(owner)) continue;

        const uiAmount = (rawAmount / 10 ** decimals) * multiplier;
        const value = uiAmount * price;

        if (!walletValues.has(owner)) walletValues.set(owner, new Map());
        const wMap = walletValues.get(owner)!;
        wMap.set(mint, (wMap.get(mint) ?? 0) + value);

        holders++;
      }

      totalAccounts += holders;
      console.log(`  → ${holders} non-zero holders`);
      await sleep(1000);
    } catch (err: any) {
      console.log(`  → ERROR: ${err.message?.slice(0, 80)}`);
      await sleep(3000);
    }
  }

  console.log(
    `[Deep] Done: ${walletValues.size} unique wallets, ${totalAccounts} total accounts`
  );
  return walletValues;
}

// ── Phase 2: Fast scan remaining mints with getTokenLargestAccounts
async function fastScan(
  mints: { mint: string; symbol: string; price: number }[],
  existing: Map<string, Map<string, number>>
) {
  let newWallets = 0;

  for (let i = 0; i < mints.length; i += 10) {
    const batch = mints.slice(i, i + 10);
    await Promise.allSettled(
      batch.map(async ({ mint, symbol, price }) => {
        try {
          const res = await rpc("getTokenLargestAccounts", [mint]);
          for (const acc of res.value?.filter((a: any) => a.uiAmount > 0) ??
            []) {
            try {
              const info = await rpc("getAccountInfo", [
                acc.address,
                { encoding: "jsonParsed" },
              ]);
              const owner = info.value?.data?.parsed?.info?.owner;
              if (!owner || BLOCKLIST.has(owner)) continue;

              const value = acc.uiAmount * price;
              if (!existing.has(owner)) {
                existing.set(owner, new Map());
                newWallets++;
              }
              const wMap = existing.get(owner)!;
              wMap.set(mint, (wMap.get(mint) ?? 0) + value);
            } catch {}
          }
        } catch {}
      })
    );

    if ((i + 10) % 100 === 0) {
      console.log(
        `[Fast] Scanned ${Math.min(i + 10, mints.length)}/${mints.length} mints, +${newWallets} new wallets`
      );
    }
  }

  console.log(`[Fast] Done: +${newWallets} new wallets`);
}

// ── Phase 3: Build portfolios for qualifying wallets ────────
function deriveType(xstockCount: number, xstockRatio: number): WalletType {
  if (xstockCount > 40) return "Market Maker";
  if (xstockRatio < 0.3) return "Whale";
  if (xstockCount >= 2 && xstockRatio >= 0.6) return "Investor";
  if (xstockCount === 1) return "Holder";
  if (xstockRatio < 0.6) return "Whale";
  return "Holder";
}

async function buildPortfolios(
  walletAddresses: string[],
  assets: any[],
  priceMap: Map<string, { price: number; prevClose: number | null }>
) {
  const mintToAsset = new Map(assets.map((a: any) => [a.mint_address, a]));
  const knownMints = new Set(assets.map((a: any) => a.mint_address));
  const results: any[] = [];

  let rpcFails = 0;

  for (let i = 0; i < walletAddresses.length; i += 3) {
    const batch = walletAddresses.slice(i, i + 3);
    await Promise.allSettled(
      batch.map(async (addr) => {
        for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const info = await rpc("getAccountInfo", [addr, { encoding: "jsonParsed" }], 30_000);
          // Verify it's a real wallet (owned by System Program)
          if (!info?.value || info.value?.owner !== SYSTEM_PROGRAM) return;
          const solBalance = (info.value?.lamports || 0) / 1e9;

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
              const p = priceMap.get(asset.underlying_symbol);
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
          if (totalValue < MIN_VALUE) return;

          for (const p of positions) {
            p.pct = totalValue > 0 ? (p.value_usd / totalValue) * 100 : 0;
          }

          let totalPrev = 0;
          let hasPrev = false;
          for (const pos of positions) {
            const asset = mintToAsset.get(pos.mint_address);
            if (!asset) continue;
            const p = priceMap.get(asset.underlying_symbol);
            if (p?.prevClose) {
              totalPrev += pos.ui_amount * p.prevClose;
              hasPrev = true;
            }
          }
          const change24h =
            hasPrev && totalPrev > 0
              ? ((totalValue - totalPrev) / totalPrev) * 100
              : 0;

          let recentTxCount = 0;
          const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
          try {
            const sigs = await rpc("getSignaturesForAddress", [addr, { limit: 10 }], 15_000);
            for (const s of sigs) {
              if (s.blockTime > thirtyDaysAgo) recentTxCount++;
            }
          } catch {}

          const xstockRatio = totalT22 > 0 ? xstockCount / totalT22 : 0;

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
          return; // success, exit retry loop
        } catch (err: any) {
          if (attempt === 0) {
            await sleep(2000); // wait before retry
          } else {
            rpcFails++;
          }
        }
        } // end retry loop
      })
    );

    if ((i + 3) % 30 === 0) {
      console.log(
        `[Build] ${Math.min(i + 3, walletAddresses.length)}/${walletAddresses.length} checked, ${results.length} qualified, ${rpcFails} rpc fails`
      );
      await sleep(500); // pace the RPC calls
    }
  }

  return results.sort((a, b) => b.total_value_usd - a.total_value_usd);
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  if (!HELIUS_API_KEY) {
    console.error("Set HELIUS_API_KEY first.");
    process.exit(1);
  }

  const start = Date.now();

  // Load existing data
  const assets: any[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "assets.json"), "utf-8")
  );
  const priceRecords: any[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "prices.json"), "utf-8")
  );

  const priceMap = new Map<string, { price: number; prevClose: number | null }>();
  const mintPrice = new Map<string, number>();
  for (const p of priceRecords) {
    priceMap.set(p.underlying_symbol, {
      price: p.price_usd,
      prevClose: p.prev_close_usd,
    });
    mintPrice.set(p.mint_address, p.price_usd);
  }

  console.log(`Loaded ${assets.length} assets, ${priceRecords.length} prices`);

  // Sort mints by total value held on Solana (from existing wallets.json)
  // This ensures we deep-scan the popular stocks (NVDA, TSLA, etc.)
  let existingWallets: any[] = [];
  try {
    existingWallets = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "wallets.json"), "utf-8")
    );
  } catch {}

  const mintHeldValue = new Map<string, number>();
  for (const w of existingWallets) {
    for (const p of w.positions ?? []) {
      mintHeldValue.set(
        p.mint_address,
        (mintHeldValue.get(p.mint_address) ?? 0) + (p.value_usd ?? 0)
      );
    }
  }

  // Build multiplier lookup
  const mintMultiplier = new Map<string, number>();
  for (const a of assets) {
    mintMultiplier.set(a.mint_address, a.current_multiplier ?? 1);
  }

  const mintsByValue = assets
    .filter((a: any) => mintPrice.has(a.mint_address))
    .map((a: any) => ({
      mint: a.mint_address,
      symbol: a.underlying_symbol,
      price: mintPrice.get(a.mint_address) ?? 0,
      held: mintHeldValue.get(a.mint_address) ?? 0,
      multiplier: a.current_multiplier ?? 1,
      decimals: 8,
    }))
    .sort((a, b) => b.held - a.held || b.price - a.price);

  const mintsByPrice = mintsByValue;

  // Top 30 for deep scan, rest for fast scan
  const deepMints = mintsByPrice.slice(0, 30);
  const fastMints = mintsByPrice.slice(30).map((m) => ({
    mint: m.mint,
    symbol: m.symbol,
    price: m.price,
  }));

  console.log(`\n=== Phase 1: Deep scan (top 30 mints) ===`);
  const walletValues = await deepScan(deepMints);

  console.log(`\n=== Phase 2: Fast scan (remaining ${fastMints.length} mints) ===`);
  await fastScan(fastMints, walletValues);

  // Compute estimated total value per wallet
  const candidates: { addr: string; estimatedValue: number }[] = [];
  for (const [addr, mMap] of walletValues) {
    let total = 0;
    for (const v of mMap.values()) total += v;
    if (total >= MIN_VALUE * 0.5) {
      // Include wallets at 50% threshold (some value might be in unscanned mints)
      candidates.push({ addr, estimatedValue: total });
    }
  }

  candidates.sort((a, b) => b.estimatedValue - a.estimatedValue);
  console.log(
    `\n=== Phase 3: Build portfolios for ${candidates.length} candidates (est. ≥$${MIN_VALUE / 2}) ===`
  );

  const wallets = await buildPortfolios(
    candidates.map((c) => c.addr),
    assets,
    priceMap
  );

  // Write
  fs.writeFileSync(
    path.join(DATA_DIR, "wallets.json"),
    JSON.stringify(wallets, null, 2)
  );

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  const types: Record<string, number> = {};
  for (const w of wallets)
    types[w.wallet_type] = (types[w.wallet_type] ?? 0) + 1;

  console.log(`\n════════════════════════════════════`);
  console.log(`Done in ${elapsed} minutes`);
  console.log(`Total unique wallets scanned: ${walletValues.size}`);
  console.log(`Candidates (est. ≥$${MIN_VALUE / 2}): ${candidates.length}`);
  console.log(`Final wallets (≥$${MIN_VALUE}): ${wallets.length}`);
  console.log(`Types:`, types);
  console.log(`Top 10:`);
  for (const w of wallets.slice(0, 10)) {
    console.log(
      `  ${w.address.slice(0, 8)}... $${w.total_value_usd.toFixed(0)} [${w.wallet_type}] ${w.position_count} pos`
    );
  }
}

main().catch(console.error);
