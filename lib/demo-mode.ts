import { cookies } from "next/headers";
import { DEMO_COOKIE } from "./demo";

/** Server-seitig: Läuft die Anfrage im Demo-Modus? */
export async function isDemoMode(): Promise<boolean> {
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === "1";
}
