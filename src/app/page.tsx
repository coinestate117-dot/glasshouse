import { getWallets } from "@/lib/data";
import Leaderboard from "@/components/Leaderboard";

export default function HomePage() {
  const allWallets = getWallets();
  const wallets = allWallets.filter((w) => w.total_value_usd >= 10_000);

  const totalValue = wallets.reduce((s, w) => s + w.total_value_usd, 0);
  const totalChange24h =
    totalValue > 0
      ? wallets.reduce(
          (s, w) => s + w.change_24h_pct * (w.total_value_usd / totalValue),
          0
        )
      : 0;

  return (
    <Leaderboard
      wallets={wallets.map((w) => ({
        address: w.address,
        total_value_usd: w.total_value_usd,
        change_24h_pct: w.change_24h_pct,
        position_count: w.position_count,
        wallet_type: w.wallet_type,
        positions: w.positions.slice(0, 6).map((p) => ({
          asset_symbol: p.asset_symbol,
          pct: p.pct,
          logo_url: p.logo_url,
          underlying_symbol: p.underlying_symbol,
          value_usd: p.value_usd,
        })),
      }))}
      totalValue={totalValue}
      totalChange24h={totalChange24h}
    />
  );
}
