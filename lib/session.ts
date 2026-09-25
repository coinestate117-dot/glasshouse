import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "gh_session";
export const NONCE_COOKIE = "gh_nonce";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 Tage

export type Session = {
  /** Solana-Adresse (Base58) — die Identität des Nutzers. */
  address: string;
  /** Ausgestellt (Unix-Sekunden). */
  iat: number;
};

/**
 * Sitzungsgeheimnis. In Produktion MUSS AUTH_SECRET gesetzt sein — sonst
 * wird pro Serverstart ein zufälliges erzeugt und alle Sitzungen brechen
 * beim Neustart ab (für lokale Entwicklung in Ordnung).
 */
let devSecret: string | null = null;
function secret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  if (!devSecret) devSecret = randomBytes(32).toString("hex");
  return devSecret;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest());
}

export function encodeSession(session: Session): string {
  const payload = b64url(Buffer.from(JSON.stringify(session)));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  // Längen zuerst prüfen — timingSafeEqual wirft bei ungleicher Länge.
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!parsed.address || typeof parsed.iat !== "number") return null;
    if (Date.now() / 1000 - parsed.iat > MAX_AGE_SECONDS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Aktuelle Sitzung serverseitig lesen. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Serverseitig verbrauchte Nonces. Ohne das wäre eine einmal abgefangene
 * Signatur samt Cookie beliebig oft wiederverwendbar — der Cookie allein
 * ist kein Verbrauchsnachweis, weil der Client ihn kontrolliert.
 *
 * Hinweis: prozesslokal. Bei mehreren Instanzen gehört das in Redis oder
 * die Datenbank, sonst greift der Schutz nur pro Instanz.
 */
const usedNonces = new Map<string, number>();
const NONCE_TTL_MS = 5 * 60 * 1000;

export function consumeNonce(nonce: string): boolean {
  const now = Date.now();

  // Abgelaufene Einträge aufräumen, damit die Map nicht wächst.
  for (const [key, ts] of usedNonces) {
    if (now - ts > NONCE_TTL_MS) usedNonces.delete(key);
  }

  if (usedNonces.has(nonce)) return false;
  usedNonces.set(nonce, now);
  return true;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export const nonceCookieOptions = {
  ...cookieOptions,
  maxAge: 300, // 5 Minuten
};
