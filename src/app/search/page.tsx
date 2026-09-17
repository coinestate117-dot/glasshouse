import { getWallets, getPrices } from "@/lib/data";
import SearchView from "./SearchView";

export default function SearchPage() {
  const wallets = getWallets();

  // Top 5 wallets only (not all 4K)
  const topWallets = [...wallets]
    .filter((w) => w.total_value_usd >= 10_000)
    .sort((a, b) => b.total_value_usd - a.total_value_usd)
    .slice(0, 5)
    .map((w) => ({
      address: w.address,
      total_value_usd: w.total_value_usd,
      wallet_type: w.wallet_type,
      topTicker: w.positions[0]?.underlying_symbol ?? "",
      positionCount: w.position_count,
    }));

  // Build all tickers for search
  const tickerSet = new Set<string>();
  for (const w of wallets) {
    for (const p of w.positions) tickerSet.add(p.underlying_symbol);
  }
  const allTickers = [...tickerSet].sort();

  // Top 10 stocks by total held value
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

  return (
    <SearchView
      topWallets={topWallets}
      topStocks={topStocks}
      allTickers={allTickers}
    />
  );
}
