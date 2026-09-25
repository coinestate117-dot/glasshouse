"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";

type LeaderboardEntry = {
  address: string;
  total_value: number;
};

type Status = "loading" | "ready" | "empty";

export function LandingLeaderboard() {
  const [top5, setTop5] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.leaderboard) ? data.leaderboard.slice(0, 5) : [];
        setTop5(rows);
        // Leer heißt leer — kein Dauer-Skeleton, das Laden vortäuscht.
        setStatus(rows.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("empty");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const maxVal = top5.length > 0 ? top5[0].total_value : 1;

  const truncate = (str: string) => {
    if (str.length < 10) return str;
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  const fmt = (n: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  };

  return (
    <section className="w-full bg-black py-24 px-4 md:px-8">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        <div className="section-kicker">Live-Rangliste</div>
        <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] leading-[1.05] mb-4 text-center">
          Die größten Depots gerade jetzt
        </h2>
        <p className="text-sm text-text-secondary text-center max-w-md mb-10 leading-relaxed">
          Jede Adresse ist öffentlich und auf Solscan nachprüfbar.
        </p>

        <div className="w-full flex flex-col" ref={ref}>
          {top5.map((entry, idx) => {
            const pct = Math.max((entry.total_value / maxVal) * 100, 2); // At least 2% so the bar is visible

            return (
              <div key={entry.address} className="flex flex-col">
                <div className="flex items-center w-full py-3 gap-4">
                  {/* Rank */}
                  <div className="font-mono text-text-muted text-sm w-4 shrink-0 text-right">
                    {idx + 1}
                  </div>
                  
                  {/* Address */}
                  <div className="font-mono text-text-primary text-sm w-24 shrink-0">
                    {truncate(entry.address)}
                  </div>
                  
                  {/* Bar */}
                  <div className="flex-1 flex items-center">
                    <div className="w-full bg-white/5 rounded-[2px] h-[8px] md:h-[10px] overflow-hidden">
                      <motion.div 
                        className="h-full rounded-[2px] bg-gradient-to-br from-accent to-accent-purple"
                        initial={shouldReduceMotion ? { width: `${pct}%` } : { width: "0%" }}
                        animate={isInView ? { width: `${pct}%` } : { width: "0%" }}
                        transition={{ 
                          duration: 0.7, 
                          ease: [0.16, 1, 0.3, 1],
                          delay: idx * 0.06
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Value */}
                  <div className="font-mono text-text-primary text-sm shrink-0 text-right w-24 tabular-nums">
                    {fmt(entry.total_value)}
                  </div>
                </div>
                
                {/* Divider (except last) */}
                {idx < top5.length - 1 && (
                  <div className="w-full h-px bg-white/5" />
                )}
              </div>
            );
          })}

          {status === "loading" &&
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="flex items-center w-full py-3 gap-4">
                  <div className="font-mono text-text-muted text-sm w-4 shrink-0 text-right">{idx + 1}</div>
                  <div className="skel w-24 h-[13px] shrink-0" />
                  <div className="flex-1">
                    <div className="w-full bg-white/5 rounded-[2px] h-[8px] md:h-[10px]" />
                  </div>
                  <div className="skel w-16 h-[13px] shrink-0 ml-auto" />
                </div>
                {idx < 4 && <div className="w-full h-px bg-white/5" />}
              </div>
            ))}

          {status === "empty" && (
            <div className="w-full py-12 px-4 text-center border border-border rounded-md">
              <div className="text-sm font-semibold text-text-primary mb-2">
                Rangliste noch nicht verfügbar
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed max-w-sm mx-auto mb-5">
                Kurse und Depot-Abfragen laufen live. Für die Rangliste muss der Server aber alle
                Halter eines Tokens auflisten — das erlaubt der öffentliche Solana-Knoten nicht.
                Dafür braucht es einen eigenen RPC-Zugang.
              </p>
              <Link href="/dashboard" className="btn btn-secondary btn-sm">
                Demo ansehen
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12">
          <Link
            href="/app"
            className="flex items-center justify-center bg-transparent border border-white/16 hover:border-white/32 text-text-primary font-bold px-6 py-3 rounded-md transition-all"
          >
            Vollständige Rangliste ansehen
          </Link>
        </div>
      </div>
    </section>
  );
}
