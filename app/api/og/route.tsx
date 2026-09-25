import { ImageResponse } from "next/og";
import { glasshouseMarkOG } from "@/components/GlasshouseMarkOG";

export const runtime = "edge";

function shortenAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const value = searchParams.get("value");
  const topSymbol = searchParams.get("topSymbol");
  const topPct = searchParams.get("topPct");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#000000",
          color: "#FAFAFA",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {glasshouseMarkOG(48)}
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.02em" }}>GLASSHOUSE</span>
        </div>

        {address ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ fontSize: 32, color: "rgba(250,250,250,0.55)" }}>{shortenAddress(address)}</span>
            {value && <span style={{ fontSize: 72, fontWeight: 700 }}>{value}</span>}
            {topSymbol && topPct && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 600 }}>
                <span style={{ fontSize: 22, color: "rgba(250,250,250,0.55)" }}>
                  Größte Position: {topSymbol} · {topPct}%
                </span>
                <div style={{ display: "flex", width: "100%", height: 10, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{
                      display: "flex",
                      width: `${Math.min(100, Number(topPct))}%`,
                      height: "100%",
                      borderRadius: 2,
                      background: "linear-gradient(135deg, #14F195, #9945FF)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Öffentliche On-Chain-Depots auf Solana
            </span>
            <span style={{ fontSize: 26, color: "rgba(250,250,250,0.55)" }}>
              Echte Wallets. Echte Positionen. Du entscheidest.
            </span>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
