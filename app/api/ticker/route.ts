import { NextResponse } from "next/server";
import { getAssetsDirect, getPricesDirect } from "@/lib/direct";
import { isDemoMode } from "@/lib/demo-mode";
import { demoTicker } from "@/lib/demo";

export async function GET() {
  if (await isDemoMode()) {
    return NextResponse.json(demoTicker().slice(0, 7));
  }

  try {
    const assets = await getAssetsDirect();
    const tickerMints = assets.slice(0, 7).map((a) => a.mint); // We only need 5-7 items as per prompt
    const priceMap = await getPricesDirect(tickerMints);
    
    const tickerItems = assets
      .slice(0, 7)
      .map((a) => ({
        symbol: a.symbol,
        price: priceMap.get(a.mint)?.price ?? 0,
        change24h: priceMap.get(a.mint)?.change24h ?? null,
      }))
      .filter((t) => t.price > 0);

    return NextResponse.json(tickerItems);
  } catch (err) {
    console.error("[api/ticker]", err);
    return NextResponse.json({ error: "Failed to fetch ticker" }, { status: 500 });
  }
}
