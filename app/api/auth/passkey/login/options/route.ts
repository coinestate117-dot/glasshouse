import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookieOptions } from "@/lib/session";
import { getRelyingParty, CHALLENGE_COOKIE } from "@/lib/webauthn";

export const runtime = "nodejs";

/**
 * Anmeldung per Passkey. Es wird bewusst keine Adresse verlangt:
 * Der Authenticator schlägt selbst vor, welcher Passkey passt
 * (Discoverable Credential / Resident Key).
 */
export async function POST() {
  const { rpID } = await getRelyingParty();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  const res = NextResponse.json(options);
  res.cookies.set(CHALLENGE_COOKIE, options.challenge, { ...cookieOptions, maxAge: 300 });
  return res;
}
