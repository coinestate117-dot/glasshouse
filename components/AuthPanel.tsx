"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { GlasshouseMark } from "@/components/GlasshouseMark";
import { useAuth } from "@/components/AuthProvider";

type Mode = "register" | "login";

/**
 * Anmeldebildschirm mit zwei Wegen. Technisch ist beides dieselbe
 * Wallet-Signatur — die Trennung existiert, damit Neue verstehen, dass
 * die erste Signatur ihr Konto anlegt.
 */
export function AuthPanel({ onDemo }: { onDemo: () => void }) {
  const { connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("register");

  const isRegister = mode === "register";

  // Ist überhaupt eine Wallet installiert? Sonst führt der Verbinden-Knopf
  // nur in ein leeres Fenster — dann lieber direkt zur Installation schicken.
  //
  // Erst nach dem Mounten auswerten: Auf dem Server ist keine Wallet
  // sichtbar, im Browser schon. Würde man das sofort anzeigen, rendern
  // Server und Client unterschiedlichen Text — React bricht die Hydration ab.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Nur "Installed" zählt. "Loadable" meldet der Adapter auch ohne
  // installierte Extension (nachladbar / Mobile-Deeplink) — damit landet
  // man auf dem Desktop in einem Auswahlfenster, das nichts tun kann.
  const walletDetected = wallets.some((w) => w.readyState === WalletReadyState.Installed);
  // Vor dem Mounten so tun, als wäre eine Wallet da — das ist der neutrale
  // Text, der auf beiden Seiten identisch ist.
  const hasWallet = mounted ? walletDetected : true;

  const connectOrInstall = () => {
    if (!hasWallet) {
      window.open("https://phantom.app/download", "_blank", "noopener,noreferrer");
      return;
    }
    if (connected) {
      auth.signInWithWallet();
    } else {
      setVisible(true);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "460px", margin: "0 auto", padding: "36px 28px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
        <GlasshouseMark size={40} variant="gradient" />
      </div>

      {/* Umschalter */}
      <div className="auth-switch" role="tablist" aria-label="Konto erstellen oder anmelden">
        <button
          role="tab"
          aria-selected={isRegister}
          className={`auth-switch-item${isRegister ? " active" : ""}`}
          onClick={() => setMode("register")}
        >
          Konto erstellen
        </button>
        <button
          role="tab"
          aria-selected={!isRegister}
          className={`auth-switch-item${!isRegister ? " active" : ""}`}
          onClick={() => setMode("login")}
        >
          Anmelden
        </button>
      </div>

      {isRegister ? (
        <>
          <h1 style={{ fontSize: "20px", marginBottom: "8px", textAlign: "center" }}>
            Konto in einem Schritt
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.6, textAlign: "center", marginBottom: "20px" }}>
            Du brauchst keine E-Mail und kein Passwort. Deine Solana-Wallet <em>ist</em> dein Konto —
            du signierst einmal eine Nachricht, fertig.
          </p>

          <ol className="auth-steps">
            <li>
              <span className="auth-step-num">1</span>
              <span>
                <strong>Phantom öffnet sich</strong> und fragt dort, ob du dich verbinden willst.
                Wir erhalten nur deine öffentliche Adresse.
              </span>
            </li>
            <li>
              <span className="auth-step-num">2</span>
              <span>
                <strong>Deine Wallet signiert einen Text</strong> — intern, der Schlüssel bleibt in
                der Extension. Keine Transaktion, keine Gebühren.
              </span>
            </li>
            <li>
              <span className="auth-step-num">3</span>
              <span>Optional Face ID einrichten, dann geht’s künftig ohne Wallet</span>
            </li>
          </ol>

          <div className="auth-safety">
            <span className="auth-safety-icon" aria-hidden="true">🔒</span>
            <div>
              <strong>Wir fragen nie nach deiner Seed Phrase oder deinem privaten Schlüssel.</strong>
              <span>
                Es gibt hier kein Eingabefeld dafür — und es wird nie eines geben. Wer dich danach
                fragt, will dich bestehlen. Auch wir sehen deinen Schlüssel nie.
              </span>
            </div>
          </div>

          <details className="auth-details">
            <summary>Was genau wird signiert?</summary>
            <pre className="auth-message-preview">{`Glasshouse möchte, dass du dich mit
deiner Solana-Wallet anmeldest.

Adresse: <deine öffentliche Adresse>
Nonce:   <Einmalcode>

Dies ist nur eine Signatur zur Anmeldung.
Es wird keine Transaktion ausgeführt und
es entstehen keine Gebühren.`}</pre>
          </details>

          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "18px" }}
            disabled={auth.busy}
            onClick={connectOrInstall}
          >
            {auth.busy
              ? "Warte auf Signatur…"
              : !hasWallet
                ? "Phantom installieren"
                : connected
                  ? "Konto erstellen & anmelden"
                  : "Wallet verbinden"}
          </button>

          {mounted && !hasWallet && (
            <p style={{ fontSize: "11px", color: "var(--text-faint)", lineHeight: 1.5, marginTop: "8px", textAlign: "center" }}>
              Keine Solana-Wallet gefunden. Phantom ist kostenlos und in einer Minute eingerichtet.
            </p>
          )}
        </>
      ) : (
        <>
          <h1 style={{ fontSize: "20px", marginBottom: "8px", textAlign: "center" }}>
            Willkommen zurück
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.6, textAlign: "center", marginBottom: "20px" }}>
            Melde dich mit Face ID an — oder erneut mit deiner Wallet.
          </p>

          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={auth.busy}
            onClick={() => auth.signInWithPasskey()}
          >
            Mit Face ID / Touch ID anmelden
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: "100%", marginTop: "10px" }}
            disabled={auth.busy}
            onClick={connectOrInstall}
          >
            {!hasWallet ? "Phantom installieren" : connected ? "Mit Wallet anmelden" : "Wallet verbinden"}
          </button>

          <p style={{ fontSize: "11px", color: "var(--text-faint)", lineHeight: 1.5, marginTop: "10px", textAlign: "center" }}>
            Face ID funktioniert, sobald du auf diesem Gerät einmal mit Wallet angemeldet warst.
          </p>

          <div className="auth-safety">
            <span className="auth-safety-icon" aria-hidden="true">🔒</span>
            <div>
              <strong>Wir fragen nie nach deiner Seed Phrase oder deinem privaten Schlüssel.</strong>
              <span>
                Die Anmeldung läuft über eine Signatur in deiner Wallet — dein Schlüssel verlässt
                die Extension nie.
              </span>
            </div>
          </div>
        </>
      )}

      {auth.error && (
        <div className="error-box" style={{ marginTop: "14px" }}>⚠ {auth.error}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0 14px" }}>
        <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          oder
        </span>
        <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      <button className="btn btn-ghost" style={{ width: "100%" }} onClick={onDemo}>
        Demo ansehen — ohne Wallet
      </button>
      <p style={{ fontSize: "11px", color: "var(--text-faint)", lineHeight: 1.5, marginTop: "8px", textAlign: "center" }}>
        Zeigt das komplette Portal mit erfundenen Beispieldaten.
      </p>

      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
        <span className="chip">Non-custodial</span>
        <span className="chip">Kein KYC</span>
        <span className="chip">Kein Passwort</span>
      </div>
    </div>
  );
}
