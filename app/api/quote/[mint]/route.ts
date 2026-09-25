import { NextRequest, NextResponse } from "next/server";
import { getUltraOrder, USDC_MINT } from "@/lib/jupiter";

export const runtime = "nodejs";

/**
 * Echte Kauf- und Verkaufskurse für einen Titel.
 *
 * Jupiter liefert keinen Geld-/Briefkurs, sondern Routen. Deshalb wird hier
 * zweimal ein Angebot über eine Referenzgrösse eingeholt — einmal USDC in
 * den Token, einmal zurück. Die Differenz ist der tatsächliche Spread
 * inklusive Kurseinfluss, kein geschätzter Aufschlag.
 *
 * Ohne `taker` baut Jupiter keine Transaktion, es ist also nur eine Anfrage
 * und kostet nichts. Deshalb gilt das auch im Demo-Modus: Kurse sind dort
 * echt, erfunden sind nur Depots, Wallets und Ranglisten.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  const decimals = Number(req.nextUrl.searchParams.get("decimals")) || 8;
  const refUsd = Number(req.nextUrl.searchParams.get("size")) || 100;

  if (!mint || mint.length < 32 || mint.length > 44) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  try {
    // Kaufseite: refUsd USDC hinein, wie viele Anteile kommen heraus?
    const buyOrder = await getUltraOrder(USDC_MINT, mint, refUsd);
    const tokensOut = Number(buyOrder.outAmount) / 10 ** decimals;
    if (!(tokensOut > 0)) throw new Error("Keine Kaufroute");
    const buy = refUsd / tokensOut;

    // Verkaufsseite: dieselbe Menge Anteile zurück in USDC.
    const rawTokens = Math.floor(tokensOut * 10 ** decimals);
    const sellOrder = await getUltraOrderRaw(mint, USDC_MINT, rawTokens);
    const usdcOut = Number(sellOrder.outAmount) / 1e6;
    const sell = usdcOut > 0 ? usdcOut / tokensOut : null;

    const spreadPct = sell !== null && buy > 0 ? ((buy - sell) / buy) * 100 : null;

    return NextResponse.json({ demo: false, buy, sell, spreadPct, refUsd });
  } catch (err) {
    console.error(`[api/quote/${mint}]`, err);
    return NextResponse.json({ error: "Kurse nicht abrufbar" }, { status: 502 });
  }
}

/** Wie getUltraOrder, aber mit bereits in kleinster Einheit gegebenem Betrag. */
async function getUltraOrderRaw(inputMint: string, outputMint: string, rawAmount: number) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(rawAmount),
  });
  const res = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Jupiter Ultra /order: ${res.status}`);
  return (await res.json()) as { outAmount: string };
}
