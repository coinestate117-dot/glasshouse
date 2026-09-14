import { ImageResponse } from "@vercel/og";
import { getWallet, getWallets } from "@/lib/data";

export const runtime = "nodejs";

const PALETTE = [
  "#14F195", "#9945FF", "#FF4D4D", "#00C2FF", "#FFD93D", "#4ECDC4",
];

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function shortenAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return new Response("Missing address", { status: 400 });
  }

  const wallet = getWallet(address);
  if (!wallet) {
    return new Response("Wallet not found", { status: 404 });
  }

  // Compute rank
  const allWallets = getWallets()
    .filter((w) => w.total_value_usd >= 10_000)
    .sort((a, b) => b.total_value_usd - a.total_value_usd);
  const rank = allWallets.findIndex((w) => w.address === address) + 1;

  const positions = wallet.positions.sort(
    (a, b) => b.value_usd - a.value_usd
  );
  const top3 = positions.slice(0, 3);
  const top6 = positions.slice(0, 6);
  const otherPct = positions.slice(6).reduce((s, p) => s + p.pct, 0);
  const isPositive = wallet.change_24h_pct >= 0;

  const totalFormatted = wallet.total_value_usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
          padding: "48px 56px",
        }}
      >
        {/* Header: address + rank */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: "-0.01em",
              }}
            >
              {shortenAddr(address)}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#8A8A93",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  background: "#1C1C21",
                  padding: "2px 10px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#14F195",
                }}
              >
                {wallet.wallet_type}
              </span>
            </div>
          </div>
          {rank > 0 && (
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#8A8A93",
              }}
            >
              #{rank}
            </div>
          )}
        </div>

        {/* Portfolio value + change */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {totalFormatted}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: isPositive ? "#14F195" : "#FF4D4D",
            }}
          >
            {formatPct(wallet.change_24h_pct)}
          </span>
          <span style={{ fontSize: 16, color: "#8A8A93" }}>Past 24h</span>
        </div>

        {/* Allocation bar */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 12,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 28,
          }}
        >
          {top6.map((p, i) => (
            <div
              key={p.asset_symbol}
              style={{
                width: `${p.pct}%`,
                height: "100%",
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          ))}
          {otherPct > 0 && (
            <div
              style={{
                width: `${otherPct}%`,
                height: "100%",
                backgroundColor: "#1C1C21",
              }}
            />
          )}
        </div>

        {/* Top 3 positions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {top3.map((p, i) => (
            <div
              key={p.asset_symbol}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 22,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#8A8A93",
                  width: 28,
                }}
              >
                {i + 1}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: PALETTE[i % PALETTE.length],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#000",
                }}
              >
                {p.underlying_symbol.slice(0, 3)}
              </div>
              <span style={{ fontWeight: 600 }}>{p.underlying_symbol}</span>
              <span style={{ color: "#8A8A93", marginLeft: "auto" }}>
                {formatUsd(p.value_usd)}
              </span>
              <span style={{ color: "#8A8A93", fontSize: 16 }}>
                {p.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Footer with gradient */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 20,
            borderTop: "1px solid #1C1C21",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              background: "linear-gradient(135deg, #9945FF, #14F195)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            glasshouse
          </div>
          <div style={{ fontSize: 16, color: "#8A8A93" }}>
            glasshouse.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
