import { getWallets } from "@/lib/data";
import SearchView from "./SearchView";

export default function SearchPage() {
  const wallets = getWallets();

  const data = wallets.map((w) => ({
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

  return <SearchView wallets={data} />;
}
