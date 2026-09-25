"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/components/AuthProvider";
import { useDemoMode } from "@/components/DemoMode";
import { AuthPanel } from "@/components/AuthPanel";
import { CountUp } from "@/components/CountUp";
import { DEMO_OWN_WALLET, DEMO_ACCOUNT, type DemoDevice } from "@/lib/demo";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtUSD(v: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

/** Eine Zeile im Datenblatt: Bezeichnung links, Wert rechts. */
function Row({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="konto-row">
      <div className="konto-row-label">
        {label}
        {hint && <span className="konto-row-hint">{hint}</span>}
      </div>
      <div className="konto-row-value">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: "12px", overflow: "hidden" }}>
      <div className="section-header">
        <span className="section-title">{title}</span>
      </div>
      <div style={{ padding: "4px 16px 12px" }}>{children}</div>
    </div>
  );
}

export function KontoClient() {
  const auth = useAuth();
  const router = useRouter();
  const { connected, wallet, disconnect } = useWallet();
  const { isDemo, disable: disableDemo } = useDemoMode();

  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [depot, setDepot] = useState<{ total: number; positions: number } | null>(null);
  // Demo-Geräte liegen lokal — im Demo-Modus wird nichts gespeichert.
  const [demoDevices, setDemoDevices] = useState<DemoDevice[]>(DEMO_ACCOUNT.devices);

  const address = isDemo ? DEMO_OWN_WALLET.address : auth.user?.address ?? null;

  useEffect(() => {
    if (isDemo) {
      setDepot({ total: DEMO_OWN_WALLET.total_value, positions: DEMO_OWN_WALLET.holdings.length });
      return;
    }
    if (!address) return;
    fetch(`/api/portfolio/${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDepot({ total: d.total_value, positions: d.holdings.length }))
      .catch(() => {});
  }, [address, isDemo]);

  /* ---------- Nicht angemeldet ---------- */
  if (!isDemo && !auth.loading && !auth.user) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "48px" }}>
        <AuthPanel onDemo={() => router.push("/dashboard")} />
      </div>
    );
  }

  if (auth.loading && !isDemo) {
    return (
      <div className="container" style={{ paddingTop: "24px" }}>
        <div className="card" style={{ padding: "16px" }}>
          <div className="skel" style={{ width: "160px", height: "16px", marginBottom: "10px" }} />
          <div className="skel" style={{ width: "100%", height: "12px" }} />
        </div>
      </div>
    );
  }

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="container" style={{ paddingTop: "20px", paddingBottom: "32px", maxWidth: "760px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>Konto & Einstellungen</h1>
      <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "20px" }}>
        {isDemo
          ? "Demo-Ansicht mit erfundenen Beispieldaten."
          : "Deine Zugangsdaten, Geräte und Einstellungen."}
      </p>

      {/* ---------- Konto ---------- */}
      <Section title="Konto">
        <Row label="Adresse" hint="dein Zugang">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="addr" style={{ wordBreak: "break-all" }}>{address}</span>
            {!isDemo && (
              <button className="btn btn-ghost btn-sm" onClick={copy}>
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            )}
          </div>
        </Row>

        <Row label="Kontotyp">
          <span className="badge badge-green">Non-custodial</span>
        </Row>

        <Row label="Verifizierung" hint="kein KYC erforderlich">
          <span style={{ color: "var(--text-dim)" }}>Keine — Zugang über Wallet-Signatur</span>
        </Row>

        <Row label="Konto erstellt">
          <span className="mono" style={{ fontSize: "12px" }}>
            {isDemo ? fmtDate(DEMO_ACCOUNT.createdAt) : fmtDate(auth.user?.createdAt ?? null)}
          </span>
        </Row>

        <Row label="Angemeldet seit">
          <span className="mono" style={{ fontSize: "12px" }}>
            {isDemo ? fmtDate(DEMO_ACCOUNT.signedInAt) : fmtDate(auth.user?.signedInAt ?? null)}
          </span>
        </Row>

        <Row label="Verbundene Wallet">
          {isDemo ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <span>{DEMO_ACCOUNT.walletName}</span>
              <span className="demo-badge">Demo</span>
            </span>
          ) : (
            <span style={{ color: connected ? "var(--text)" : "var(--text-faint)" }}>
              {connected && wallet ? wallet.adapter.name : "Aktuell nicht verbunden"}
            </span>
          )}
        </Row>

        {!isDemo && !auth.persistent && (
          <div className="error-box" style={{ marginTop: "10px" }}>
            ⚠ Ohne Datenbank-Anbindung liegt dieses Konto nur im Arbeitsspeicher des Servers. Ein
            Neustart löscht es samt Geräten.
          </div>
        )}
      </Section>

      {/* ---------- Depot ---------- */}
      <Section title="Depot">
        <Row label="Depotwert">
          <span className="mono" style={{ fontSize: "18px", fontWeight: 700 }}>
            {depot ? <CountUp value={depot.total} format={fmtUSD} /> : "—"}
          </span>
        </Row>
        <Row label="Positionen">
          <span className="badge badge-dim">{depot ? depot.positions : "—"}</span>
        </Row>
        <div style={{ paddingTop: "10px" }}>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            Zum Depot →
          </Link>
        </div>
      </Section>

      {/* ---------- Sicherheit ---------- */}
      <Section title="Sicherheit & Geräte">
        {isDemo ? (
          <>
            <Row label="Anmeldemethode">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--text-dim)" }}>Wallet-Signatur (Sign-In with Solana)</span>
                <span className="demo-badge">Demo</span>
              </span>
            </Row>

            <div style={{ padding: "12px 0 4px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                Face ID / Touch ID ({demoDevices.length})
              </div>

              {demoDevices.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.5, marginBottom: "10px" }}>
                  Alle Demo-Geräte entfernt. Füge eines hinzu, um es wieder zu sehen.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                  {demoDevices.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "180px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {d.label}
                          <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>· {d.method}</span>
                        </div>
                        <div className="mono" style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                          Hinzugefügt {fmtDate(d.createdAt)} · zuletzt {fmtDate(d.lastUsedAt)}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setDemoDevices((prev) => prev.filter((x) => x.id !== d.id));
                          setMsg("Gerät entfernt (Demo)");
                          setTimeout(() => setMsg(null), 2000);
                        }}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const now = new Date().toISOString();
                  setDemoDevices((prev) => [
                    ...prev,
                    {
                      id: `demo-device-${Date.now()}`,
                      label: "Dieses Gerät",
                      method: "Face ID",
                      createdAt: now,
                      lastUsedAt: now,
                    },
                  ]);
                  setMsg("Gerät hinzugefügt (Demo)");
                  setTimeout(() => setMsg(null), 2000);
                }}
              >
                Dieses Gerät hinzufügen
              </button>

              <p style={{ fontSize: "11px", color: "var(--text-faint)", lineHeight: 1.5, marginTop: "10px" }}>
                Im Demo-Modus wird nichts gespeichert — die Liste setzt sich beim Neuladen zurück.
              </p>
            </div>

            {msg && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                ✓ {msg}
              </div>
            )}
          </>
        ) : (
          <>
            <Row label="Anmeldemethode">
              <span style={{ color: "var(--text-dim)" }}>Wallet-Signatur (Sign-In with Solana)</span>
            </Row>

            <div style={{ padding: "12px 0 4px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                Face ID / Touch ID ({auth.user?.passkeyCount ?? 0})
              </div>

              {(auth.user?.passkeys.length ?? 0) === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.5, marginBottom: "10px" }}>
                  Noch kein Gerät hinterlegt. Richte eines ein, um dich künftig ohne Wallet anzumelden.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                  {auth.user!.passkeys.map((pk, i) => (
                    <div
                      key={pk.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "160px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>
                          Gerät {i + 1}
                          {pk.transports.length > 0 && (
                            <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>
                              {" "}· {pk.transports.join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="mono" style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                          {pk.id.slice(0, 12)}… · {fmtDate(pk.createdAt)}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={auth.busy}
                        onClick={async () => {
                          const ok = await auth.removePasskey(pk.id);
                          if (ok) {
                            setMsg("Gerät entfernt");
                            setTimeout(() => setMsg(null), 2000);
                          }
                        }}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-secondary btn-sm"
                disabled={auth.busy}
                onClick={async () => {
                  const ok = await auth.addPasskey();
                  if (ok) {
                    setMsg("Gerät hinzugefügt");
                    setTimeout(() => setMsg(null), 2000);
                  }
                }}
              >
                {auth.busy ? "…" : "Dieses Gerät hinzufügen"}
              </button>
            </div>

            {msg && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                ✓ {msg}
              </div>
            )}
            {auth.error && <div className="error-box" style={{ marginTop: "10px" }}>⚠ {auth.error}</div>}
          </>
        )}
      </Section>

      {/* ---------- Darstellung ---------- */}
      <Section title="Darstellung">
        <Row label="Demo-Modus" hint={isDemo ? "aktiv" : "aus"}>
          {isDemo ? (
            <button className="btn btn-secondary btn-sm" onClick={disableDemo}>
              Demo verlassen
            </button>
          ) : (
            <span style={{ color: "var(--text-faint)" }}>Aus</span>
          )}
        </Row>
        <Row label="Sprache">
          <span style={{ color: "var(--text-dim)" }}>Deutsch</span>
        </Row>
        <Row label="Netzwerk">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="live-dot" aria-hidden="true" />
            <span className="mono" style={{ fontSize: "12px" }}>Solana Mainnet</span>
          </span>
        </Row>
      </Section>

      {/* ---------- Abmelden ---------- */}
      {isDemo ? (
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
                Abmelden
                <span className="demo-badge">Demo</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.5 }}>
                Beendet die Demo und bringt dich zur Anmeldung zurück.
              </div>
            </div>
            <button className="btn btn-secondary" onClick={disableDemo}>
              Demo beenden
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>Abmelden</div>
              <div style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.5 }}>
                Beendet die Sitzung auf diesem Gerät. Deine Geräte und dein Depot bleiben erhalten.
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                await auth.signOut();
                if (connected) await disconnect().catch(() => {});
                router.push("/app");
              }}
            >
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
