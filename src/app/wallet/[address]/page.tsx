import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import WalletDetail from "./WalletDetail";

export const dynamic = "force-dynamic";

interface RecentTrade {
  signature: string;
  blockTime: number;
  err: boolean;
}

async function getWalletData(address: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: wallet } = await supabase
    .from("gh_wallets")
    .select("*")
    .eq("address", address)
    .single();

  if (!wallet) return null;

  const { data: positions } = await supabase
    .from("gh_positions")
    .select("asset_symbol, mint_address, ui_amount, value_usd, pct")
    .eq("wallet_address", address)
    .gt("value_usd", 0)
    .order("value_usd", { ascending: false });

  const symbols = (positions ?? []).map((p) => p.asset_symbol);
  const { data: assets } = await supabase
    .from("gh_assets")
    .select("symbol, logo_url, underlying_symbol")
    .in("symbol", symbols);

  const assetMap = new Map(
    (assets ?? []).map((a) => [
      a.symbol,
      { logo: a.logo_url, underlying: a.underlying_symbol },
    ])
  );

  // Fetch recent transactions
  let recentTrades: RecentTrade[] = [];
  try {
    const res = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [address, { limit: 10 }],
        }),
      }
    );
    const json = await res.json();
    recentTrades = (json.result ?? []).map(
      (s: { signature: string; blockTime: number; err: unknown }) => ({
        signature: s.signature,
        blockTime: s.blockTime,
        err: !!s.err,
      })
    );
  } catch {
    // non-critical
  }

  return {
    wallet,
    positions: (positions ?? []).map((p) => ({
      ...p,
      logo_url: assetMap.get(p.asset_symbol)?.logo ?? null,
      underlying_symbol:
        assetMap.get(p.asset_symbol)?.underlying ?? p.asset_symbol,
    })),
    recentTrades,
  };
}

export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const data = await getWalletData(address);
  if (!data) notFound();

  return (
    <WalletDetail
      wallet={data.wallet}
      positions={data.positions}
      recentTrades={data.recentTrades}
    />
  );
}
