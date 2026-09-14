import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import WalletDetail from "./WalletDetail";

export const dynamic = "force-dynamic";

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

  // Get logos for positions
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

  return {
    wallet,
    positions: (positions ?? []).map((p) => ({
      ...p,
      logo_url: assetMap.get(p.asset_symbol)?.logo ?? null,
      underlying_symbol:
        assetMap.get(p.asset_symbol)?.underlying ?? p.asset_symbol,
    })),
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

  return <WalletDetail wallet={data.wallet} positions={data.positions} />;
}
