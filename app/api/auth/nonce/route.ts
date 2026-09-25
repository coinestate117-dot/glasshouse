import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { NONCE_COOKIE, nonceCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

/** Einmal-Nonce für die Anmeldenachricht. Verhindert Replay alter Signaturen. */
export async function GET() {
  const nonce = randomBytes(16).toString("hex");

  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE, nonce, nonceCookieOptions);
  return res;
}
