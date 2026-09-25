import { createClient } from "@supabase/supabase-js";

/**
 * Nutzer- und Passkey-Speicher.
 *
 * Mit gesetzten Supabase-Keys wird dauerhaft gespeichert (Tabellen siehe
 * supabase/migrations/003_auth.sql). Ohne Keys läuft alles im
 * Prozessspeicher: Anmeldung funktioniert, überlebt aber keinen
 * Server-Neustart. `isPersistent()` sagt, welcher Fall aktiv ist.
 */

export type StoredPasskey = {
  credentialId: string;
  publicKey: string; // base64url
  counter: number;
  transports?: string[];
  createdAt?: string;
};

export type StoredUser = {
  address: string;
  displayName: string | null;
  createdAt: string;
  lastSeenAt: string;
  passkeys: StoredPasskey[];
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isPersistent(): boolean {
  return Boolean(url && serviceKey);
}

function db() {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/* ---------- In-Memory-Fallback ---------- */
const memory = new Map<string, StoredUser>();

/* ---------- API ---------- */

/** `isNew` sagt, ob das Konto bei diesem Aufruf erst entstanden ist. */
export async function upsertUser(address: string): Promise<{ user: StoredUser; isNew: boolean }> {
  const now = new Date().toISOString();
  const client = db();

  if (!client) {
    const existing = memory.get(address);
    const user: StoredUser = existing
      ? { ...existing, lastSeenAt: now }
      : { address, displayName: null, createdAt: now, lastSeenAt: now, passkeys: [] };
    memory.set(address, user);
    return { user, isNew: !existing };
  }

  // Vorher nachsehen, sonst lässt sich "neu" nicht von "wieder da" trennen.
  const { data: before } = await client
    .from("app_users")
    .select("address")
    .eq("address", address)
    .maybeSingle();

  const { data, error } = await client
    .from("app_users")
    .upsert({ address, last_seen_at: now }, { onConflict: "address" })
    .select("address, display_name, created_at, last_seen_at")
    .single();

  if (error) throw new Error(error.message);

  const passkeys = await listPasskeys(address);
  return {
    user: {
      address: data.address,
      displayName: data.display_name,
      createdAt: data.created_at,
      lastSeenAt: data.last_seen_at,
      passkeys,
    },
    isNew: !before,
  };
}

export async function getUser(address: string): Promise<StoredUser | null> {
  const client = db();
  if (!client) return memory.get(address) ?? null;

  const { data, error } = await client
    .from("app_users")
    .select("address, display_name, created_at, last_seen_at")
    .eq("address", address)
    .maybeSingle();

  if (error || !data) return null;

  return {
    address: data.address,
    displayName: data.display_name,
    createdAt: data.created_at,
    lastSeenAt: data.last_seen_at,
    passkeys: await listPasskeys(address),
  };
}

export async function listPasskeys(address: string): Promise<StoredPasskey[]> {
  const client = db();
  if (!client) return memory.get(address)?.passkeys ?? [];

  const { data, error } = await client
    .from("app_passkeys")
    .select("credential_id, public_key, counter, transports, created_at")
    .eq("address", address)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((r) => ({
    credentialId: r.credential_id,
    publicKey: r.public_key,
    counter: r.counter,
    transports: r.transports ?? undefined,
    createdAt: r.created_at ?? undefined,
  }));
}

export async function addPasskey(address: string, passkey: StoredPasskey): Promise<void> {
  const client = db();
  if (!client) {
    const user = memory.get(address);
    if (!user) throw new Error("Nutzer nicht gefunden");
    // Gleiche Credential-ID nicht doppelt ablegen.
    user.passkeys = [
      ...user.passkeys.filter((p) => p.credentialId !== passkey.credentialId),
      { ...passkey, createdAt: passkey.createdAt ?? new Date().toISOString() },
    ];
    memory.set(address, user);
    return;
  }

  const { error } = await client.from("app_passkeys").upsert(
    {
      address,
      credential_id: passkey.credentialId,
      public_key: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports ?? null,
    },
    { onConflict: "credential_id" }
  );
  if (error) throw new Error(error.message);
}

export async function updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
  const client = db();
  if (!client) {
    for (const user of memory.values()) {
      const pk = user.passkeys.find((p) => p.credentialId === credentialId);
      if (pk) pk.counter = counter;
    }
    return;
  }
  await client.from("app_passkeys").update({ counter }).eq("credential_id", credentialId);
}

/** Wem gehört dieser Passkey? Für die Anmeldung ohne vorherige Adresseingabe. */
export async function findAddressByCredential(credentialId: string): Promise<string | null> {
  const client = db();
  if (!client) {
    for (const user of memory.values()) {
      if (user.passkeys.some((p) => p.credentialId === credentialId)) return user.address;
    }
    return null;
  }

  const { data } = await client
    .from("app_passkeys")
    .select("address")
    .eq("credential_id", credentialId)
    .maybeSingle();

  return data?.address ?? null;
}

/** Gerät entfernen. Die Adresse wird mitgeprüft, damit niemand fremde Passkeys löscht. */
export async function removePasskey(address: string, credentialId: string): Promise<boolean> {
  const client = db();
  if (!client) {
    const user = memory.get(address);
    if (!user) return false;
    const before = user.passkeys.length;
    user.passkeys = user.passkeys.filter((p) => p.credentialId !== credentialId);
    memory.set(address, user);
    return user.passkeys.length < before;
  }

  const { error, count } = await client
    .from("app_passkeys")
    .delete({ count: "exact" })
    .eq("credential_id", credentialId)
    .eq("address", address);

  return !error && (count ?? 0) > 0;
}
