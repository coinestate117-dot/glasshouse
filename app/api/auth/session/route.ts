import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUser, isPersistent } from "@/lib/users";
import { isDemoMode } from "@/lib/demo-mode";
import { demoAuthUser } from "@/lib/demo";

export const runtime = "nodejs";

export async function GET() {
  // Im Demo-Modus gilt das Demo-Konto als angemeldet. Das ist die einzige
  // Stelle, an der das entschieden wird — so verhält sich die gesamte
  // Oberfläche im Demo genau wie im Live-Betrieb, statt halb abgemeldet
  // auszusehen.
  if (await isDemoMode()) {
    return NextResponse.json({
      user: demoAuthUser(),
      persistent: true,
      demo: true,
    });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ user: null, persistent: isPersistent() });

  const user = await getUser(session.address).catch(() => null);

  return NextResponse.json({
    user: {
      address: session.address,
      createdAt: user?.createdAt ?? null,
      lastSeenAt: user?.lastSeenAt ?? null,
      signedInAt: new Date(session.iat * 1000).toISOString(),
      passkeyCount: user?.passkeys.length ?? 0,
      // Öffentliche Schlüssel werden bewusst nicht ausgeliefert.
      passkeys: (user?.passkeys ?? []).map((p) => ({
        id: p.credentialId,
        createdAt: p.createdAt ?? null,
        transports: p.transports ?? [],
      })),
    },
    persistent: isPersistent(),
    demo: false,
  });
}
