import { NextResponse } from "next/server";
import { getMarketRows } from "@/lib/markets";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  try {
    const rows = await getMarketRows(60);
    return NextResponse.json({ rows, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[api/markets/live]", err);
    return NextResponse.json({ error: "Märkte nicht abrufbar" }, { status: 502 });
  }
}
