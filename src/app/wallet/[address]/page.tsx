import { notFound } from "next/navigation";
import { getWallet } from "@/lib/data";
import { getWalletActivity } from "@/lib/activity";
import WalletDetail from "./WalletDetail";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const wallet = getWallet(address);
  if (!wallet) notFound();

  const activity = await getWalletActivity(address, 15);

  return (
    <WalletDetail
      wallet={{
        address: wallet.address,
        total_value_usd: wallet.total_value_usd,
        change_24h_pct: wallet.change_24h_pct,
        position_count: wallet.position_count,
        wallet_type: wallet.wallet_type,
      }}
      positions={wallet.positions}
      activity={activity}
    />
  );
}
