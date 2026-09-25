import { NextRequest, NextResponse } from "next/server";
import { getPortfolio, getWalletTradeHistory } from "@/lib/portfolio";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  // Basic validation
  if (!address || address.length < 32 || address.length > 44) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const [portfolio, trades] = await Promise.all([
      getPortfolio(address),
      getWalletTradeHistory(address),
    ]);

    return NextResponse.json({ portfolio, trades });
  } catch (err) {
    console.error(`[api/wallet/${address}]`, err);
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 });
  }
}
