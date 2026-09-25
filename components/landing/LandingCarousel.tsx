"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: 1,
    step: "01",
    title: "Betrag eingeben",
    desc: "Wähle den Betrag in USDC. Die Aufteilung wird sofort aus den Gewichten des Ziel-Depots berechnet.",
  },
  {
    id: 2,
    step: "02",
    title: "Aufteilung prüfen",
    desc: "Jede Position einzeln aufgeschlüsselt — Symbol, Anteil, Betrag. Nichts passiert, bevor du es gesehen hast.",
  },
  {
    id: 3,
    step: "03",
    title: "Aufträge bestätigen",
    desc: "Geschätzte Kurse über den Jupiter-Aggregator, inklusive Slippage. Du entscheidest, ob du signierst.",
  },
  {
    id: 4,
    step: "04",
    title: "Fertig",
    desc: "Jede Transaktion einzeln auf Solscan verlinkt. Nachprüfbar, nicht nur behauptet.",
  },
];

const AUTOPLAY_MS = 3000;

/* ---------- Mockups: füllen ihre Fläche, statt darin zu schweben ---------- */

function MockAmount() {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Betrag (USDC)</div>
      <div className="h-11 rounded-md border border-border-strong bg-white/[0.04] flex items-center px-3 font-mono text-text-primary text-lg">
        $ 500<span className="ml-0.5 inline-block w-[2px] h-5 bg-accent animate-pulse" />
      </div>
      <div className="flex gap-1.5">
        {[100, 250, 500, 1000].map((v) => (
          <div
            key={v}
            className={`flex-1 text-center py-1.5 rounded-sm border text-[11px] font-mono ${
              v === 500 ? "border-accent/50 text-accent bg-accent/10" : "border-border text-text-muted"
            }`}
          >
            ${v}
          </div>
        ))}
      </div>
      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-text-muted">Aufteilung auf</span>
        <span className="text-[11px] font-mono text-text-primary">6 Positionen</span>
      </div>
      <div className="h-9 rounded-md flex items-center justify-center text-black text-[12px] font-bold" style={{ background: "var(--grad)" }}>
        Aufteilung prüfen →
      </div>
    </div>
  );
}

function MockSplit() {
  const rows = [
    { sym: "SPYx", pct: 49.1, amt: "$245.50" },
    { sym: "MSFTx", pct: 15.0, amt: "$75.00" },
    { sym: "AAPLx", pct: 11.3, amt: "$56.50" },
    { sym: "NVDAx", pct: 11.2, amt: "$56.00" },
    { sym: "GOOGLx", pct: 7.3, amt: "$36.50" },
    { sym: "AMZNx", pct: 6.1, amt: "$30.50" },
  ];
  return (
    <div className="h-full flex flex-col gap-2 justify-center">
      {rows.map((r) => (
        <div key={r.sym} className="flex items-center gap-2.5">
          <span className="w-14 shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-sm border border-accent/30 bg-accent/10 text-accent text-center">
            {r.sym}
          </span>
          <div className="flex-1 h-[7px] rounded-[2px] bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-[2px]" style={{ width: `${r.pct}%`, background: "var(--grad)" }} />
          </div>
          <span className="w-10 shrink-0 text-right text-[10px] font-mono text-text-muted">{r.pct}%</span>
          <span className="w-14 shrink-0 text-right text-[11px] font-mono text-text-primary">{r.amt}</span>
        </div>
      ))}
    </div>
  );
}

function MockConfirm() {
  const rows = [
    { sym: "SPYx", out: "0.4104", amt: "$245.50" },
    { sym: "MSFTx", out: "0.1752", amt: "$75.00" },
    { sym: "AAPLx", out: "0.2342", amt: "$56.50" },
  ];
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted pb-1.5 border-b border-border">
        <span>6 Aufträge</span>
        <span>gesamt $500,00</span>
      </div>
      {rows.map((r) => (
        <div key={r.sym} className="flex items-center justify-between py-1.5 border-b border-border/60">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm border border-accent/30 bg-accent/10 text-accent">
            {r.sym}
          </span>
          <div className="text-right">
            <div className="text-[11px] font-mono text-text-primary">{r.amt}</div>
            <div className="text-[9px] font-mono text-text-muted">≈{r.out} {r.sym}</div>
          </div>
        </div>
      ))}
      <div className="mt-auto rounded-sm border border-accent/20 bg-accent/[0.06] px-2.5 py-2 text-[10px] text-text-secondary leading-relaxed">
        ℹ Kauf zum Marktpreis über Jupiter. Slippage-Toleranz 0,5 %.
      </div>
    </div>
  );
}

function MockDone() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-black text-2xl font-bold"
        style={{ background: "var(--grad)" }}
      >
        ✓
      </div>
      <div className="text-sm font-semibold text-text-primary">Depot gebaut</div>
      <div className="text-[11px] font-mono text-text-muted">6 Transaktionen bestätigt</div>
      <div className="w-full flex flex-col gap-1.5 mt-1">
        {["5xKq…9m2P", "7hTr…4bXz", "2wLp…8sNv"].map((sig) => (
          <div
            key={sig}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-sm border border-border text-[10px] font-mono"
          >
            <span className="text-text-muted">{sig}</span>
            <span className="text-accent">Solscan ↗</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCKS = [MockAmount, MockSplit, MockConfirm, MockDone];

export function LandingCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "-20%" });

  const go = useCallback((next: number) => {
    setDirection(next > current ? 1 : -1);
    setCurrent((next + slides.length) % slides.length);
  }, [current]);

  // Beim Hereinscrollen von vorn beginnen, damit der Ablauf von Schritt 01
  // an gezeigt wird und nicht mitten in der Folge.
  const seenRef = useRef(false);
  useEffect(() => {
    if (!inView) {
      seenRef.current = false;
      return;
    }
    if (seenRef.current) return;
    seenRef.current = true;
    setDirection(1);
    setCurrent(0);
  }, [inView]);

  // Kein eigener Timer: Das Ende der Balken-Animation schaltet weiter
  // (siehe onAnimationEnd). So laufen Anzeige und Wechsel garantiert
  // synchron, auch nach einer Pause.
  const advance = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const variants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
      };

  const Mock = MOCKS[current];

  return (
    <section ref={sectionRef} className="snap-section w-full bg-black py-20 md:py-28 px-4 md:px-8 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 max-w-2xl">
          <div className="section-kicker">Der Nachbauen-Flow</div>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] leading-[1.08]">
            In vier Schritten nachgebaut — du siehst jeden davon.
          </h2>
        </div>

        <div
          className="rounded-lg border border-border bg-bg-secondary overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Reiter */}
          <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                className={`relative flex-1 min-w-[130px] px-4 py-3 text-left transition-colors ${
                  i === current ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <span className="block text-[10px] font-mono tracking-wider mb-0.5">{s.step}</span>
                <span className="block text-[12px] font-semibold leading-tight">{s.title}</span>
                {i === current && (
                  <motion.span
                    layoutId="carousel-tab"
                    className="absolute left-0 right-0 bottom-0 h-[2px]"
                    style={{ background: "var(--grad)" }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Inhalt — feste, aber knapp bemessene Höhe, Mockup füllt sie aus */}
          <div className="relative min-h-[380px] md:min-h-[320px]">
            {/* Kein mode="wait": die neue Folie soll einlaufen, während die
                alte hinausgeht. Sonst hängt der Wechsel, wenn die
                Exit-Animation keinen Abschluss meldet — dann bleibt der
                Bereich leer. */}
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={reduce ? { duration: 0.15 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-5 p-5"
              >
                <div className="rounded-md border border-border bg-black/40 p-4 min-h-[200px]">
                  <Mock />
                </div>

                <div className="flex flex-col justify-center gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                    Schritt {slides[current].step}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-text-primary leading-tight">
                    {slides[current].title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{slides[current].desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Steuerung */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-3">
            <button
              onClick={() => go(current - 1)}
              aria-label="Vorheriger Schritt"
              className="w-9 h-9 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary" />
            </button>
            <button
              onClick={() => go(current + 1)}
              aria-label="Nächster Schritt"
              className="w-9 h-9 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-text-primary" />
            </button>

            <div className="flex gap-1.5 ml-auto">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Schritt ${i + 1}`}
                  className="h-[3px] w-7 rounded-[2px] overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.16)" }}
                >
                  {i === current && (
                    <span
                      // key nur auf current: Pausieren darf die Animation
                      // nicht neu starten, sonst läuft der Balken doppelt.
                      key={current}
                      className={`carousel-progress${paused || !inView ? " is-paused" : ""}`}
                      style={{ "--carousel-duration": `${AUTOPLAY_MS}ms` } as React.CSSProperties}
                      onAnimationEnd={advance}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
