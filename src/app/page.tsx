import { createClient } from "@supabase/supabase-js";
import Leaderboard from "@/components/Leaderboard";

export const dynamic = "force-dynamic";

async function getLeaderboardData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Wallets sorted by value
  const { data: wallets } = await supabase
    .from("gh_wallets")
    .select("address, total_value_usd, change_24h_pct, position_count, wallet_type")
    .gte("total_value_usd", 100)
    .order("total_value_usd", { ascending: false })
    .limit(50);

  if (!wallets || wallets.length === 0) {
    return { wallets: [], totalValue: 0, totalChange24h: 0 };
  }

  // Get positions for all wallets (for allocation bars)
  const addresses = wallets.map((w) => w.address);
  const { data: positions } = await supabase
    .from("gh_positions")
    .select("wallet_address, asset_symbol, pct")
    .in("wallet_address", addresses)
    .gt("pct", 0);

  // Group positions by wallet
  const positionsByWallet = new Map<
    string,
    { asset_symbol: string; pct: number }[]
  >();
  for (const p of positions ?? []) {
    const list = positionsByWallet.get(p.wallet_address) ?? [];
    list.push({ asset_symbol: p.asset_symbol, pct: p.pct });
    positionsByWallet.set(p.wallet_address, list);
  }

  const enriched = wallets.map((w) => ({
    ...w,
    positions: positionsByWallet.get(w.address) ?? [],
  }));

  const totalValue = wallets.reduce((s, w) => s + w.total_value_usd, 0);

  // Weighted average 24h change
  const totalChange24h =
    totalValue > 0
      ? wallets.reduce(
          (s, w) => s + w.change_24h_pct * (w.total_value_usd / totalValue),
          0
        )
      : 0;

  return { wallets: enriched, totalValue, totalChange24h };
}

export default async function HomePage() {
  const data = await getLeaderboardData();

  return (
    <Leaderboard
      wallets={data.wallets}
      totalValue={data.totalValue}
      totalChange24h={data.totalChange24h}
    />
  );
}
