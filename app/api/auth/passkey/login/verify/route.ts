import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
  SESSION_COOKIE,
  cookieOptions,
  encodeSession,
} from "@/lib/session";
import { getRelyingParty, CHALLENGE_COOKIE } from "@/lib/webauthn";
import { findAddressByCredential, listPasskeys, updatePasskeyCounter } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const expectedChallenge = req.cookies.get(CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Vorgang abgelaufen — bitte erneut versuchen" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const credentialId = body?.id as string | undefined;
  if (!body || !credentialId) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const address = await findAddressByCredential(credentialId).catch(() => null);
  if (!address) {
    return NextResponse.json(
      { error: "Dieser Passkey ist hier nicht hinterlegt — bitte einmal mit Wallet anmelden" },
      { status: 404 }
    );
  }

  const stored = (await listPasskeys(address)).find((p) => p.credentialId === credentialId);
  if (!stored) {
    return NextResponse.json({ error: "Passkey nicht gefunden" }, { status: 404 });
  }

  const { rpID, origin } = await getRelyingParty();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
        counter: stored.counter,
        transports: stored.transports as never,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prüfung fehlgeschlagen" },
      { status: 401 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey konnte nicht bestätigt werden" }, { status: 401 });
  }

  // Zähler fortschreiben — schützt gegen geklonte Authenticator.
  await updatePasskeyCounter(credentialId, verification.authenticationInfo.newCounter).catch(() => {});

  const res = NextResponse.json({ address });
  res.cookies.set(SESSION_COOKIE, encodeSession({ address, iat: Math.floor(Date.now() / 1000) }), cookieOptions);
  res.cookies.set(CHALLENGE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
