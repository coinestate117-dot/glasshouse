"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/components/AuthProvider";
import { AccountMenu } from "@/components/AccountMenu";

function shorten(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { connected, connecting, disconnect, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const auth = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Wallet-Erkennung erst nach dem Mounten auswerten: Auf dem Server ist
  // keine Extension sichtbar, im Browser schon — sonst rendern beide Seiten
  // unterschiedlichen Text und React bricht die Hydration ab.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Nur "Installed" zählt. "Loadable" meldet der Adapter auch ohne
  // installierte Extension (nachladbar / Mobile-Deeplink) — damit landet
  // man auf dem Desktop in einem Auswahlfenster, das nichts tun kann.
  const walletDetected = wallets.some((w) => w.readyState === WalletReadyState.Installed);
  const hasWallet = mounted ? walletDetected : true;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* ---------- Noch nicht verbunden ---------- */
  if (!auth.user) {
    // Keine Extension gefunden: nicht ins leere Auswahlfenster schicken,
    // sondern direkt zur Installation.
    if (!hasWallet) {
      return (
        <a
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          title="Keine Solana-Wallet gefunden — Phantom ist kostenlos"
        >
          Wallet installieren ↗
        </a>
      );
    }

    const busy = connecting || auth.busy;

    return (
      <button
        className="btn btn-primary btn-sm"
        onClick={() => (connected ? auth.signInWithWallet() : setVisible(true))}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        {busy && (
          <span
            className="spinner"
            style={{ width: "13px", height: "13px", borderWidth: "2px" }}
            aria-hidden="true"
          />
        )}
        {connecting
          ? "Verbinde…"
          : auth.busy
            ? "Warte auf Signatur…"
            : connected
              ? "Anmelden"
              : "Wallet verbinden"}
      </button>
    );
  }

  /* ---------- Verbunden ---------- */
  const address = auth.user.address;


  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Wallet ${shorten(address)} — Menü öffnen`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: "36px",
          padding: "0 12px",
          borderRadius: "6px",
          border: "1px solid var(--border-strong)",
          background: "transparent",
          color: "var(--text)",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        <span className="live-dot" aria-hidden="true" />
        {shorten(address)}
      </button>

      {open && (
        <AccountMenu
          address={address}
          onNavigate={() => setOpen(false)}
          onSignOut={async () => {
            setOpen(false);
            await auth.signOut();
            if (connected) await disconnect().catch(() => {});
          }}
        />
      )}
    </div>
  );
}
