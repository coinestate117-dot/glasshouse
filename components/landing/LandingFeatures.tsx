"use client";

import { Shield, Eye, ShieldCheck, PenTool, CheckCircle, Zap } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function LandingFeatures() {
  const features = [
    {
      title: "Keine Verwahrung",
      desc: "Deine Keys, deine Coins. Wir haben zu keinem Zeitpunkt Zugriff auf dein Vermögen.",
      icon: <Shield className="w-5 h-5 text-accent" strokeWidth={1.5} />
    },
    {
      title: "Echte Mainnet-Daten",
      desc: "Keine simulierten Portfolios. Alle angezeigten Wallets handeln wirklich mit echtem Geld.",
      icon: <Eye className="w-5 h-5 text-accent-purple" strokeWidth={1.5} />
    },
    {
      title: "Kein KYC nötig",
      desc: "Verbinde einfach deine Solana-Wallet. Keine Anmeldung, keine ID-Verifizierung.",
      icon: <ShieldCheck className="w-5 h-5 text-accent" strokeWidth={1.5} />
    },
    {
      title: "Du unterschreibst selbst",
      desc: "Jede Transaktion wird von dir in deiner Wallet geprüft und signiert.",
      icon: <PenTool className="w-5 h-5 text-accent-purple" strokeWidth={1.5} />
    },
    {
      title: "Solscan-Verifizierbar",
      desc: "Prüfe jeden Trade transparent direkt auf der Blockchain nach.",
      icon: <CheckCircle className="w-5 h-5 text-accent" strokeWidth={1.5} />
    },
    {
      title: "Live-Preise via Jupiter",
      desc: "Immer der beste Kurs für deine Token-Swaps durch den besten Aggregator.",
      icon: <Zap className="w-5 h-5 text-accent-purple" strokeWidth={1.5} />
    },
    {
      title: "Preis-Check gegen Pyth",
      desc: "Live-Vergleich von On-Chain-Preis (Jupiter) gegen den echten Pyth-Referenzmarkt.",
      icon: <Eye className="w-5 h-5 text-accent" strokeWidth={1.5} />
    }
  ];

  return (
    <section className="w-full bg-black py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        <div className="max-w-2xl">
          <div className="section-kicker">Warum Glasshouse</div>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] leading-[1.08]">
            Kein Konto, keine Verwahrung, keine Ausreden.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {features.map((f, i) => (
            <Reveal key={i} delay={Math.min(i * 0.06, 0.3)}>
            <div 
              className="group relative bg-bg-secondary rounded p-4 md:p-6 h-full transition-transform duration-200 ease-out md:hover:-translate-y-0.5 border border-transparent"
              style={{
                // We use a pseudo-element for the gradient border to match the spec exactly
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)"
              }}
            >
              {/* Gradient Border on Hover */}
              <div className="absolute inset-0 rounded opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 pointer-events-none p-[1px] bg-gradient-to-br from-accent to-accent-purple" style={{ mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", maskComposite: "exclude", WebkitMaskComposite: "xor" }} />
              
              <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="text-[18px] font-semibold text-text-primary mb-2">
                {f.title}
              </h3>
              <p className="text-[14px] text-text-secondary leading-relaxed">
                {f.desc}
              </p>
            </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
