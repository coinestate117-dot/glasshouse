import { Metadata } from "next";
import { LandingNav } from "@/components/landing/LandingNav";
import { DemoBanner } from "@/components/DemoMode";
import { ScrollProgress } from "@/components/ScrollProgress";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingTicker } from "@/components/landing/LandingTicker";
import { LandingScrolly } from "@/components/landing/LandingScrolly";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingLeaderboard } from "@/components/landing/LandingLeaderboard";
import { LandingCarousel } from "@/components/landing/LandingCarousel";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Glasshouse — Jedes Depot auf Solana ist öffentlich",
  description: "Verfolge On-Chain-Daten transparent und nachvollziehbar — du entscheidest, was du draus machst.",
};

export default function NewLandingPage() {
  return (
    <div className="relative isolate flex flex-col min-h-screen bg-black text-text-primary selection:bg-accent/30">
      
      <ScrollProgress />
      <DemoBanner />

      {/* Sektion 0: Sticky Nav */}
      <LandingNav />
      
      {/* Sektion 1: Hero & Map & Stats */}
      <LandingHero />
      
      {/* Sektion 2: Live-Ticker */}
      <LandingTicker />
      
      {/* Sektion 3: Scrollytelling ("So funktioniert's") */}
      <LandingScrolly />
      
      {/* Sektion 4: Feature-Grid */}
      <LandingFeatures />
      
      {/* Sektion 5: Live-Rangliste-Teaser */}
      <LandingLeaderboard />
      
      {/* Sektion 6: Nachbauen-Flow Karussell */}
      <LandingCarousel />
      
      {/* Sektion 7, 8, 9: Transparenz, Schluss-CTA, Footer */}
      <LandingFooter />

    </div>
  );
}
