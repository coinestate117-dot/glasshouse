"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

/**
 * Einstieg von der Startseite ins Portal.
 *
 * Beschriftung und Ziel richten sich nach dem Anmeldezustand. Vorher stand
 * überall fest "Wallet verbinden" und führte auf /dashboard — wer bereits
 * angemeldet war, klickte also auf "Wallet verbinden" und landete auf seiner
 * Depotübersicht. Wer nicht angemeldet war, wurde über einen Umweg auf
 * /login umgeleitet.
 */
export function PortalLink({
  className,
  loggedOutLabel = "Wallet verbinden",
}: {
  className?: string;
  loggedOutLabel?: string;
}) {
  const auth = useAuth();

  // Solange die Sitzung geprüft wird, die abgemeldete Beschriftung zeigen —
  // sie ist auch dann richtig, wenn die Prüfung fehlschlägt.
  const signedIn = Boolean(auth.user);

  return (
    <Link href={signedIn ? "/dashboard" : "/login"} className={className}>
      {signedIn ? "Zu deinem Depot" : loggedOutLabel}
    </Link>
  );
}
