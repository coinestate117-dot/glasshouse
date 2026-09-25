"use client";

import Link from "next/link";
import { PortalLink } from "@/components/landing/PortalLink";
import { useEffect, useState } from "react";

export function LandingFooter() {
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        if (data.trackedValueUsd) setTotalValue(data.trackedValueUsd);
      })
      .catch(console.error);
  }, []);

  const fmt = (n: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  };

  return (
    <footer className="w-full bg-black flex flex-col items-center">
      
      {/* Sektion 7: Transparenz */}
      <div className="w-full max-w-4xl px-4 py-24 flex flex-col items-center text-center border-t border-border-dim/50">
        <h3 className="text-2xl font-bold text-text-primary mb-4">
          Hundertprozentig Transparent
        </h3>
        <p className="text-text-secondary max-w-2xl mb-8 leading-relaxed">
          Alle Trades und Holdings basieren auf echten On-Chain-Daten. Wir nutzen keine versteckten Wallets und keine simulierten Renditen. Du hast jederzeit die volle Kontrolle über deine eigenen Keys.
        </p>
        
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="px-3 py-1.5 rounded-[4px] border border-white/16 text-text-primary font-mono text-[13px] uppercase tracking-wider">
            Nicht-custodial
          </div>
          <div className="px-3 py-1.5 rounded-[4px] border border-white/16 text-text-primary font-mono text-[13px] uppercase tracking-wider">
            Kein KYC
          </div>
          <div className="px-3 py-1.5 rounded-[4px] border border-white/16 text-text-primary font-mono text-[13px] uppercase tracking-wider">
            Solana Mainnet
          </div>
        </div>
        
        <a 
          href="https://solscan.io" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-purple font-medium transition-colors"
        >
          Selbst nachprüfen ↗
        </a>
      </div>

      {/* Sektion 8: Schluss-CTA */}
      <div className="w-full max-w-4xl px-4 py-24 flex flex-col items-center text-center">
        <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-0.02em] leading-[1.05] mb-10">
          Dein Portfolio. Deine Regeln.
        </h2>
        
        <PortalLink className="bg-gradient-to-br from-accent to-accent-purple text-black font-bold px-8 py-4 rounded-md hover:brightness-110 active:translate-y-px transition-all mb-6 text-lg" />
        
        <div className="font-mono text-xs text-text-secondary">
          Aktuell {totalValue > 0 ? fmt(totalValue) : "—"} über echte Wallets getrackt · aktualisiert live
        </div>
      </div>

      {/* Sektion 9: Footer */}
      <div className="w-full border-t border-border-dim px-4 md:px-8 py-8 flex flex-col items-center">
        <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Rangliste</Link>
            <a href="https://github.com" className="text-sm text-text-secondary hover:text-text-primary transition-colors">GitHub</a>
            <a href="https://solscan.io" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Solscan</a>
            <a href="https://twitter.com" className="text-sm text-text-secondary hover:text-text-primary transition-colors">X/Twitter</a>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <span className="text-xs text-text-muted">© 2026 Glasshouse</span>
            <div className="px-3 py-1.5 rounded-[4px] border border-white/16 text-text-muted font-mono text-[11px] uppercase tracking-wider">
              Gebaut für den Solana Stocklana Hackathon
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
