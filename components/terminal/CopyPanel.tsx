"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CopyTradeModal } from "@/components/CopyTradeModal";

type Entry = {
  rank: number;
  address: string;
  label: string | null;
  total_value: number;
  change_24h_pct: number | null;
  position_count: number;
  holdings: Array<{ mint: string; symbol: string; weight: number; value_usd: number }>;
};

type Payload = { demo: boolean; available: boolean; entries: Entry[]; reason?: string };

const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)} Mio.`
    : n >= 1000
      ? `$${(n / 1000).toFixed(1)} Tsd.`
      : `$${n.toFixed(2)}`;

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Aufteilung als Balken — Farbverlauf grün→violett über die Positionen. */
function Bar({ holdings }: { holdings: Entry["holdings"] }) {
  return (
    <div className="cp-bar" aria-hidden="true">
      {holdings.slice(0, 8).map((h, i) => (
        <span
          key={h.symbol}
          style={{
            width: `${h.weight * 100}%`,
            background: `color-mix(in srgb, var(--green) ${100 - i * 13}%, var(--violet))`,
          }}
        />
      ))}
    </div>
  );
}

export function CopyPanel({ isDemo }: { isDemo: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [openAddr, setOpenAddr] = useState<string | null>(null);
  const [copy, setCopy] = useState<Entry | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Payload) => {
        if (!alive) return;
        setData(d);
        setOpenAddr(d.entries[0]?.address ?? null);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const open = useMemo(
    () => data?.entries.find((e) => e.address === openAddr) ?? null,
    [data, openAddr]
  );

  if (failed) {
    return <p className="tm-empty">Depots konnten gerade nicht geladen werden.</p>;
  }

  if (!data) {
    return (
      <div className="cp-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="cp-row">
            <span className="skeleton" style={{ width: "22px", height: "22px", borderRadius: "4px" }} />
            <span className="skeleton" style={{ width: "120px", height: "13px" }} />
            <span className="skeleton" style={{ width: "70px", height: "13px", justifySelf: "end" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className="cp-note">
        <p>{data.reason}</p>
        <p className="cp-note-sub">
          Du kannst den Ablauf im Demo-Modus vollständig ansehen — dort wird nichts signiert
          oder gesendet.
        </p>
      </div>
    );
  }

  return (
    <div className="cp">
      <div className="cp-head">
        <h2 className="cp-title">Depots zum Nachbauen</h2>
        <p className="cp-lead">
          Öffentliche On-Chain-Depots. Wähle eins aus, sieh dir die Aufteilung an und übernimm
          sie mit deinem eigenen Betrag — gewichtet wie im Original. Du entscheidest.
        </p>
      </div>

      <div className="cp-list">
        {data.entries.map((e) => {
          const isOpen = e.address === openAddr;
          const up = (e.change_24h_pct ?? 0) >= 0;
          return (
            <div key={e.address} className={`cp-item ${isOpen ? "is-open" : ""}`}>
              <button
                className="cp-row"
                onClick={() => setOpenAddr(isOpen ? null : e.address)}
                aria-expanded={isOpen}
              >
                <span className="cp-rank">{e.rank}</span>

                <span className="cp-ident">
                  <span className="cp-name">{e.label ?? short(e.address)}</span>
                  <span className="cp-meta">
                    {e.position_count} Positionen
                    {e.holdings[0] && ` · grösste ${e.holdings[0].symbol}`}
                  </span>
                </span>

                <span className="cp-value">
                  {usd(e.total_value)}
                  <span
                    className="cp-change"
                    style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                  >
                    {e.change_24h_pct === null
                      ? "—"
                      : `${up ? "+" : "−"}${Math.abs(e.change_24h_pct).toFixed(2)} %`}
                  </span>
                </span>
              </button>

              <Bar holdings={e.holdings} />

              {isOpen && (
                <div className="cp-detail">
                  <ul className="cp-holdings">
                    {e.holdings.map((h) => (
                      <li key={h.symbol}>
                        <span className="cp-h-sym">{h.symbol}</span>
                        <span className="cp-h-w">{(h.weight * 100).toFixed(1)} %</span>
                        <span className="cp-h-v">{usd(h.value_usd)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="cp-actions">
                    <button className="cp-cta" onClick={() => setCopy(e)}>
                      Mit meinem Betrag nachbauen
                    </button>
                    {!data.demo && (
                      <a
                        className="cp-link"
                        href={`https://solscan.io/account/${e.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Auf Solscan prüfen ↗
                      </a>
                    )}
                    <Link className="cp-link" href={`/wallet/${e.address}`}>
                      Depot im Detail
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {copy && (
        <CopyTradeModal
          targetAddress={copy.address}
          holdings={copy.holdings.map((h) => ({
            mint: h.mint,
            symbol: h.symbol,
            weight: h.weight,
          }))}
          isDemo={isDemo}
          onClose={() => setCopy(null)}
        />
      )}
    </div>
  );
}
