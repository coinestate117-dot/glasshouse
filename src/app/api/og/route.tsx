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

/* Simple in-memory rate limit: 30 requests per IP per minute.
   Per-instance in serverless — imperfect but blocks basic abuse
   without external storage. */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Prune old entries opportunistically
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) {
        if (now > v.resetAt) rateBuckets.delete(k);
      }
    }
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || address.length < 32 || address.length > 44) {
    return new Response("Missing or invalid address", { status: 400 });
  }

  const wallet = getWallet(address);
  if (!wallet) return new Response("Wallet not found", { status: 404 });

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
          padding: 0,
          position: "relative",
        }}
      >
        {/* Green border glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "2px solid #14F195",
            borderRadius: 20,
            boxShadow: "0 0 40px rgba(20,241,149,0.15), 0 0 80px rgba(20,241,149,0.05)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "44px 52px 0",
            flex: 1,
          }}
        >
          {/* Head: address + badge + rank */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                {shortenAddr(address)}
              </div>
              <div style={{ display: "flex", marginTop: 8 }}>
                <span
                  style={{
                    background: "#1C1C21",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#14F195",
                  }}
                >
                  {wallet.wallet_type}
                </span>
              </div>
            </div>
            {rank > 0 && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span style={{ fontSize: 20, color: "#8A8A93", fontWeight: 400 }}>#</span>
                <span style={{ fontSize: 48, fontWeight: 700, color: "#FFFFFF" }}>{rank}</span>
              </div>
            )}
          </div>

          {/* Value + 24h change side by side */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {totalFormatted}
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: isPositive ? "#14F195" : "#FF4D4D",
                lineHeight: 1,
              }}
            >
              {formatPct(wallet.change_24h_pct)}
            </div>
          </div>
          <div style={{ fontSize: 14, color: "#8A8A93", marginBottom: 24 }}>
            Past 24h
          </div>

          {/* Allocation bar */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
              marginBottom: 16,
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

          {/* Dashed separator */}
          <div
            style={{
              borderTop: "1px dashed #2A2A33",
              marginBottom: 20,
              display: "flex",
            }}
          />

          {/* Top 3 positions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                <span style={{ fontSize: 16, fontWeight: 600, color: "#8A8A93", width: 24 }}>
                  {i + 1}.
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: PALETTE[i % PALETTE.length],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
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
                  ({p.pct.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with gradient bar */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 52px",
            background: "linear-gradient(135deg, #9945FF, #14F195)",
            borderRadius: "0 0 18px 18px",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>
            glasshouse
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              see the whole market
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
              glasshouse.app
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // s-maxage makes Vercel's CDN cache the response (max-age alone
        // is only honored by browsers, hence the previous 100% MISS rate)
        "Cache-Control":
          "public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
