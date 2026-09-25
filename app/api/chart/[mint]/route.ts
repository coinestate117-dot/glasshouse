import { NextRequest, NextResponse } from "next/server";
import { getCandles, demoCandles, isChartRange, type ChartRange } from "@/lib/charts";
import { isDemoMode } from "@/lib/demo-mode";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "1W";
  const range: ChartRange = isChartRange(rangeParam) ? rangeParam : "1W";

  if (!mint || mint.length < 32 || mint.length > 44) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  // Die Demo-Grenze verläuft bei den Wallets, nicht bei den Märkten:
  // Depots, Ranglisten und Trades sind im Demo-Modus erfunden, Kurse sind
  // immer echt. Eine Demo-Kurve gibt es daher nur für die Demo-Mints —
  // sonst stünde ein erfundener Verlauf neben dem echten Tagespreis
  // desselben Tokens.
  if (mint.startsWith("Demo") && (await isDemoMode())) {
    const symbol = req.nextUrl.searchParams.get("symbol") ?? mint.slice(0, 6);
    const last = Number(req.nextUrl.searchParams.get("last")) || 100;
    return NextResponse.json({ ...demoCandles(symbol, range, last), demo: true });
  }

  try {
    const result = await getCandles(mint, range);
    return NextResponse.json({ ...result, demo: false });
  } catch (err) {
    console.error(`[api/chart/${mint}]`, err);
    return NextResponse.json({ error: "Kursverlauf nicht verfügbar" }, { status: 502 });
  }
}
