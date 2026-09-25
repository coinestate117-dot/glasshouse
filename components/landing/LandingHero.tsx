"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { RevealText } from "@/components/RevealText";
import { HeroBackground } from "@/components/HeroBackground";

function NumberCounter({ value, prefix = "", suffix = "", isCurrency = false }: { value: number, prefix?: string, suffix?: string, isCurrency?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 800; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(value * ease);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, shouldReduceMotion]);

  const formatted = isCurrency
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(displayValue)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(displayValue);

  return <span className="font-mono tabular-nums">{prefix}{formatted}{suffix}</span>;
}

export function LandingHero() {
  const [stats, setStats] = useState({ trackedValueUsd: 0, walletsObserved: 0, mostActivePosition: "-" });
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Parallax: Hintergrund zieht beim Scrollen langsamer mit als der Inhalt.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoaded(true);
      })
      .catch(console.error);
  }, []);

  return (
    <section ref={heroRef} className="relative w-full min-h-[80svh] md:min-h-[calc(100svh-64px)] flex flex-col items-center justify-center pt-10 overflow-hidden bg-black">
      {/* Hintergrund — Parallax: zieht beim Scrollen langsamer mit */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={shouldReduceMotion ? undefined : { y: glowY }}
      >
        <HeroBackground />
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center text-center"
        style={shouldReduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        {/* Kicker */}
        <div className="flex items-center gap-2 mb-6">
          <motion.div 
            className="w-[6px] h-[6px] rounded-full bg-accent"
            animate={shouldReduceMotion ? {} : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-mono text-accent text-xs md:text-sm tracking-wider font-bold">
            LIVE · SOLANA MAINNET
          </span>
        </div>

        {/* Headline */}
        <RevealText
          className="text-[clamp(2.25rem,6vw,4.5rem)] font-semibold tracking-[-0.02em] leading-[1.05] text-text-primary mb-6"
          lines={["Jedes Depot auf Solana ist öffentlich.", "Mach es zu deinem Vorteil."]}
          delay={0.15}
        />

        {/* Subheadline */}
        <p className="text-base md:text-lg text-text-secondary max-w-[60ch] leading-[1.55] mb-10">
          Beobachte die erfolgreichsten Portfolios in Echtzeit. Verfolge On-Chain-Daten transparent und nachvollziehbar — du entscheidest, was du draus machst.
        </p>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Link
            href="/app"
            className="w-full md:w-auto flex items-center justify-center bg-gradient-to-br from-accent to-accent-purple text-black font-bold px-7 py-3.5 rounded-md hover:brightness-110 active:translate-y-px transition-all"
          >
            Rangliste ansehen
          </Link>
          <Link
            href="/app"
            className="w-full md:w-auto flex items-center justify-center bg-transparent border border-white/16 hover:border-white/32 text-text-primary font-bold px-7 py-3.5 rounded-md transition-all"
          >
            App öffnen
          </Link>
        </div>
      </motion.div>

      {/* Kennzahlen — in den Fluss statt frei schwebend, sonst überlappen
          sie auf mittleren Breiten den Fließtext. */}
      <motion.div
        className="relative z-20 w-full max-w-3xl px-4 mt-14"
        style={shouldReduceMotion ? undefined : { opacity: contentOpacity }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08] rounded-md overflow-hidden">
          {[
            { label: "Depotwert getrackt", value: isLoaded ? <NumberCounter value={stats.trackedValueUsd} isCurrency /> : "—" },
            { label: "Wallets beobachtet", value: isLoaded ? <NumberCounter value={stats.walletsObserved} /> : "—" },
            { label: "Aktivste Position", value: isLoaded ? <span className="font-mono">{stats.mostActivePosition}</span> : "—" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.55 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              className="bg-black px-5 py-4 text-left"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                {item.label}
              </div>
              <div className="text-xl md:text-2xl font-bold text-text-primary tabular-nums">
                {item.value}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </section>
  );
}
