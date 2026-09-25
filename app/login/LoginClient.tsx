"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GlasshouseMark } from "@/components/GlasshouseMark";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { useDemoMode } from "@/components/DemoMode";

/** Nur interne Pfade zulassen — sonst wäre das eine offene Weiterleitung. */
function safeNext(raw: string | null): string {
  if (!raw) return "/app";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const { enable: enableDemo } = useDemoMode();

  const next = safeNext(params.get("next"));

  // Schon angemeldet? Dann direkt weiter ins Portal.
  useEffect(() => {
    if (!auth.loading && auth.user) router.replace(next);
  }, [auth.loading, auth.user, next, router]);

  return (
    <div className="login-page">
      <Link href="/" className="login-brand">
        <GlasshouseMark size={22} variant="gradient" />
        <span>GLASSHOUSE</span>
      </Link>

      <div style={{ width: "100%", maxWidth: "460px" }}>
        <AuthPanel onDemo={enableDemo} />

        <p style={{ textAlign: "center", marginTop: "18px", fontSize: "12px", color: "var(--text-faint)" }}>
          <Link href="/" className="ext-link">← Zurück zur Startseite</Link>
        </p>
      </div>
    </div>
  );
}
