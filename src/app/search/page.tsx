import { getWallets, getPrices } from "@/lib/data";
import SearchView from "./SearchView";

export default function SearchPage() {
  const wallets = getWallets();
  const prices = getPrices();

  const walletData = wallets.map((w) => ({
    address: w.address,
    total_value_usd: w.total_value_usd,
    wallet_type: w.wallet_type,
    positions: w.positions.map((p) => ({
      underlying_symbol: p.underlying_symbol,
      asset_symbol: p.asset_symbol,
      value_usd: p.value_usd,
      logo_url: p.logo_url,
      pct: p.pct,
    })),
  }));

  // Build top stocks by total value held
  const stockMap = new Map<
    string,
    { symbol: string; asset_symbol: string; logo_url: string | null; totalValue: number; holders: number }
  >();

  for (const w of wallets) {
    for (const p of w.positions) {
      const entry = stockMap.get(p.underlying_symbol) ?? {
        symbol: p.underlying_symbol,
        asset_symbol: p.asset_symbol,
        logo_url: p.logo_url,
        totalValue: 0,
        holders: 0,
      };
      entry.totalValue += p.value_usd;
      entry.holders += 1;
      if (!entry.logo_url && p.logo_url) entry.logo_url = p.logo_url;
      stockMap.set(p.underlying_symbol, entry);
    }
  }

  const topStocks = [...stockMap.values()]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  return <SearchView wallets={walletData} topStocks={topStocks} />;
}
