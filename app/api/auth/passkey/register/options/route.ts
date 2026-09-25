import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession, cookieOptions } from "@/lib/session";
import { getRelyingParty, CHALLENGE_COOKIE } from "@/lib/webauthn";
import { listPasskeys } from "@/lib/users";

export const runtime = "nodejs";

/** Schritt 1 der Passkey-Einrichtung — nur für bereits angemeldete Nutzer. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { rpID, rpName } = await getRelyingParty();
  const existing = await listPasskeys(session.address).catch(() => []);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: session.address,
    userDisplayName: `${session.address.slice(0, 4)}…${session.address.slice(-4)}`,
    attestationType: "none",
    // Bereits registrierte Passkeys ausschließen, damit derselbe
    // Authenticator nicht doppelt angelegt wird.
    excludeCredentials: existing.map((p) => ({ id: p.credentialId })),
    authenticatorSelection: {
      // Plattform-Authenticator = Face ID / Touch ID / Windows Hello
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });

  const res = NextResponse.json(options);
  res.cookies.set(CHALLENGE_COOKIE, options.challenge, { ...cookieOptions, maxAge: 300 });
  return res;
}
