import Link from "next/link";
import { getPreIpoAssets, getPrices, getWallets } from "@/lib/data";
import { formatUsd } from "@/lib/format";
import TokenLogo from "@/components/TokenLogo";

export default function PreIpoPage() {
  const assets = getPreIpoAssets();
  const prices = getPrices();
  const wallets = getWallets();
  const priceMap = new Map(prices.map((p) => [p.mint_address, p.price_usd]));

  const stocks = assets.map((a) => {
    let holders = 0;
    let totalValue = 0;
    for (const w of wallets) {
      for (const p of w.positions) {
        if (p.mint_address === a.mint_address) {
          holders++;
          totalValue += p.value_usd;
        }
      }
    }
    return {
      symbol: a.underlying_symbol,
      name: a.name,
      assetSymbol: a.symbol,
      logoUrl: a.logo_url,
      priceUsd: priceMap.get(a.mint_address) ?? 0,
      holders,
      totalValue,
    };
  });

  stocks.sort((a, b) => b.totalValue - a.totalValue || b.priceUsd - a.priceUsd);

  return (
    <div style={{ padding: "24px 16px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        Pre-IPO on Solana
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
        Companies not yet public — who holds them
      </div>

      {stocks.map((s, i) => (
        <Link
          key={s.symbol}
          href={`/stock/${s.symbol}`}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 0", borderBottom: "1px solid var(--border)",
            opacity: 0, animation: `fadeSlideIn 0.25s cubic-bezier(0.23,1,0.32,1) ${i * 40}ms forwards`,
          }}
        >
          <TokenLogo symbol={s.assetSymbol} logoUrl={s.logoUrl} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{s.symbol}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {s.name.replace(" PreStocks", "")}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatUsd(s.priceUsd)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {s.holders > 0 ? `${s.holders} holder${s.holders !== 1 ? "s" : ""}` : "No holders yet"}
            </div>
          </div>
        </Link>
      ))}

      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 20, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
        Pre-IPO tokens represent indirect exposure through SPV structures.
        Some issuers have publicly stated these transfers are not valid.
      </div>
    </div>
  );
}
