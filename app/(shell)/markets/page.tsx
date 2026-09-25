import { getAssetsDirect, getPricesDirect } from "@/lib/direct";
import { MarketsClient } from "./MarketsClient";

export const revalidate = 30;

export const metadata = {
  title: "Märkte — xStocks-Kurse · Glasshouse",
  description: "Live-Kurse aller tokenisierten US-Aktien (xStocks) auf Solana.",
};

export default async function MarketsPage() {
  let markets: Array<{
    symbol: string;
    name: string | null;
    mint: string;
    price: number;
    change24h: number | null;
    logoUrl: string | null;
  }> = [];
  let error: string | null = null;
  let hidden = 0;

  // Kurse sind immer echt — auch im Demo-Modus. Erfunden sind dort nur
  // Depots, Wallets und Ranglisten. Vorher standen hier Demo-Kurse, was
  // dem Hinweisbanner widersprach und neben den echten Charts auffiel.
  {
  try {
    const assets = await getAssetsDirect();
    const mints = assets.map((a) => a.mint);
    const prices = await getPricesDirect(mints);

    const all = assets.map((a) => {
      const q = prices.get(a.mint);
      return {
        symbol: a.symbol,
        name: a.name,
        mint: a.mint,
        price: q?.price ?? 0,
        change24h: q?.change24h ?? null,
        logoUrl: a.logo_url,
        tradable: q?.tradable ?? false,
      };
    });

    // Titel ohne belastbaren Kurs werden nicht als Markt ausgegeben.
    // Sie stammen aus Pools ohne Tiefe; ihr "Kurs" hat mit dem Wert des
    // Titels nichts zu tun (siehe isTradableQuote in lib/direct).
    markets = all.filter((m) => m.tradable).sort((a, b) => b.price - a.price);
    hidden = all.filter((m) => m.price > 0 && !m.tradable).length;
  } catch (err) {
    error = err instanceof Error ? err.message : "Märkte konnten nicht geladen werden";
  }
  }

  return (
    <div className="container" style={{ paddingTop: "16px", paddingBottom: "24px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "clamp(22px, 6vw, 32px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "4px",
          }}
        >
          <span className="gradient-text">xStocks</span> Märkte
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Tokenisierte US-Aktien auf Solana Mainnet
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: "12px" }}>⚠ {error}</div>}

      <MarketsClient markets={markets} />

      {hidden > 0 && (
        <p
          style={{
            marginTop: "14px",
            fontSize: "11.5px",
            lineHeight: 1.6,
            color: "var(--text-muted)",
          }}
        >
          {hidden} {hidden === 1 ? "weiterer Titel wird" : "weitere Titel werden"} nicht
          angezeigt: Die zugehörigen Pools haben zu wenig Tiefe, um einen belastbaren Kurs zu
          stellen. Angezeigt werden nur Titel, deren Kurs sich gegen die zugrunde liegende Aktie
          plausibilisieren lässt.
        </p>
      )}
    </div>
  );
}
