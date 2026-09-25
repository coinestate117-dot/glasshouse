"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/* Choreografie: Die Karten laufen nacheinander ein, danach baut sich
   der Inhalt jeder Karte von innen auf. */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.94, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 120, damping: 18, mass: 0.9 },
  },
};

const innerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/* Bei prefers-reduced-motion: nur Opazität, keine Bewegung, keine Staffelung. */
const reducedCard: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};
const reducedPlain: Variants = { hidden: { opacity: 0 }, show: { opacity: 1 } };

function MiniMockup({ variant, itemVariants }: { variant: number; itemVariants: Variants }) {
  return (
    <motion.div
      variants={innerVariants}
      className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden p-6 flex flex-col border border-white/10 bg-white/[0.02] shadow-xl backdrop-blur-md group-hover:border-white/20 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_8px_30px_rgba(20,241,149,0.15)]"
    >
      {/* Subtle radial gradient for lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {variant === 0 && (
        <div className="relative z-10 flex flex-col gap-3 mt-auto mb-auto">
          {[100, 80, 60, 45].map((w, i) => (
            <motion.div key={i} variants={itemVariants} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:bg-white/[0.06] transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-purple opacity-90 shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(20,241,149,0.2)]">
                <div className="w-3 h-3 rounded-full bg-black/40" />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2 rounded-full bg-white/20" style={{ width: `${w}%` }} />
                <div className="h-1.5 rounded-full bg-white/10" style={{ width: `${w * 0.6}%` }} />
              </div>
              <div className="w-10 h-3 rounded-full bg-accent/20" />
            </motion.div>
          ))}
        </div>
      )}
      
      {variant === 1 && (
        <div className="relative z-10 flex-1 flex flex-col pt-4">
          <div className="absolute inset-0 border-b border-l border-white/10 opacity-50" />
          <div className="flex-1 flex items-end gap-2.5 pb-0 pl-3 relative">
            {[85, 60, 45, 75, 30, 20].map((h, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="flex-1 rounded-t-sm origin-bottom relative group/bar"
                style={{
                  height: `${h}%`,
                  background: i < 3 ? "linear-gradient(to top, var(--accent-purple), var(--accent))" : "rgba(255,255,255,0.08)",
                  boxShadow: i < 3 ? "0 0 20px rgba(20,241,149,0.2)" : "none"
                }}
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover/bar:opacity-20 transition-opacity rounded-t-sm" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {variant === 2 && (
        <div className="relative z-10 flex-1 flex flex-col justify-center gap-4">
          <motion.div variants={itemVariants} className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <div className="flex justify-between items-center mb-5">
              <div className="h-3 w-16 rounded-full bg-white/20" />
              <div className="h-3 w-12 rounded-full bg-white/20" />
            </div>
            <div className="flex flex-col gap-3 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-2 w-24 rounded-full bg-white/10" />
                  <div className="h-2 w-10 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
            <div
              className="h-11 rounded-lg bg-gradient-to-r from-accent to-accent-purple flex items-center justify-center text-black text-[13px] font-bold shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:shadow-[0_0_30px_rgba(20,241,149,0.5)] transition-shadow cursor-pointer"
            >
              Depot nachbauen →
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function StepWindow({
  step,
  title,
  desc,
  variant,
  reduce,
}: {
  step: number;
  title: string;
  desc: string;
  variant: number;
  reduce: boolean;
}) {
  const card = reduce ? reducedCard : cardVariants;
  const line = reduce ? reducedPlain : lineVariants;

  return (
    <motion.div variants={card} className="group flex flex-col gap-6 cursor-default">
      {/* Ziffer läuft hinter einer Maske hervor */}
      <div className="overflow-hidden mb-2">
        <motion.div
          variants={
            reduce
              ? reducedPlain
              : {
                  hidden: { y: "110%" },
                  show: { y: "0%", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 } },
                }
          }
          className="text-[64px] font-bold leading-none bg-gradient-to-b from-white to-white/20 text-transparent bg-clip-text drop-shadow-md"
        >
          0{step}
        </motion.div>
      </div>

      <motion.div variants={line} className="flex flex-col gap-2.5">
        <h3 className="text-2xl font-bold text-white group-hover:text-accent transition-colors duration-300">
          {title}
        </h3>
        <p className="text-[15px] text-white/60 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
          {desc}
        </p>
      </motion.div>

      <MiniMockup variant={variant} itemVariants={reduce ? reducedPlain : lineVariants} />
    </motion.div>
  );
}

export function LandingScrolly() {
  const reduce = useReducedMotion() ?? false;
  const steps = [
    {
      step: 1,
      title: "Ansehen",
      desc: "Öffne die Rangliste und erkunde die Portfolios der besten Trader. Alles ist transparent und on-chain.",
      variant: 0,
    },
    {
      step: 2,
      title: "Verstehen",
      desc: "Analysiere die genaue Aufteilung der Token. Welche xStocks werden aktuell gekauft? Wo liegen die größten Positionen?",
      variant: 1,
    },
    {
      step: 3,
      title: "Nachbauen",
      desc: "Mit wenigen Klicks replizierst du das gesamte Depot. Trage deinen Betrag ein, bestätige die Transaktion, fertig.",
      variant: 2,
    },
  ];

  return (
    <section id="how-it-works" className="w-full bg-black py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-14 max-w-2xl">
          <div className="section-kicker">So funktioniert&rsquo;s</div>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] leading-[1.08]">
            Von der Rangliste zum eigenen Depot — in drei Schritten.
          </h2>
        </div>

        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8"
          variants={reduce ? reducedPlain : containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Verbindungslinie, die sich zwischen den Karten aufzieht */}
          {!reduce && (
            <motion.div
              aria-hidden="true"
              className="hidden md:block absolute left-[16%] right-[16%] top-[22px] h-px origin-left"
              style={{ background: "var(--grad)", opacity: 0.35 }}
              variants={{
                hidden: { scaleX: 0 },
                show: { scaleX: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
              }}
            />
          )}

          {steps.map((s) => (
            <StepWindow key={s.step} {...s} reduce={reduce} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
