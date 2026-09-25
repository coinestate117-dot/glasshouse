"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDemoMode } from "@/components/DemoMode";
import { DEMO_WALLETS } from "@/lib/demo";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { isDemo } = useDemoMode();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const addr = query.trim();
    if (addr.length < 32 || addr.length > 44) return;
    startTransition(() => {
      router.push(`/wallet/${addr}`);
    });
  }

  // Im Demo-Modus auf Demo-Wallets zeigen — eine echte Adresse liefe dort ins Leere.
  const EXAMPLES = isDemo
    ? DEMO_WALLETS.slice(0, 3).map((w) => ({ label: `Demo · ${w.label}`, addr: w.address }))
    : [{ label: "Große NVDAx-Position", addr: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" }];

  return (
    <div className="container" style={{ paddingTop: "24px", paddingBottom: "32px" }}>
      <h1
        style={{
          fontSize: "clamp(22px, 6vw, 32px)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          marginBottom: "6px",
        }}
      >
        Wallet <span className="gradient-text">suchen</span>
      </h1>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Gib eine Solana-Wallet-Adresse ein, um ihr xStocks-Depot anzusehen
      </p>

      <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          id="wallet-search-input"
          className="input"
          placeholder="Solana-Wallet-Adresse einfügen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
        />
        <button
          id="wallet-search-btn"
          type="submit"
          className="btn btn-primary"
          disabled={query.trim().length < 32 || isPending}
        >
          {isPending ? (
            <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Lädt…</>
          ) : (
            "Depot ansehen →"
          )}
        </button>
      </form>

      {/* Validation hint */}
      {query.length > 0 && query.length < 32 && (
        <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--negative)", fontFamily: "var(--font-mono)" }}>
          Wallet-Adressen sind 32–44 Zeichen lang
        </p>
      )}

      {EXAMPLES.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Beispiele
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.addr}
                onClick={() => router.push(`/wallet/${ex.addr}`)}
                className="card-row"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{ex.label}</div>
                  <div className="addr">{ex.addr.slice(0, 6)}…{ex.addr.slice(-6)}</div>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "18px" }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
