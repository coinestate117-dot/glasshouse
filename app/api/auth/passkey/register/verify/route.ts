import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getSession, cookieOptions } from "@/lib/session";
import { getRelyingParty, CHALLENGE_COOKIE } from "@/lib/webauthn";
import { addPasskey, isPersistent } from "@/lib/users";

export const runtime = "nodejs";

/** Schritt 2 der Passkey-Einrichtung: Antwort des Authenticators prüfen und ablegen. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const expectedChallenge = req.cookies.get(CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Vorgang abgelaufen — bitte erneut versuchen" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const { rpID, origin } = await getRelyingParty();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prüfung fehlgeschlagen" },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey konnte nicht bestätigt werden" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  try {
    await addPasskey(session.address, {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports,
    });
  } catch (err) {
    console.error("[passkey/register] Speichern fehlgeschlagen:", err);
    return NextResponse.json({ error: "Passkey konnte nicht gespeichert werden" }, { status: 500 });
  }

  const res = NextResponse.json({ verified: true, persistent: isPersistent() });
  res.cookies.set(CHALLENGE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
