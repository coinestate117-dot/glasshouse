import { notFound } from "next/navigation";
import Link from "next/link";
import { getWalletDirect } from "@/lib/direct";
import { WalletDetailClient } from "./WalletDetailClient";
import { isDemoMode } from "@/lib/demo-mode";
import { demoWalletByAddress } from "@/lib/demo";

type Props = { params: Promise<{ address: string }> };

export default async function WalletPage({ params }: Props) {
  const { address } = await params;

  if (!address || address.length < 32 || address.length > 44) notFound();

  let data: Awaited<ReturnType<typeof getWalletDirect>> | null = null;
  let error: string | null = null;

  const demo = await isDemoMode();
  const demoWallet = demo ? demoWalletByAddress(address) : null;

  if (demoWallet) {
    data = {
      holdings: demoWallet.holdings,
      total_value: demoWallet.total_value,
      change_24h_pct: demoWallet.change_24h_pct,
    };
  } else {
    try {
      data = await getWalletDirect(address);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load wallet";
    }
  }

  return (
    <div className="container" style={{ paddingTop: "16px", paddingBottom: "32px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
        <Link href="/app" style={{ color: "var(--text-muted)", textDecoration: "none" }}>← Rangliste</Link>
        <span>/</span>
        <span className="addr">{address.slice(0, 6)}…{address.slice(-6)}</span>
        {demoWallet ? (
          <span className="demo-badge" style={{ marginLeft: "auto" }}>
            Demo · {demoWallet.label}
          </span>
        ) : (
          <a
            href={`https://solscan.io/account/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ext-link"
            style={{ marginLeft: "auto" }}
          >
            Solscan ↗
          </a>
        )}
      </div>

      {error && <div className="error-box" style={{ marginBottom: "16px" }}>⚠ {error}</div>}
      {data && <WalletDetailClient address={address} data={data} isDemo={!!demoWallet} />}
    </div>
  );
}
