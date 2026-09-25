"use client";

import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { useDemoMode } from "@/components/DemoMode";
import { Terminal } from "@/components/terminal/Terminal";

export function DashboardClient() {
  const auth = useAuth();
  const { enable: enableDemo } = useDemoMode();

  // Solange die Sitzung geprüft wird, nichts entscheiden — sonst blitzt der
  // Anmeldebereich kurz auf, obwohl der Nutzer angemeldet ist.
  if (auth.loading) {
    return (
      <div className="container" style={{ paddingTop: "24px" }}>
        <span className="skeleton" style={{ height: "18px", width: "180px", display: "block" }} />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div
        className="container"
        style={{ paddingTop: "24px", paddingBottom: "32px", maxWidth: "460px" }}
      >
        <h1 className="dash-h1">Dein Depot</h1>
        <p className="dash-lead">
          Verbinde deine Wallet, um dein Depot und die Märkte zu sehen. Öffentliche
          On-Chain-Daten — du entscheidest, was du daraus machst.
        </p>
        <AuthPanel onDemo={enableDemo} />
      </div>
    );
  }

  return <Terminal />;
}
