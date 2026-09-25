import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { removePasskey } from "@/lib/users";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { credentialId } = await params;
  const ok = await removePasskey(session.address, decodeURIComponent(credentialId)).catch(() => false);

  if (!ok) return NextResponse.json({ error: "Gerät nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
