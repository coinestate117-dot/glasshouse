"use client";

import { useCallback, useEffect, useState } from "react";

const DEMO_COOKIE = "gh_demo";

function readCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${DEMO_COOKIE}=1`);
}

/** Client-seitiger Zugriff auf den Demo-Modus. */
export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsDemo(readCookie());
  }, []);

  // Moduswechsel per vollem Reload: garantiert, dass Server- und
  // Client-Komponenten den Cookie einheitlich sehen (sonst zeigt z. B. das
  // Banner den Wechsel nicht an).
  const enable = useCallback(() => {
    document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=86400; samesite=lax`;
    window.location.assign("/app");
  }, []);

  const disable = useCallback(() => {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
    window.location.assign("/");
  }, []);

  return { isDemo, enable, disable };
}

/** Durchgehendes Banner, solange der Demo-Modus aktiv ist. */
export function DemoBanner() {
  const { isDemo, disable } = useDemoMode();

  if (!isDemo) return null;

  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner-dot" aria-hidden="true" />
      <strong>DEMO-MODUS</strong>
      <span className="demo-banner-text">
        Depots, Wallets und Ranglisten sind erfunden. Kurse und Märkte sind echt. Es wird keine Transaktion signiert oder gesendet.
      </span>
      <button className="demo-banner-exit" onClick={disable}>
        Demo verlassen
      </button>
    </div>
  );
}
