import { NextRequest, NextResponse } from "next/server";
import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";
import {
  NONCE_COOKIE,
  SESSION_COOKIE,
  consumeNonce,
  cookieOptions,
  encodeSession,
} from "@/lib/session";
import { buildSignInMessage } from "@/lib/siws";
import { upsertUser, isPersistent } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const address = body?.address as string | undefined;
  const signature = body?.signature as string | undefined;

  if (!address || !signature) {
    return NextResponse.json({ error: "Adresse und Signatur erforderlich" }, { status: 400 });
  }

  const nonce = req.cookies.get(NONCE_COOKIE)?.value;
  if (!nonce) {
    return NextResponse.json(
      { error: "Anmeldung abgelaufen — bitte erneut versuchen" },
      { status: 400 }
    );
  }

  // Nonce serverseitig entwerten — jede darf genau einmal gelten.
  if (!consumeNonce(nonce)) {
    return NextResponse.json(
      { error: "Diese Anmeldung wurde bereits verwendet — bitte erneut versuchen" },
      { status: 401 }
    );
  }

  // Die Nachricht wird serverseitig neu gebaut. Was der Client geschickt
  // hat, ist irrelevant — nur diese Fassung wird geprüft.
  const domain = req.headers.get("host") ?? "glasshouse";
  const message = buildSignInMessage({ domain, address, nonce });

  let ok = false;
  try {
    ok = ed25519.verify(
      bs58.decode(signature),
      new TextEncoder().encode(message),
      bs58.decode(address)
    );
  } catch {
    ok = false;
  }

  if (!ok) {
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 401 });
  }

  let persisted = isPersistent();
  let isNew = false;
  try {
    const result = await upsertUser(address);
    isNew = result.isNew;
  } catch (err) {
    console.error("[auth/verify] Nutzer konnte nicht gespeichert werden:", err);
    persisted = false;
  }

  const res = NextResponse.json({ address, persisted, isNew });
  res.cookies.set(SESSION_COOKIE, encodeSession({ address, iat: Math.floor(Date.now() / 1000) }), cookieOptions);
  // Nonce ist verbraucht.
  res.cookies.set(NONCE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
