"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { MarketRow } from "@/lib/markets";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Buffer gibt es im Browser nicht — Next.js polyfillt ihn nicht.
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

type Step = "eingabe" | "signieren" | "fertig" | "fehler";

const QUICK_USD = [50, 100, 250, 500];
const QUICK_PCT = [25, 50, 75, 100];

export function TradePanel({
  row,
  usdcAvailable,
  /** Wie viele Anteile dieses Titels der Nutzer hält — Obergrenze beim Verkaufen. */
  heldAmount = 0,
  side = "kaufen",
  isDemo,
  onClose,
  onDone,
}: {
  row: MarketRow;
  usdcAvailable: number;
  heldAmount?: number;
  side?: "kaufen" | "verkaufen";
  isDemo: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { connected, publicKey, signTransaction } = useWallet();
  const sell = side === "verkaufen";
  // Beim Kaufen steht hier ein USDC-Betrag, beim Verkaufen eine Anzahl Anteile.
  const [amount, setAmount] = useState(sell ? "" : "100");
  const [step, setStep] = useState<Step>("eingabe");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const entered = parseFloat(amount) || 0;
  const price = row.price ?? 0;

  // Kaufen: Betrag in USDC → Anteile. Verkaufen: Anteile → Erlös in USDC.
  const usd = sell ? entered * price : entered;
  const shares = sell ? entered : price > 0 ? entered / price : 0;

  const valid = sell ? entered > 0 && entered <= heldAmount : usd >= 1 && usd <= 100_000;
  const overBalance = sell ? entered > heldAmount : !isDemo && usd > usdcAvailable;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buy = async () => {
    setError("");

    // Demo: nichts wird gebaut, signiert oder gesendet.
    if (isDemo) {
      setStep("signieren");
      await new Promise((r) => setTimeout(r, 1200));
      setSignature("DemoSignaturNichtAufDerChain");
      setStep("fertig");
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      setError("Bitte zuerst die Wallet verbinden.");
      setStep("fehler");
      return;
    }

    setStep("signieren");
    try {
      const res = await fetch("/api/execute-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sell
            ? {
                // Verkaufen: Token hinein, USDC heraus.
                inputMint: row.mint,
                outputMint: USDC_MINT,
                sellAmount: entered,
                sellDecimals: row.decimals,
                taker: publicKey.toBase58(),
              }
            : {
                outputMint: row.mint,
                amountUSD: usd,
                taker: publicKey.toBase58(),
              }
        ),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Auftrag konnte nicht vorbereitet werden");

      const bytes = base64ToBytes(order.transaction);
      let signed: Transaction | VersionedTransaction;
      try {
        const vtx = VersionedTransaction.deserialize(bytes);
        signed = await signTransaction(vtx as Parameters<typeof signTransaction>[0]);
      } catch {
        const tx = Transaction.from(bytes);
        signed = await signTransaction(tx as Parameters<typeof signTransaction>[0]);
      }

      const confirmRes = await fetch("/api/execute-order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: order.requestId,
          signedTransaction: bytesToBase64(
            signed instanceof VersionedTransaction
              ? signed.serialize()
              : new Uint8Array((signed as Transaction).serialize())
          ),
        }),
      });
      const done = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(done.error ?? "Tausch fehlgeschlagen");

      setSignature(done.txid ?? done.signature ?? null);
      setStep("fertig");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ablehnen in der Wallet ist kein Fehler, sondern eine Entscheidung.
      if (/reject|denied|cancel/i.test(msg)) {
        setStep("eingabe");
        return;
      }
      setError(msg);
      setStep("fehler");
    }
  };

  return (
    <>
      <div className="tp-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="tp" role="dialog" aria-modal="true" aria-label={`${row.symbol} ${sell ? "verkaufen" : "kaufen"}`}>
        <div className="tp-head">
          <div>
            <div className="tp-sym">{row.symbol}</div>
            <div className="tp-name">{row.name.replace(" xStock", "")}</div>
          </div>
          <div className="tp-price">
            {row.price === null ? "—" : `$${row.price.toFixed(2)}`}
            {row.change24h !== null && (
              <span
                className="tp-change"
                style={{ color: row.change24h >= 0 ? "var(--positive)" : "var(--negative)" }}
              >
                {row.change24h >= 0 ? "+" : "−"}
                {Math.abs(row.change24h).toFixed(2)} %
              </span>
            )}
          </div>
          <span className={`tp-side ${sell ? "is-sell" : ""}`}>{sell ? "Verkaufen" : "Kaufen"}</span>
        <button className="tp-close" onClick={onClose} aria-label="Schliessen">
            ✕
          </button>
        </div>

        {step === "eingabe" && (
          <div className="tp-body">
            <label className="tp-label" htmlFor="tp-amount">
              {sell ? `Anzahl ${row.symbol}` : "Betrag in USDC"}
            </label>
            <input
              id="tp-amount"
              className="tp-input"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              autoFocus
            />

            <div className="tp-quick">
              {sell
                ? QUICK_PCT.map((p) => (
                    <button
                      key={p}
                      className="tp-quick-btn"
                      onClick={() => setAmount(((heldAmount * p) / 100).toFixed(4))}
                      disabled={heldAmount <= 0}
                    >
                      {p} %
                    </button>
                  ))
                : QUICK_USD.map((v) => (
                    <button key={v} className="tp-quick-btn" onClick={() => setAmount(String(v))}>
                      ${v}
                    </button>
                  ))}
            </div>

            <dl className="tp-summary">
              <div>
                <dt>Du erhältst ca.</dt>
                <dd>
                  {sell
                    ? usd > 0
                      ? `$${usd.toFixed(2)} USDC`
                      : "—"
                    : `${shares > 0 ? shares.toFixed(4) : "—"} ${row.symbol}`}
                </dd>
              </div>
              <div>
                <dt>Verfügbar</dt>
                <dd>
                  {sell
                    ? `${heldAmount.toFixed(4)} ${row.symbol}`
                    : `$${usdcAvailable.toFixed(2)} USDC`}
                </dd>
              </div>
            </dl>

            {overBalance && (
              <p className="tp-warn">
                {sell
                  ? `Du hältst nur ${heldAmount.toFixed(4)} ${row.symbol}.`
                  : "Dein USDC-Guthaben reicht für diesen Betrag nicht aus."}
              </p>
            )}
            {!sell && !valid && usd > 0 && (
              <p className="tp-warn">Der Betrag muss zwischen 1 und 100 000 USDC liegen.</p>
            )}
            {sell && heldAmount <= 0 && (
              <p className="tp-warn">Du hältst diesen Titel derzeit nicht.</p>
            )}

            <button
              className={`tp-cta ${sell ? "tp-cta-sell" : ""}`}
              onClick={buy}
              disabled={!valid || overBalance}
            >
              {sell ? `${row.symbol} verkaufen` : `${row.symbol} kaufen`}
              {isDemo ? " (Demo)" : ""}
            </button>

            <p className="tp-note">
              {isDemo
                ? "Im Demo-Modus wird keine Transaktion gebaut, signiert oder gesendet."
                : "Du bestätigst und signierst die Transaktion selbst in deiner Wallet. Glasshouse verwahrt keine Gelder."}
            </p>
          </div>
        )}

        {step === "signieren" && (
          <div className="tp-body tp-center">
            <span className="spinner" aria-hidden="true" />
            <p>{isDemo ? "Vorgang wird vorgeführt …" : "Warte auf deine Bestätigung in der Wallet …"}</p>
          </div>
        )}

        {step === "fertig" && (
          <div className="tp-body tp-center">
            <div className="tp-done">✓</div>
            <p>
              {sell
                ? `${entered.toFixed(4)} ${row.symbol} in USDC getauscht.`
                : `${usd.toFixed(2)} USDC in ${row.symbol} getauscht.`}
            </p>
            {signature && !isDemo && (
              <a
                className="tp-link"
                href={`https://solscan.io/tx/${signature}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Auf Solscan ansehen ↗
              </a>
            )}
            <button
              className="tp-cta"
              onClick={() => {
                onDone();
                onClose();
              }}
            >
              Fertig
            </button>
          </div>
        )}

        {step === "fehler" && (
          <div className="tp-body tp-center">
            <p className="tp-warn">{error}</p>
            <button className="tp-cta" onClick={() => setStep("eingabe")}>
              Nochmal versuchen
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
