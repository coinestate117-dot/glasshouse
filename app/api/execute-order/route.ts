import { NextRequest, NextResponse } from "next/server";
import { getUltraOrder, getUltraOrderRawAmount, USDC_MINT } from "@/lib/jupiter";

export const runtime = "nodejs";

// POST /api/execute-order
// Rumpf: { outputMint, amountUSD, taker, inputMint? }
// Liefert die unsignierte Jupiter-Ultra-Transaktion zurück. Signiert wird
// ausschliesslich in der Wallet des Nutzers.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const outputMint = typeof body?.outputMint === "string" ? body.outputMint : null;
  const amountUSD = typeof body?.amountUSD === "number" ? body.amountUSD : NaN;
  const taker = typeof body?.taker === "string" ? body.taker : null;
  const inputMint = typeof body?.inputMint === "string" ? body.inputMint : USDC_MINT;
  /** Verkaufen: Betrag in Anteilen statt in USDC. */
  const sellAmount = typeof body?.sellAmount === "number" ? body.sellAmount : null;
  const sellDecimals = typeof body?.sellDecimals === "number" ? body.sellDecimals : 8;
  const isSell = sellAmount !== null;

  if (!outputMint || outputMint.length < 32 || outputMint.length > 44) {
    return NextResponse.json({ error: "Ungültiger Ziel-Token" }, { status: 400 });
  }
  if (isSell) {
    if (!Number.isFinite(sellAmount) || sellAmount <= 0) {
      return NextResponse.json({ error: "Ungültige Menge" }, { status: 400 });
    }
  } else if (!Number.isFinite(amountUSD) || amountUSD <= 0) {
    return NextResponse.json({ error: "Ungültiger Betrag" }, { status: 400 });
  }
  // Ohne taker liefert Jupiter nur ein Angebot ohne Transaktion — der
  // Nutzer stünde dann vor einem Ablauf, der nicht zu Ende gehen kann.
  if (!taker || taker.length < 32 || taker.length > 44) {
    return NextResponse.json(
      { error: "Wallet nicht verbunden — ohne Adresse lässt sich keine Transaktion bauen" },
      { status: 400 }
    );
  }

  try {
    // Beim Verkaufen geht der Token hinein und USDC heraus; der Betrag
    // steht dann in Anteilen, nicht in USDC.
    const order = isSell
      ? await getUltraOrderRawAmount(
          inputMint,
          outputMint,
          Math.floor(sellAmount * 10 ** sellDecimals),
          taker
        )
      : await getUltraOrder(inputMint, outputMint, amountUSD, taker);

    if (!order.transaction) {
      return NextResponse.json(
        { error: "Für diesen Token gibt es gerade keinen handelbaren Weg" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      requestId: order.requestId,
      transaction: order.transaction,
      inAmount: order.inAmount,
      outAmount: order.outAmount,
      priceImpactPct: order.priceImpactPct,
    });
  } catch (err) {
    console.error("[api/execute-order]", err);
    return NextResponse.json(
      { error: "Transaktion konnte nicht vorbereitet werden" },
      { status: 502 }
    );
  }
}
