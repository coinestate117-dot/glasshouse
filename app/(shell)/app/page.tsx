import { getAssetsDirect, getPricesDirect, buildLeaderboard } from "@/lib/direct";
import { TickerStrip } from "@/components/TickerStrip";
import { LeaderboardClient } from "@/app/LeaderboardClient";
import { isDemoMode } from "@/lib/demo-mode";
import { demoLeaderboard, demoTicker } from "@/lib/demo";

import Link from "next/link";
import { AssetSource } from "@/lib/direct";

export default async function HomePage(props: { searchParams: Promise<{ source?: string }> }) {
  const searchParams = await props.searchParams;
  const source: AssetSource = searchParams.source === "prestocks" ? "prestocks" : "xstocks";
  // Assets + prices for ticker
  let tickerItems: Array<{ symbol: string; price: number; change24h: number | null }> = [];
  let leaderboard: Awaited<ReturnType<typeof buildLeaderboard>> = [];
  let error: string | null = null;

  const demo = await isDemoMode();
  if (demo) {
    return (
      <>
        <TickerStrip items={demoTicker()} />
        <div className="container" style={{ paddingTop: "16px", paddingBottom: "24px" }}>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span className="demo-badge">Demo · Beispieldaten</span>
            </div>
            <h1
              style={{
                fontSize: "clamp(24px, 7vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                marginBottom: "8px",
              }}
            >
              <span className="gradient-text">xStocks</span><br />
              Rangliste
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-dim)", maxWidth: "380px", lineHeight: 1.6 }}>
              Erfundene Beispiel-Wallets zur Vorführung. Im Live-Betrieb stehen hier echte,
              auf Solscan nachprüfbare Adressen.
            </p>
          </div>
          <LeaderboardClient leaderboard={demoLeaderboard()} hasHeliusKey isDemo />
        </div>
      </>
    );
  }

  const hasHeluis = !!process.env.HELIUS_API_KEY;

  try {
    const assets = await getAssetsDirect(source);

    // Prices for ticker (top 20)
    const tickerMints = assets.slice(0, 20).map((a) => a.mint);
    const priceMap = await getPricesDirect(tickerMints);
    tickerItems = assets
      .slice(0, 20)
      .map((a) => ({
        symbol: a.symbol,
        price: priceMap.get(a.mint)?.price ?? 0,
        change24h: priceMap.get(a.mint)?.change24h ?? null,
      }))
      .filter((t) => t.price > 0);

    // Leaderboard — only if Helius key is set
    if (hasHeluis) {
      leaderboard = await buildLeaderboard(source);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load data";
    console.error("[HomePage]", err);
  }

  return (
    <>
      {/* Live ticker */}
      {tickerItems.length > 0 && <TickerStrip items={tickerItems} />}

      <div className="container" style={{ paddingTop: "16px", paddingBottom: "24px" }}>
        {/* Hero header */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="badge badge-live">
                <span className="pulse-dot" style={{ width: "5px", height: "5px" }} />
                Live
              </span>
              <span className="badge badge-dim">{source === "xstocks" ? "xStocks" : "PreStocks"} · Solana Mainnet</span>
            </div>
            
            {/* Source Toggle */}
            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "2px", border: "1px solid var(--border)" }}>
              <Link 
                href="/app?source=xstocks" 
                className={`btn btn-sm ${source === "xstocks" ? "btn-primary" : ""}`}
                style={{ background: source === "xstocks" ? "var(--accent)" : "transparent", color: source === "xstocks" ? "#000" : "var(--text-muted)", border: "none" }}
              >
                xStocks
              </Link>
              <Link 
                href="/app?source=prestocks" 
                className={`btn btn-sm ${source === "prestocks" ? "btn-primary" : ""}`}
                style={{ background: source === "prestocks" ? "var(--accent)" : "transparent", color: source === "prestocks" ? "#000" : "var(--text-muted)", border: "none" }}
              >
                PreStocks
              </Link>
            </div>
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 7vw, 38px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: "8px",
            }}
          >
            <span className="gradient-text">{source === "xstocks" ? "xStocks" : "PreStocks"}</span><br />
            Rangliste
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", maxWidth: "380px", lineHeight: 1.6 }}>
            Echte Solana-Wallets mit {source === "xstocks" ? "tokenisierten US-Aktien" : "PreStocks"}.{" "}
            <span style={{ color: "var(--text)" }}>Alle Daten on-chain</span> — auf Solscan nachprüfbar.
          </p>
        </div>

        {/* No Helius key warning */}
        {!hasHeluis && !error && (
          <div className="error-box" style={{ marginBottom: "16px" }}>
            ⚠ Die Rangliste braucht einen eigenen RPC-Zugang. Kurse, Märkte und Depot-Ansicht
            laufen bereits live über den öffentlichen Solana-Knoten — nur das Auflisten aller
            Token-Halter ist dort gesperrt.
            <div style={{ marginTop: "6px", color: "var(--text-muted)" }}>
              <code style={{ color: "var(--green)" }}>HELIUS_API_KEY</code> in <code>.env.local</code>{" "}
              setzen (Free Tier auf helius.dev reicht), dann füllt sich die Rangliste.
            </div>
          </div>
        )}

        {error && (
          <div className="error-box" style={{ marginBottom: "16px" }}>⚠ {error}</div>
        )}

        <LeaderboardClient
          leaderboard={leaderboard}
          hasHeliusKey={hasHeluis}
        />
      </div>
    </>
  );
}
