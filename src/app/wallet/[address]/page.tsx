import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWallet } from "@/lib/data";
import { formatUsd, shortenAddress } from "@/lib/format";
import WalletDetail from "./WalletDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const wallet = getWallet(address);
  if (!wallet) return {};

  const short = shortenAddress(address);
  const value = formatUsd(wallet.total_value_usd);
  const title = `${short} — ${value} Portfolio`;
  const description = `${wallet.wallet_type} wallet holding ${wallet.position_count} tokenized stocks worth ${value} on Solana.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?address=${address}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?address=${address}`],
    },
  };
}

interface RecentTrade {
  signature: string;
  blockTime: number;
  err: boolean;
}

async function fetchRecentTrades(address: string): Promise<RecentTrade[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [address, { limit: 10 }],
        }),
        next: { revalidate: 300 },
      }
    );
    const json = await res.json();
    return (json.result ?? []).map(
      (s: { signature: string; blockTime: number; err: unknown }) => ({
        signature: s.signature,
        blockTime: s.blockTime,
        err: !!s.err,
      })
    );
  } catch {
    return [];
  }
}

export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const wallet = getWallet(address);
  if (!wallet) notFound();

  const recentTrades = await fetchRecentTrades(address);

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
      recentTrades={recentTrades}
    />
  );
}
