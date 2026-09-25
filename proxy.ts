import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Portal-Gate.
 *
 * Alles unter den unten gelisteten Pfaden ist nur mit Sitzung (oder im
 * Demo-Modus) erreichbar. Ohne beides geht es auf /login, inklusive
 * Rücksprungziel.
 *
 * WICHTIG: Hier wird nur geprüft, OB ein Sitzungs-Cookie vorhanden ist —
 * nicht, ob es gültig ist. Das ist reine Routing-Bequemlichkeit. Die
 * kryptografische Prüfung passiert weiterhin serverseitig in den Routen
 * und API-Handlern (lib/session.ts → decodeSession). Ein gefälschtes
 * Cookie kommt also durch dieses Gate, aber nirgends an Daten.
 */

const PORTAL_PREFIXES = [
  "/app",
  "/dashboard",
  "/konto",
  "/markets",
  "/wallet",
  "/search",
  "/compare",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPortal = PORTAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isPortal) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get("gh_session")?.value);
  const isDemo = request.cookies.get("gh_demo")?.value === "1";

  if (hasSession || isDemo) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Statische Dateien, Bilder und API-Routen bleiben außen vor — sonst
  // blockiert das Gate CSS/JS oder die Auth-Endpunkte selbst.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.svg).*)"],
};
