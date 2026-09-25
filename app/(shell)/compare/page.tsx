import { getWalletDirect } from "@/lib/direct";
import { WalletDetailClient } from "../wallet/[address]/WalletDetailClient";
import Link from "next/link";

export const revalidate = 60;

export default async function ComparePage({ searchParams }: { searchParams: { wallets?: string } }) {
  const walletsParam = searchParams.wallets;
  if (!walletsParam) {
    return (
      <div className="container" style={{ paddingTop: "24px" }}>
        <div className="error-box">No wallets selected for comparison.</div>
        <Link href="/app" className="btn btn-secondary" style={{ marginTop: "12px" }}>← Zurück zur Rangliste</Link>
      </div>
    );
  }

  const addresses = walletsParam.split(",").slice(0, 3);
  
  if (addresses.length < 2) {
    return (
      <div className="container" style={{ paddingTop: "24px" }}>
        <div className="error-box">Please select at least 2 wallets to compare.</div>
        <Link href="/app" className="btn btn-secondary" style={{ marginTop: "12px" }}>← Zurück zur Rangliste</Link>
      </div>
    );
  }

  const walletDataList = await Promise.all(
    addresses.map(async (address) => {
      try {
        const data = await getWalletDirect(address);
        return { address, data };
      } catch (err) {
        console.error("Failed to load wallet", address, err);
        return { address, data: null };
      }
    })
  );

  return (
    <div className="container" style={{ paddingTop: "24px", paddingBottom: "40px" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Compare Wallets</h1>
        <Link href="/app" className="btn btn-secondary btn-sm">← Zurück zur Rangliste</Link>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: `repeat(${addresses.length}, 1fr)`, 
        gap: "16px",
        alignItems: "start"
      }}>
        {walletDataList.map(({ address, data }) => (
          <div key={address} style={{ minWidth: 0 }}>
            {data ? (
              <WalletDetailClient address={address} data={data} isCompareMode={true} />
            ) : (
              <div className="error-box">Failed to load {address.slice(0,6)}...</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
