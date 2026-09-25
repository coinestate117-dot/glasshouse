import { getAssetsDirect, getPricesDirect } from "@/lib/direct";
import { getPythPriceForSymbol } from "@/lib/pyth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PriceChart } from "@/components/PriceChart";
import { getTokenStats } from "@/lib/tokenStats";
import { TokenStatsPanel } from "@/components/TokenStats";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { ticker: string } }) {
  const ticker = (await params).ticker;
  return { title: `${ticker} — Glasshouse` };
}

export default async function StockPage({ params }: { params: { ticker: string } }) {
  const ticker = (await params).ticker;
  const assets = await getAssetsDirect();
  const asset = assets.find((a) => a.symbol.toLowerCase() === ticker.toLowerCase());

  if (!asset) {
    notFound();
  }

  const prices = await getPricesDirect([asset.mint]);
  const jupData = prices.get(asset.mint);
  const jupPrice = jupData?.price ?? 0;
  const jupChange = jupData?.change24h ?? null;

  const tokenStats = await getTokenStats(asset.mint);

  const pythData = await getPythPriceForSymbol(asset.symbol);
  const pythPrice = pythData?.price ?? null;

  let pythDiffPct: number | null = null;
  if (jupPrice > 0 && pythPrice !== null && pythPrice > 0) {
    pythDiffPct = ((jupPrice - pythPrice) / pythPrice) * 100;
  }

  function fmtPrice(p: number): string {
    if (p >= 1000) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(3)}`;
    return `$${p.toFixed(5)}`;
  }

  const isPos = jupChange !== null && jupChange >= 0;
  const isNeg = jupChange !== null && jupChange < 0;

  const isPythPos = pythDiffPct !== null && pythDiffPct >= 0;
  const isPythNeg = pythDiffPct !== null && pythDiffPct < 0;

  return (
    <div className="container" style={{ paddingTop: "16px", paddingBottom: "24px", maxWidth: "600px" }}>
      <Link href="/markets" className="btn btn-sm" style={{ marginBottom: "16px", display: "inline-flex" }}>
        ← Zurück zu Märkten
      </Link>

      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius)",
              background: `linear-gradient(135deg, hsl(${(asset.symbol.charCodeAt(0) * 17) % 360}, 55%, 40%), hsl(${(asset.symbol.charCodeAt(0) * 17 + 100) % 360}, 55%, 30%))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "#fff",
            }}
          >
            {asset.symbol.replace("x", "").slice(0, 4)}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>{asset.symbol}</h1>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>{asset.name ?? "xStock"}</div>
          </div>
        </div>

        {/* Kursverlauf des Tokens selbst — nicht der Aktie an der Börse.
            Der Token wird rund um die Uhr gehandelt, die Börse nicht. */}
        <div style={{ margin: "0 -24px 20px" }}>
          <PriceChart mint={asset.mint} symbol={asset.symbol} lastPrice={jupPrice} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: pythPrice !== null ? "16px" : "0", borderBottom: pythPrice !== null ? "1px solid var(--border)" : "none" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "4px" }}>On-Chain Preis (Jupiter)</div>
              <div className="value-lg">{fmtPrice(jupPrice)}</div>
            </div>
            {jupChange !== null && (
              <div className={`change-pill ${isPos ? "change-pos" : isNeg ? "change-neg" : "change-nil"}`} style={{ fontSize: "14px", padding: "6px 10px" }}>
                {isPos ? "+" : ""}{jupChange.toFixed(2)}% (24h)
              </div>
            )}
          </div>

          {pythPrice !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  Pyth-Referenzpreis
                  <span className="pulse-dot" style={{ width: "6px", height: "6px" }} />
                </div>
                <div className="value-md" style={{ color: "var(--text-dim)" }}>
                  {pythPrice !== null ? fmtPrice(pythPrice) : "Nicht verfügbar"}
                </div>
              </div>
              {pythDiffPct !== null && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "4px" }}>Abweichung</div>
                  <div className={`change-pill ${isPythPos ? "change-pos" : isPythNeg ? "change-neg" : "change-nil"}`} style={{ fontSize: "13px" }}>
                    {isPythPos ? "+" : ""}{pythDiffPct.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {tokenStats && (
        <div style={{ marginTop: "16px" }}>
          <TokenStatsPanel stats={tokenStats} />
        </div>
      )}
    </div>
  );
}
