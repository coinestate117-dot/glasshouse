import { headers } from "next/headers";

/**
 * Relying-Party-Angaben für WebAuthn.
 * rpID ist der reine Hostname (ohne Port), origin muss exakt dem
 * Browser-Origin entsprechen — sonst lehnt die Prüfung ab.
 */
export async function getRelyingParty(): Promise<{ rpID: string; origin: string; rpName: string }> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3002";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    rpID: host.split(":")[0],
    origin: `${proto}://${host}`,
    rpName: "Glasshouse",
  };
}

export const CHALLENGE_COOKIE = "gh_webauthn_challenge";
