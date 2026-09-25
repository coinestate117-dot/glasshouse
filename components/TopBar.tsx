"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { GlasshouseMark } from "@/components/GlasshouseMark";
import { ConnectButton } from "@/components/ConnectButton";

export function TopBar() {
  const { connected } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`apple-nav${scrolled ? " scrolled" : ""}`}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <GlasshouseMark size={24} variant="gradient" />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "16px",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Glasshouse
          </span>
        </Link>

        {/* Auth / Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Link href="/app" className="desktop-link" style={{ fontSize: "14px", color: "var(--text-dim)", fontWeight: 500, padding: "8px 12px", display: "none" }}>
            Rangliste
          </Link>
          <Link href="/markets" className="desktop-link" style={{ fontSize: "14px", color: "var(--text-dim)", fontWeight: 500, padding: "8px 12px", display: "none" }}>
            Märkte
          </Link>
          <Link href="/dashboard" className="desktop-link" style={{ fontSize: "14px", color: "var(--text-dim)", fontWeight: 500, padding: "8px 12px", display: "none" }}>
            Dein Depot
          </Link>
          <Link
            href="/search"
            aria-label="Suche"
            style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
            </svg>
          </Link>

          <ConnectButton />
        </div>
      </div>

      {/* Hide specific links on small screens using injected style */}
      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-link {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
