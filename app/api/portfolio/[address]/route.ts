import { NextRequest, NextResponse } from "next/server";
import { getWalletDirect } from "@/lib/direct";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address || address.length < 32 || address.length > 44) {
    return NextResponse.json({ error: "Ungültige Wallet-Adresse" }, { status: 400 });
  }

  try {
    const data = await getWalletDirect(address);
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[api/portfolio/${address}]`, err);
    return NextResponse.json({ error: "Depot konnte nicht geladen werden" }, { status: 500 });
  }
}
