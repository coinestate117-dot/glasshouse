import { supabase } from "./supabase";
import { YAHOO_FINANCE_BASE } from "./constants";

interface YahooChartResult {
  meta: {
    symbol: string;
    regularMarketPrice: number;
    previousClose?: number;
    chartPreviousClose?: number;
  };
}

// Fetch stock price from Yahoo Finance
async function fetchStockPrice(
  underlyingSymbol: string
): Promise<{ price: number; prevClose: number | null }> {
  const res = await fetch(
    `${YAHOO_FINANCE_BASE}/${underlyingSymbol}?interval=1d&range=2d`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  if (!res.ok) return { price: 0, prevClose: null };

  const data = await res.json();
  const result: YahooChartResult | undefined =
    data?.chart?.result?.[0];
  if (!result) return { price: 0, prevClose: null };

  return {
    price: result.meta.regularMarketPrice ?? 0,
    prevClose:
      result.meta.previousClose ?? result.meta.chartPreviousClose ?? null,
  };
}

// A5 — Sync prices for all assets, then compute wallet values
export async function syncPrices(): Promise<number> {
  const { data: assets, error } = await supabase
    .from("gh_assets")
    .select("symbol, underlying_symbol, mint_address");
  if (error || !assets) throw new Error(`Read assets: ${error?.message}`);

  // Deduplicate underlying symbols (some xStocks may share underlyings)
  const uniqueUnderlyings = [
    ...new Map(assets.map((a) => [a.underlying_symbol, a])).values(),
  ];

  let priced = 0;
  // Batch 5 at a time to respect Yahoo rate limits
  for (let i = 0; i < uniqueUnderlyings.length; i += 5) {
    const batch = uniqueUnderlyings.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (a) => {
        const { price, prevClose } = await fetchStockPrice(
          a.underlying_symbol
        );
        if (price === 0) return;

        await supabase.from("gh_prices").upsert(
          {
            mint_address: a.mint_address,
            symbol: a.symbol,
            underlying_symbol: a.underlying_symbol,
            price_usd: price,
            prev_close_usd: prevClose,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "mint_address" }
        );
        priced++;
      })
    );
    // Small delay between batches
    if (i + 5 < uniqueUnderlyings.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `[A5] Priced ${priced}/${uniqueUnderlyings.length} underlying symbols`
  );
  return priced;
}

// Compute portfolio values for all wallets using current prices
export async function computeWalletValues(): Promise<void> {
  const { data: positions, error: posErr } = await supabase
    .from("gh_positions")
    .select("wallet_address, asset_symbol, mint_address, ui_amount");
  if (posErr || !positions) throw new Error(`Read positions: ${posErr?.message}`);

  const { data: prices, error: prErr } = await supabase
    .from("gh_prices")
    .select("mint_address, price_usd, prev_close_usd");
  if (prErr || !prices) throw new Error(`Read prices: ${prErr?.message}`);

  const priceMap = new Map(prices.map((p) => [p.mint_address, p]));

  // Group positions by wallet
  const walletPositions = new Map<
    string,
    { symbol: string; mint: string; uiAmount: number }[]
  >();
  for (const pos of positions) {
    const list = walletPositions.get(pos.wallet_address) ?? [];
    list.push({
      symbol: pos.asset_symbol,
      mint: pos.mint_address,
      uiAmount: pos.ui_amount,
    });
    walletPositions.set(pos.wallet_address, list);
  }

  for (const [wallet, poss] of walletPositions) {
    let totalValue = 0;
    let totalPrevValue = 0;
    let hasPrevClose = false;

    const posUpdates: {
      wallet_address: string;
      asset_symbol: string;
      mint_address: string;
      ui_amount: number;
      value_usd: number;
      pct: number;
    }[] = [];

    for (const pos of poss) {
      const price = priceMap.get(pos.mint);
      const valueUsd = pos.uiAmount * (price?.price_usd ?? 0);
      totalValue += valueUsd;
      if (price?.prev_close_usd) {
        totalPrevValue += pos.uiAmount * price.prev_close_usd;
        hasPrevClose = true;
      }
      posUpdates.push({
        wallet_address: wallet,
        asset_symbol: pos.symbol,
        mint_address: pos.mint,
        ui_amount: pos.uiAmount,
        value_usd: valueUsd,
        pct: 0, // computed below
      });
    }

    // Compute percentages
    for (const p of posUpdates) {
      p.pct = totalValue > 0 ? (p.value_usd / totalValue) * 100 : 0;
    }

    // Update positions with values
    await supabase.from("gh_positions").upsert(
      posUpdates.map((p) => ({
        ...p,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "wallet_address,asset_symbol" }
    );

    // Update wallet totals
    const change24h =
      hasPrevClose && totalPrevValue > 0
        ? ((totalValue - totalPrevValue) / totalPrevValue) * 100
        : 0;

    await supabase
      .from("gh_wallets")
      .update({
        total_value_usd: totalValue,
        change_24h_pct: change24h,
        position_count: poss.length,
        last_synced: new Date().toISOString(),
      })
      .eq("address", wallet);
  }

  console.log(`[A5] Computed values for ${walletPositions.size} wallets`);
}
