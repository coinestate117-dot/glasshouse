import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    { count: assetCount },
    { count: walletCount },
    { data: topWallets },
    { count: positionCount },
    { count: priceCount },
  ] = await Promise.all([
    supabase.from("gh_assets").select("*", { count: "exact", head: true }),
    supabase.from("gh_wallets").select("*", { count: "exact", head: true }),
    supabase
      .from("gh_wallets")
      .select("address, total_value_usd, change_24h_pct, position_count")
      .gt("total_value_usd", 0)
      .order("total_value_usd", { ascending: false })
      .limit(20),
    supabase.from("gh_positions").select("*", { count: "exact", head: true }),
    supabase.from("gh_prices").select("*", { count: "exact", head: true }),
  ]);

  return {
    assetCount: assetCount ?? 0,
    walletCount: walletCount ?? 0,
    positionCount: positionCount ?? 0,
    priceCount: priceCount ?? 0,
    topWallets: topWallets ?? [],
  };
}

export default async function DebugPage() {
  const data = await getData();

  return (
    <div style={{ fontFamily: "monospace", padding: 24, color: "#fff", background: "#000", minHeight: "100vh" }}>
      <h1>Glasshouse — Debug</h1>
      <p>Assets: {data.assetCount}</p>
      <p>Wallets: {data.walletCount}</p>
      <p>Positions: {data.positionCount}</p>
      <p>Prices: {data.priceCount}</p>

      <h2>Top Wallets by Portfolio Value</h2>
      {data.topWallets.length === 0 ? (
        <p style={{ color: "#888" }}>
          No data yet. POST to /api/sync to populate.
        </p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #333", textAlign: "left" }}>
              <th style={{ padding: "4px 12px" }}>#</th>
              <th style={{ padding: "4px 12px" }}>Wallet</th>
              <th style={{ padding: "4px 12px" }}>Value (USD)</th>
              <th style={{ padding: "4px 12px" }}>24h %</th>
              <th style={{ padding: "4px 12px" }}>Positions</th>
            </tr>
          </thead>
          <tbody>
            {data.topWallets.map(
              (w: { address: string; total_value_usd: number; change_24h_pct: number; position_count: number }, i: number) => (
                <tr key={w.address} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "4px 12px" }}>{i + 1}</td>
                  <td style={{ padding: "4px 12px" }}>
                    {w.address.slice(0, 4)}...{w.address.slice(-4)}
                  </td>
                  <td style={{ padding: "4px 12px" }}>
                    ${w.total_value_usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    style={{
                      padding: "4px 12px",
                      color: w.change_24h_pct >= 0 ? "#14F195" : "#FF4D4D",
                    }}
                  >
                    {w.change_24h_pct >= 0 ? "+" : ""}
                    {w.change_24h_pct.toFixed(2)}%
                  </td>
                  <td style={{ padding: "4px 12px" }}>{w.position_count}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 24, color: "#555" }}>
        Run: curl -X POST http://localhost:3000/api/sync
      </p>
    </div>
  );
}
