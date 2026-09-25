"use client";

type Props = {
  totalValue: number | null;
  change24h: number | null;
  usdc: number | null;
  positions: number | null;
  /** Ist die zugrunde liegende Börse gerade offen? null = unbekannt. */
  marketOpen: boolean | null;
  nextChangeAt: string | null;
  isDemo: boolean;
  loading: boolean;
};

const usd = (n: number, digits = 2) =>
  n.toLocaleString("de-CH", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function nextChangeLabel(iso: string | null, open: boolean | null): string | null {
  if (!iso || open === null) return null;
  const then = new Date(iso).getTime();
  const mins = Math.round((then - Date.now()) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return null;

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dur = h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
  return open ? `Schliesst in ${dur}` : `Öffnet in ${dur}`;
}

function Item({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  loading?: boolean;
}) {
  return (
    <div className="strip-item">
      <span className="strip-label">{label}</span>
      {loading ? (
        <span className="skeleton" style={{ height: "15px", width: "64px", display: "block", marginTop: "3px" }} />
      ) : (
        <span
          className="strip-value"
          style={tone ? { color: tone === "pos" ? "var(--positive)" : "var(--negative)" } : undefined}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/**
 * Kennzahlenleiste über dem Dashboard.
 *
 * Bewusst ohne Margin-, Hebel- oder Sicherheitsangaben: Glasshouse verwahrt
 * keine Gelder und vergibt keinen Kredit, deshalb gibt es hier weder eine
 * Margin-Auslastung noch einen Nachschusspunkt. Angezeigt wird nur, was
 * tatsächlich existiert.
 */
export function AccountStrip({
  totalValue,
  change24h,
  usdc,
  positions,
  marketOpen,
  nextChangeAt,
  isDemo,
  loading,
}: Props) {
  const invested = totalValue ?? 0;
  const free = usdc ?? 0;
  const equity = invested + free;
  const changeAbs = totalValue !== null && change24h !== null ? (totalValue * change24h) / 100 : null;
  const hint = nextChangeLabel(nextChangeAt, marketOpen);

  return (
    <div className="strip">
      <div className="strip-scroll">
        <Item label="Gesamtwert" value={usd(equity, 2)} loading={loading} />
        <Item
          label="Tagesveränderung"
          value={
            change24h === null
              ? "—"
              : `${change24h >= 0 ? "+" : "−"}${Math.abs(change24h).toFixed(2)} %${
                  changeAbs !== null ? ` · ${changeAbs >= 0 ? "+" : "−"}${usd(Math.abs(changeAbs))}` : ""
                }`
          }
          tone={change24h === null ? undefined : change24h >= 0 ? "pos" : "neg"}
          loading={loading}
        />
        <Item label="Investiert" value={usd(invested, 2)} loading={loading} />
        <Item label="USDC verfügbar" value={usd(free, 2)} loading={loading} />
        <Item label="Positionen" value={positions === null ? "—" : String(positions)} loading={loading} />

        <div className="strip-item strip-item-market">
          <span className="strip-label">Markt</span>
          {marketOpen === null ? (
            <span className="strip-value">—</span>
          ) : (
            <span className="strip-value strip-market">
              <span className={`strip-dot ${marketOpen ? "is-open" : "is-closed"}`} aria-hidden="true" />
              {marketOpen ? "Offen" : "Geschlossen"}
              {hint && <span className="strip-hint">{hint}</span>}
            </span>
          )}
        </div>
      </div>

      {isDemo && <span className="strip-demo">Demo</span>}
    </div>
  );
}
