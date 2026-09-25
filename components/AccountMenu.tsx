"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AccountSummary = {
  demo: boolean;
  address: string;
  total_value: number;
  change_24h_pct: number | null;
  position_count: number;
  holdings: Array<{ symbol: string; weight: number; value_usd: number }>;
  account: { createdAt: string | null; signedInAt: string | null; passkeyCount: number };
  activity: {
    tradeCount30d: number;
    volume30dUsd: number;
    rebuiltDepots: number;
    bestPosition: { symbol: string; changePct: number };
    worstPosition: { symbol: string; changePct: number };
  } | null;
};

const usd = (n: number) =>
  n.toLocaleString("de-CH", { style: "currency", currency: "USD", maximumFractionDigits: n < 100 ? 2 : 0 });

const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)} %`;

function memberSince(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-CH", { month: "long", year: "numeric" });
}

/** Eine Kennzahl mit Beschriftung darüber. */
function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="acct-stat">
      <span className="acct-stat-label">{label}</span>
      <span
        className="acct-stat-value"
        style={tone ? { color: tone === "pos" ? "var(--positive)" : "var(--negative)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

export function AccountMenu({
  address,
  onNavigate,
  onSignOut,
}: {
  address: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<AccountSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/account/summary")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const go = (href: string) => {
    onNavigate();
    router.push(href);
  };

  const change = data?.change_24h_pct ?? null;
  const since = memberSince(data?.account.createdAt ?? null);

  return (
    <div role="menu" className="acct-panel">
      {/* Kopf: Depotwert und Tagesveränderung */}
      <div className="acct-head">
        <div className="acct-head-row">
          <span className="acct-head-label">Depotwert</span>
          {data?.demo && <span className="acct-demo-chip">Demo</span>}
        </div>

        {data ? (
          <>
            <div className="acct-total">{usd(data.total_value)}</div>
            <div
              className="acct-change"
              style={{ color: (change ?? 0) >= 0 ? "var(--positive)" : "var(--negative)" }}
            >
              {change === null ? "—" : pct(change)}
              <span className="acct-change-note">heute</span>
            </div>
          </>
        ) : failed ? (
          <div className="acct-empty">Depot gerade nicht abrufbar</div>
        ) : (
          <>
            <div className="skeleton" style={{ height: "26px", width: "60%", marginTop: "4px" }} />
            <div className="skeleton" style={{ height: "13px", width: "35%", marginTop: "7px" }} />
          </>
        )}
      </div>

      {/* Kennzahlen */}
      {data && (
        <div className="acct-stats">
          <Stat label="Positionen" value={String(data.position_count)} />
          <Stat
            label="Grösste Position"
            value={
              data.holdings[0]
                ? `${data.holdings[0].symbol} ${(data.holdings[0].weight * 100).toFixed(0)} %`
                : "—"
            }
          />
          {data.activity ? (
            <>
              <Stat label="Trades (30 T.)" value={String(data.activity.tradeCount30d)} />
              <Stat label="Volumen (30 T.)" value={usd(data.activity.volume30dUsd)} />
              <Stat
                label="Stärkste Position"
                value={`${data.activity.bestPosition.symbol} ${pct(data.activity.bestPosition.changePct)}`}
                tone="pos"
              />
              <Stat
                label="Schwächste"
                value={`${data.activity.worstPosition.symbol} ${pct(data.activity.worstPosition.changePct)}`}
                tone="neg"
              />
            </>
          ) : (
            <>
              <Stat label="Geräte" value={String(data.account.passkeyCount)} />
              <Stat label="Konto seit" value={since ?? "—"} />
            </>
          )}
        </div>
      )}

      {/* Aufteilung als schmale Balken */}
      {data && data.holdings.length > 0 && (
        <div className="acct-alloc">
          <div className="acct-alloc-bar" aria-hidden="true">
            {data.holdings.map((h, i) => (
              <span
                key={h.symbol}
                style={{
                  width: `${h.weight * 100}%`,
                  background: `color-mix(in srgb, var(--green) ${100 - i * 16}%, var(--violet))`,
                }}
              />
            ))}
          </div>
          <ul className="acct-alloc-list">
            {data.holdings.slice(0, 3).map((h) => (
              <li key={h.symbol}>
                <span className="acct-alloc-sym">{h.symbol}</span>
                <span className="acct-alloc-w">{(h.weight * 100).toFixed(1)} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="acct-sep" />

      <button role="menuitem" className="acct-item" onClick={() => go("/dashboard")}>
        Dein Depot
      </button>
      <button role="menuitem" className="acct-item" onClick={() => go("/konto")}>
        Konto &amp; Einstellungen
      </button>
      <button
        role="menuitem"
        className="acct-item"
        onClick={() => {
          navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          });
        }}
      >
        {copied ? "Kopiert ✓" : "Adresse kopieren"}
      </button>
      {!data?.demo && (
        <a
          role="menuitem"
          href={`https://solscan.io/account/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="acct-item"
          onClick={onNavigate}
        >
          Auf Solscan ansehen ↗
        </a>
      )}

      <div className="acct-sep" />

      <button role="menuitem" className="acct-item acct-item-quiet" onClick={onSignOut}>
        {data?.demo ? "Demo verlassen" : "Abmelden"}
      </button>
    </div>
  );
}
