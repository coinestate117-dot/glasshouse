import { NextRequest, NextResponse } from "next/server";
import { buildCopyOrderList } from "@/lib/jupiter";
import { getWalletDirect } from "@/lib/direct";

export const runtime = "nodejs";

// POST /api/copy-order
// Rumpf: { targetWallet: string, totalUSD: number }
// Liefert die Aufteilung zur Vorschau. Hier wird nichts signiert und
// nichts gesendet.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const targetWallet = typeof body?.targetWallet === "string" ? body.targetWallet : null;
  const totalUSD = typeof body?.totalUSD === "number" ? body.totalUSD : NaN;

  if (!targetWallet || targetWallet.length < 32 || targetWallet.length > 44) {
    return NextResponse.json({ error: "Ungültige Wallet-Adresse" }, { status: 400 });
  }
  if (!Number.isFinite(totalUSD) || totalUSD < 1 || totalUSD > 100_000) {
    return NextResponse.json(
      { error: "Betrag muss zwischen 1 und 100 000 USDC liegen" },
      { status: 400 }
    );
  }

  try {
    // Bewusst getWalletDirect: liest direkt von der Chain und kommt ohne
    // Helius-Schlüssel und ohne Supabase aus. Das frühere getPortfolio
    // verlangte beides und warf hier ohne Konfiguration eine Ausnahme.
    const portfolio = await getWalletDirect(targetWallet);

    if (portfolio.holdings.length === 0) {
      return NextResponse.json(
        { error: "Diese Wallet hält aktuell keine xStocks" },
        { status: 404 }
      );
    }

    const orders = await buildCopyOrderList(
      portfolio.holdings.map((h) => ({
        mint: h.mint,
        symbol: h.symbol,
        weight: h.weight ?? 0,
      })),
      totalUSD
    );

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Alle Positionen dieser Wallet sind zu klein zum Nachbauen" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      targetWallet,
      totalUSD,
      orders,
      orderCount: orders.length,
      disclaimer:
        "Öffentliche On-Chain-Daten. Du entscheidest, ob und was du davon übernimmst.",
    });
  } catch (err) {
    console.error("[api/copy-order]", err);
    return NextResponse.json(
      { error: "Depot konnte nicht gelesen werden" },
      { status: 500 }
    );
  }
}
