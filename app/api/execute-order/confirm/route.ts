import { NextRequest, NextResponse } from "next/server";
import { executeUltraOrder } from "@/lib/jupiter";

export const runtime = "nodejs";

// POST /api/execute-order/confirm
// Rumpf: { requestId, signedTransaction }
// Reicht die bereits vom Nutzer signierte Transaktion an Jupiter weiter.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const requestId = typeof body?.requestId === "string" ? body.requestId : null;
  const signedTransaction =
    typeof body?.signedTransaction === "string" ? body.signedTransaction : null;

  if (!requestId || !signedTransaction) {
    return NextResponse.json(
      { error: "requestId oder signierte Transaktion fehlt" },
      { status: 400 }
    );
  }

  try {
    const result = await executeUltraOrder(requestId, signedTransaction);
    // txid bleibt als Feldname erhalten, damit bestehende Aufrufer weiter
    // funktionieren; signature ist der Name aus der Jupiter-Antwort.
    return NextResponse.json({ txid: result.signature, ...result });
  } catch (err) {
    console.error("[api/execute-order/confirm]", err);
    const msg = err instanceof Error ? err.message : "Tausch fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
