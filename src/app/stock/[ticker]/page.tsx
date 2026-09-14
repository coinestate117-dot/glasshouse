import { notFound } from "next/navigation";
import { getWallets, getPrices } from "@/lib/data";
import StockDetail from "./StockDetail";

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  const prices = getPrices();
  const price = prices.find((p) => p.underlying_symbol === upper);
  if (!price) notFound();

  const wallets = getWallets();

  // Find all wallets holding this stock
  const holders: {
    address: string;
    wallet_type: string;
    total_value_usd: number;
    position: {
      asset_symbol: string;
      underlying_symbol: string;
      ui_amount: number;
      value_usd: number;
      pct: number;
      logo_url: string | null;
    };
  }[] = [];

  for (const w of wallets) {
    const pos = w.positions.find((p) => p.underlying_symbol === upper);
    if (pos) {
      holders.push({
        address: w.address,
        wallet_type: w.wallet_type,
        total_value_usd: w.total_value_usd,
        position: {
          asset_symbol: pos.asset_symbol,
          underlying_symbol: pos.underlying_symbol,
          ui_amount: pos.ui_amount,
          value_usd: pos.value_usd,
          pct: pos.pct,
          logo_url: pos.logo_url,
        },
      });
    }
  }

  holders.sort((a, b) => b.position.value_usd - a.position.value_usd);

  const totalHeld = holders.reduce((s, h) => s + h.position.value_usd, 0);
  const totalShares = holders.reduce((s, h) => s + h.position.ui_amount, 0);
  const change24hPct =
    price.prev_close_usd && price.prev_close_usd > 0
      ? ((price.price_usd - price.prev_close_usd) / price.prev_close_usd) * 100
      : 0;

  return (
    <StockDetail
      ticker={upper}
      assetSymbol={price.symbol}
      priceUsd={price.price_usd}
      change24hPct={change24hPct}
      totalHeldUsd={totalHeld}
      totalShares={totalShares}
      holderCount={holders.length}
      largestHolder={
        holders[0]
          ? { address: holders[0].address, value_usd: holders[0].position.value_usd }
          : null
      }
      holders={holders}
      logoUrl={holders[0]?.position.logo_url ?? null}
    />
  );
}
