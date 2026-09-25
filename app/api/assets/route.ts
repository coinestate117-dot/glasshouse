import { NextResponse } from "next/server";
import { getAssetsDirect } from "@/lib/direct";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await getAssetsDirect();
    return NextResponse.json({ assets, count: assets.length });
  } catch (err) {
    console.error("[api/assets]", err);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

// POST /api/assets — force sync from xstocks.fi
export async function POST() {
  try {
    const assets = await getAssetsDirect();
    return NextResponse.json({ assets, count: assets.length, synced: true });
  } catch (err) {
    console.error("[api/assets] sync failed", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
