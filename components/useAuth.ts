"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { buildSignInMessage } from "@/lib/siws";

export type PasskeyInfo = {
  id: string;
  createdAt: string | null;
  transports: string[];
};

export type AuthUser = {
  address: string;
  createdAt: string | null;
  lastSeenAt: string | null;
  signedInAt: string | null;
  passkeyCount: number;
  passkeys: PasskeyInfo[];
};

/** WebAuthn-Fehler in verständliche Sätze übersetzen. */
function friendlyWebAuthnError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);

  // Nutzer hat selbst abgebrochen — kein Fehler, nichts anzeigen.
  if (/AbortError|cancel(l)?ed by the user/i.test(msg)) return null;

  if (/timed out or was not allowed|NotAllowedError/i.test(msg)) {
    return "Kein Passkey verfügbar oder Vorgang abgebrochen. Melde dich einmal mit der Wallet an und richte danach Face ID ein.";
  }
  if (/InvalidStateError|already registered/i.test(msg)) {
    return "Auf diesem Gerät ist bereits ein Passkey hinterlegt.";
  }
  if (/NotSupportedError|not supported/i.test(msg)) {
    return "Dieses Gerät oder dieser Browser unterstützt keine Passkeys.";
  }
  if (/SecurityError/i.test(msg)) {
    return "Passkeys brauchen eine sichere Verbindung (HTTPS) oder localhost.";
  }
  return msg;
}

export function useAuthInternal() {
  const { publicKey, signMessage, connected } = useWallet();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  /** true, wenn bei der letzten Anmeldung ein Konto neu entstanden ist. */
  const [justRegistered, setJustRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Läuft ohne Datenbank? Dann überlebt das Konto keinen Server-Neustart. */
  const [persistent, setPersistent] = useState(true);
  /** Ist die aktuelle Sitzung das Demo-Konto? */
  const [demo, setDemo] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setUser(data.user ?? null);
      if (typeof data.persistent === "boolean") setPersistent(data.persistent);
      setDemo(Boolean(data.demo));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Anmeldung per Wallet-Signatur (keine Transaktion, keine Gebühren). */
  const signInWithWallet = useCallback(async () => {
    setError(null);

    if (!connected || !publicKey) {
      setError("Bitte zuerst die Wallet verbinden.");
      return false;
    }
    if (!signMessage) {
      setError("Diese Wallet kann keine Nachrichten signieren.");
      return false;
    }

    setBusy(true);
    try {
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      const address = publicKey.toBase58();
      const message = buildSignInMessage({ domain: window.location.host, address, nonce });
      const signature = await signMessage(new TextEncoder().encode(message));

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: bs58.encode(signature) }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen");
        return false;
      }

      if (typeof data.persisted === "boolean") setPersistent(data.persisted);
      setJustRegistered(Boolean(data.isNew));
      await refresh();
      return true;
    } catch (err) {
      // Nutzer hat die Signatur in der Wallet abgelehnt — kein Fehlerfall.
      const msg = err instanceof Error ? err.message : String(err);
      setError(/reject|denied|cancel/i.test(msg) ? null : msg);
      return false;
    } finally {
      setBusy(false);
    }
  }, [connected, publicKey, signMessage, refresh]);

  /** Face ID / Touch ID für die nächste Anmeldung einrichten. */
  const addPasskey = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST" });
      const options = await optRes.json();
      if (!optRes.ok) {
        setError(options.error ?? "Passkey-Einrichtung nicht möglich");
        return false;
      }

      const attestation = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(data.error ?? "Passkey konnte nicht bestätigt werden");
        return false;
      }

      await refresh();
      return true;
    } catch (err) {
      setError(friendlyWebAuthnError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  /** Anmeldung per Face ID — ohne Wallet. */
  const signInWithPasskey = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const optRes = await fetch("/api/auth/passkey/login/options", { method: "POST" });
      const options = await optRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen");
        return false;
      }

      await refresh();
      return true;
    } catch (err) {
      setError(friendlyWebAuthnError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  /** Gerät (Passkey) entfernen. */
  const removePasskey = useCallback(
    async (credentialId: string) => {
      setError(null);
      setBusy(true);
      try {
        const res = await fetch(`/api/auth/passkey/${encodeURIComponent(credentialId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Gerät konnte nicht entfernt werden");
          return false;
        }
        await refresh();
        return true;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    // Im Demo-Modus gibt es keine Server-Sitzung zum Beenden — abgemeldet
    // wird, indem der Demo-Cookie fällt. Voller Reload, damit Server- und
    // Client-Komponenten denselben Stand sehen.
    if (demo) {
      document.cookie = "gh_demo=; path=/; max-age=0; samesite=lax";
      window.location.assign("/");
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    await refresh();
  }, [refresh, demo]);

  return {
    user,
    loading,
    busy,
    error,
    persistent,
    demo,
    justRegistered,
    clearJustRegistered: () => setJustRegistered(false),
    signInWithWallet,
    signInWithPasskey,
    addPasskey,
    removePasskey,
    signOut,
    refresh,
  };
}

export type AuthState = ReturnType<typeof useAuthInternal>;
