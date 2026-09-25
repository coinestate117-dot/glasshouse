import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWalletDirect, getUsdcBalance } from "@/lib/direct";
import { isDemoMode } from "@/lib/demo-mode";
import { DEMO_OWN_WALLET, demoActivity, demoAuthUser } from "@/lib/demo";

export const runtime = "nodejs";

/**
 * Kontoübersicht für die angemeldete Sitzung: Depotwert, Tagesveränderung,
 * grösste Position. Speist das Kontomenü in der Kopfzeile.
 *
 * Handelsaktivität wird nur im Demo-Modus mitgeliefert — live fehlt dafür
 * die Datengrundlage, und geschätzte Zahlen wären hier irreführend.
 */
export async function GET() {
  if (await isDemoMode()) {
    const w = DEMO_OWN_WALLET;
    return NextResponse.json({
      demo: true,
      address: w.address,
      total_value: w.total_value,
      change_24h_pct: w.change_24h_pct,
      position_count: w.holdings.length,
      usdc_balance: 2500,
      // mint und Menge werden zum Verkaufen gebraucht.
      holdings: w.holdings.map((h) => ({
        mint: h.mint,
        symbol: h.symbol,
        weight: h.weight,
        value_usd: h.value_usd,
        ui_amount: h.ui_amount,
      })),
      account: {
        createdAt: demoAuthUser().createdAt,
        signedInAt: demoAuthUser().signedInAt,
        passkeyCount: demoAuthUser().passkeyCount,
      },
      activity: demoActivity(),
    });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const [data, usdc] = await Promise.all([
      getWalletDirect(session.address),
      getUsdcBalance(session.address),
    ]);
    return NextResponse.json({
      demo: false,
      address: session.address,
      total_value: data.total_value,
      change_24h_pct: data.change_24h_pct,
      position_count: data.holdings.length,
      usdc_balance: usdc,
      holdings: data.holdings.map((h) => ({
        mint: h.mint,
        symbol: h.symbol,
        weight: h.weight,
        value_usd: h.value_usd,
        ui_amount: h.ui_amount,
      })),
      account: {
        createdAt: null,
        signedInAt: new Date(session.iat * 1000).toISOString(),
        passkeyCount: 0,
      },
      // Live bewusst null: keine erfundene Historie.
      activity: null,
    });
  } catch (err) {
    console.error("[api/account/summary]", err);
    return NextResponse.json({ error: "Depot konnte nicht gelesen werden" }, { status: 502 });
  }
}
