import { NextRequest, NextResponse } from "next/server";
import { syncWalletHoldings } from "@/lib/portfolio";
import { getActiveWallets } from "@/lib/wallets";

export const runtime = "nodejs";

// POST /api/refresh — triggered by Vercel Cron or manual call
// Requires a secret to prevent abuse
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.REFRESH_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { wallet } = body as { wallet?: string };

  try {
    if (wallet) {
      // Refresh single wallet
      const holdings = await syncWalletHoldings(wallet);
      return NextResponse.json({ wallet, holdings: holdings.length, ok: true });
    }

    // Refresh all wallets (batch, sequential with small delay)
    const wallets = await getActiveWallets();
    const results: Array<{ wallet: string; ok: boolean; error?: string }> = [];

    for (const addr of wallets) {
      try {
        await syncWalletHoldings(addr);
        results.push({ wallet: addr, ok: true });
        await new Promise((r) => setTimeout(r, 500)); // rate limit
      } catch (err) {
        results.push({ wallet: addr, ok: false, error: String(err) });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return NextResponse.json({
      total: wallets.length,
      succeeded,
      failed: wallets.length - succeeded,
      results,
    });
  } catch (err) {
    console.error("[api/refresh]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
