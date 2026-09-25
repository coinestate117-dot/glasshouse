"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlasshouseMark } from "@/components/GlasshouseMark";
import { PortalLink } from "@/components/landing/PortalLink";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 h-[64px] z-50 transition-all duration-300 flex items-center justify-center px-4 md:px-8 ${
        scrolled ? "bg-black/80 backdrop-blur-md border-b border-border-dim" : "bg-transparent"
      }`}
    >
      <div className="w-full max-w-7xl flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-base font-bold uppercase tracking-[0.02em] text-text-primary font-[family-name:var(--font-display)]">
          <GlasshouseMark size={22} variant="gradient" />
          Glasshouse
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#how-it-works" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            So funktioniert's
          </a>
          <Link href="/app" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Rangliste
          </Link>
          <PortalLink className="bg-gradient-to-br from-accent to-accent-purple text-black font-bold text-sm px-4 py-2 rounded-md hover:brightness-110 active:translate-y-px transition-all" />
        </div>

        {/* Mobile Button */}
        <div className="md:hidden">
          <Link
            href="/app"
            className="bg-gradient-to-br from-accent to-accent-purple text-black font-bold text-sm px-4 py-2 rounded-md hover:brightness-110 active:translate-y-px transition-all"
          >
            App öffnen
          </Link>
        </div>
      </div>
    </nav>
  );
}
