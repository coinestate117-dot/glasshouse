import type { TokenStats } from "@/lib/tokenStats";

const compact = (n: number) =>
  n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(2)} Mrd.`
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)} Mio.`
      : n >= 1_000
        ? `$${(n / 1_000).toFixed(1)} Tsd.`
        : `$${n.toFixed(2)}`;

const num = (n: number) => n.toLocaleString("de-CH", { maximumFractionDigits: 0 });

function Pct({ v }: { v: number | null }) {
  if (v === null) return <span className="ts-val">—</span>;
  return (
    <span className="ts-val" style={{ color: v >= 0 ? "var(--positive)" : "var(--negative)" }}>
      {v >= 0 ? "+" : "−"}
      {Math.abs(v).toFixed(2)} %
    </span>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ts-cell">
      <span className="ts-label">{label}</span>
      {children}
    </div>
  );
}

export function TokenStatsPanel({ stats }: { stats: TokenStats }) {
  const day = stats.day;
  const dayVolume = day ? day.buyVolume + day.sellVolume : null;
  // Kauf-Anteil am Tagesvolumen — sagt mehr als die reine Volumensumme.
  const buyShare = day && dayVolume ? (day.buyVolume / dayVolume) * 100 : null;

  const under = stats.underlying;
  const spread =
    under?.price && stats.usdPrice
      ? ((stats.usdPrice - under.price) / under.price) * 100
      : null;

  return (
    <div className="ts-wrap">
      {/* Kursveränderung über mehrere Zeiträume */}
      <div className="ts-grid ts-grid-4">
        <Cell label="1 Stunde"><Pct v={stats.change.h1} /></Cell>
        <Cell label="24 Stunden"><Pct v={stats.change.h24} /></Cell>
        <Cell label="7 Tage"><Pct v={stats.change.d7} /></Cell>
        <Cell label="30 Tage"><Pct v={stats.change.d30} /></Cell>
      </div>

      {/* Handel und Markttiefe */}
      <div className="ts-grid ts-grid-2">
        <Cell label="Volumen 24 h">
          <span className="ts-val">{dayVolume === null ? "—" : compact(dayVolume)}</span>
        </Cell>
        <Cell label="Liquidität">
          <span className="ts-val">{compact(stats.liquidity)}</span>
        </Cell>
        <Cell label="Händler 24 h">
          <span className="ts-val">{day ? num(day.numTraders) : "—"}</span>
        </Cell>
        <Cell label="Halter">
          <span className="ts-val">{num(stats.holderCount)}</span>
        </Cell>
        <Cell label="Marktkapitalisierung">
          <span className="ts-val">{compact(stats.mcap)}</span>
        </Cell>
        <Cell label="Umlaufmenge">
          <span className="ts-val">{num(stats.circSupply)}</span>
        </Cell>
      </div>

      {/* Kauf/Verkauf-Verhältnis als Balken */}
      {day && buyShare !== null && (
        <div className="ts-flow">
          <div className="ts-flow-head">
            <span>
              Käufe <strong>{num(day.numBuys)}</strong>
            </span>
            <span>
              Verkäufe <strong>{num(day.numSells)}</strong>
            </span>
          </div>
          <div className="ts-flow-bar" aria-hidden="true">
            <span style={{ width: `${buyShare}%`, background: "var(--positive)" }} />
            <span style={{ width: `${100 - buyShare}%`, background: "var(--negative)" }} />
          </div>
          <div className="ts-flow-note">
            {buyShare.toFixed(1)} % des Tagesvolumens entfielen auf Käufe
          </div>
        </div>
      )}

      {/* Vergleich mit der zugrunde liegenden Aktie */}
      {under?.price && (
        <div className="ts-under">
          <div className="ts-under-head">
            Zugrunde liegende Aktie
            {under.tradingHours && <span className="ts-chip">{under.tradingHours}</span>}
          </div>
          <div className="ts-under-body">
            <div>
              <span className="ts-label">
                {under.symbol ?? "Aktie"}
                {under.name ? ` · ${under.name}` : ""}
              </span>
              <span className="ts-val ts-val-lg">
                ${under.price.toFixed(2)}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="ts-label">Abweichung des Tokens</span>
              <span
                className="ts-val ts-val-lg"
                style={{ color: (spread ?? 0) >= 0 ? "var(--positive)" : "var(--negative)" }}
              >
                {spread === null ? "—" : `${spread >= 0 ? "+" : "−"}${Math.abs(spread).toFixed(2)} %`}
              </span>
            </div>
          </div>
          <p className="ts-under-note">
            Der Token wird durchgehend on-chain gehandelt, die Aktie nur zu Börsenzeiten.
            Abweichungen sind dadurch normal und keine Aussage über den Wert.
          </p>
        </div>
      )}
    </div>
  );
}
