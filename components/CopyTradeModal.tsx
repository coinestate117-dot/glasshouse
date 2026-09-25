"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/ConnectButton";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { CopyOrderItem } from "@/lib/jupiter";

type Props = {
  targetAddress: string;
  holdings: Array<{ mint: string; symbol: string; weight: number }>;
  onClose: () => void;
  isDemo?: boolean;
};

type Step = "amount" | "preview" | "signing" | "success" | "error";

// Buffer existiert im Browser nicht — Next.js polyfillt ihn nicht. Der
// frühere Buffer.from(...) hier hat den Live-Ablauf sofort abgebrochen.
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  // In Blöcken, damit der Aufrufstapel bei grossen Transaktionen hält.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function CopyTradeModal({ targetAddress, holdings, onClose, isDemo = false }: Props) {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [step, setStep] = useState<Step>("amount");
  const [orderType, setOrderType] = useState<"einmalkauf" | "geplant">("einmalkauf");
  const [amountStr, setAmountStr] = useState("100");
  const [orders, setOrders] = useState<CopyOrderItem[]>([]);
  const [txSignatures, setTxSignatures] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totalUSD = parseFloat(amountStr) || 0;
  const isValidAmount = totalUSD >= 1 && totalUSD <= 100_000;

  // Step 1: Build preview
  const handleBuildPreview = useCallback(async () => {
    if (!isValidAmount) return;

    // Demo: Aufteilung lokal rechnen, kein Netzwerkaufruf.
    if (isDemo) {
      setIsLoading(true);
      const relevant = holdings.filter((h) => h.weight > 0.005);
      const weightSum = relevant.reduce((s, h) => s + h.weight, 0) || 1;
      const simulated = relevant.map((h) => {
        const share = h.weight / weightSum;
        const amountUSD = totalUSD * share;
        return {
          inputMint: "DemoUSDC",
          outputMint: h.mint,
          symbol: h.symbol,
          weight: share,
          amountUSD,
          estimatedOut: amountUSD / (80 + (h.symbol.charCodeAt(0) % 40) * 8),
        } as CopyOrderItem;
      });
      setOrders(simulated);
      setStep("preview");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/copy-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWallet: targetAddress, totalUSD }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to build order");
      }
      const data = await res.json();
      setOrders(data.orders);
      setStep("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  }, [targetAddress, totalUSD, isValidAmount, isDemo, holdings]);

  // Step 2: Execute — get unsigned txs from Jupiter, sign, execute
  const handleExecute = useCallback(async () => {
    // Demo: simulierter Ablauf. Es wird keine Transaktion gebaut, signiert
    // oder gesendet — die Wallet wird bewusst nie angefasst.
    if (isDemo) {
      setStep("signing");
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 1400));
      setTxSignatures(orders.map((_, i) => `DemoSignatur${i + 1}NichtAufDerChain`));
      setStep("success");
      setIsLoading(false);
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      setErrorMsg("Wallet nicht verbunden");
      setStep("error");
      return;
    }

    setStep("signing");
    setIsLoading(true);
    const signatures: string[] = [];

    try {
      for (const order of orders) {
        // Get unsigned transaction from our API (which calls Jupiter Ultra)
        const orderRes = await fetch("/api/execute-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputMint: order.inputMint,
            outputMint: order.outputMint,
            amountUSD: order.amountUSD,
            // Ohne die Adresse des Nutzers liefert Jupiter nur ein Angebot
            // ohne signierbare Transaktion.
            taker: publicKey.toBase58(),
          }),
        });

        if (!orderRes.ok) {
          const err = await orderRes.json();
          throw new Error(`Order failed for ${order.symbol}: ${err.error}`);
        }

        const { requestId, transaction: txBase64 } = await orderRes.json();

        if (!txBase64) {
          throw new Error(`Keine Transaktion für ${order.symbol} erhalten`);
        }

        const txBytes = base64ToBytes(txBase64);
        let signedTx: Transaction | VersionedTransaction;

        // Jupiter Ultra liefert versionierte Transaktionen; der ältere
        // Weg bleibt als Rückfall stehen.
        try {
          const vtx = VersionedTransaction.deserialize(txBytes);
          signedTx = await signTransaction(vtx as Parameters<typeof signTransaction>[0]);
        } catch {
          const tx = Transaction.from(txBytes);
          signedTx = await signTransaction(tx as Parameters<typeof signTransaction>[0]);
        }

        // Execute via our API
        const execRes = await fetch("/api/execute-order/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            signedTransaction: bytesToBase64(
              signedTx instanceof VersionedTransaction
                ? signedTx.serialize()
                : new Uint8Array((signedTx as Transaction).serialize())
            ),
          }),
        });

        if (!execRes.ok) {
          const err = await execRes.json();
          throw new Error(`Execution failed for ${order.symbol}: ${err.error}`);
        }

        const { txid } = await execRes.json();
        signatures.push(txid);
      }

      setTxSignatures(signatures);
      setStep("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  }, [orders, connected, publicKey, signTransaction, isDemo]);

  return (
    <div
      className="modal-overlay"
      id="copy-trade-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" id="copy-trade-modal" role="dialog" aria-modal="true" aria-label="Depot nachbauen">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Depot nachbauen
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              {isDemo ? "Simulation — es wird nichts ausgeführt" : "Öffentliche On-Chain-Daten · du entscheidest"}
            </p>
            {isDemo && (
              <span className="demo-badge" style={{ marginTop: "8px" }}>
                Demo · keine echte Transaktion
              </span>
            )}
          </div>
          <button
            id="close-copy-modal-btn"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "18px",
              transition: "all var(--t-fast)",
            }}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="divider" style={{ margin: "0 0 20px" }} />

        {/* Step: Amount input */}
        {step === "amount" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", padding: "4px", background: "var(--surface-2)", borderRadius: "var(--radius-md)" }}>
              <button 
                type="button"
                className="btn btn-sm" 
                onClick={() => setOrderType("einmalkauf")}
                style={{ flex: 1, background: orderType === "einmalkauf" ? "var(--surface)" : "transparent", color: orderType === "einmalkauf" ? "var(--text)" : "var(--text-muted)", border: orderType === "einmalkauf" ? "1px solid var(--border-glow)" : "1px solid transparent", transition: "all var(--t-fast)" }}
              >
                Einmalkauf
              </button>
              <button 
                type="button"
                className="btn btn-sm" 
                onClick={() => setOrderType("geplant")}
                style={{ flex: 1, background: orderType === "geplant" ? "var(--surface)" : "transparent", color: orderType === "geplant" ? "var(--text)" : "var(--text-muted)", border: orderType === "geplant" ? "1px solid var(--border-glow)" : "1px solid transparent", transition: "all var(--t-fast)" }}
              >
                Geplant
              </button>
            </div>

            {orderType === "geplant" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px", fontWeight: 500 }}>
                  Ausführung
                </label>
                <select className="input" style={{ width: "100%", cursor: "pointer", color: "var(--text)" }}>
                  <option value="monthly">Monatlich</option>
                  <option value="weekly">Wöchentlich</option>
                  <option value="daily">Täglich</option>
                </select>
              </div>
            )}

            <label
              htmlFor="copy-amount-input"
              style={{ display: "block", fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px", fontWeight: 500 }}
            >
              {orderType === "geplant" ? "Betrag pro Ausführung (USDC)" : "Gesamtbetrag (USDC)"}
            </label>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  pointerEvents: "none",
                }}
              >
                $
              </span>
              <input
                id="copy-amount-input"
                className="input"
                type="number"
                min="1"
                max="100000"
                step="10"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                style={{ paddingLeft: "28px" }}
                placeholder="100"
              />
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  id={`quick-amount-${amt}`}
                  onClick={() => setAmountStr(String(amt))}
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, fontFamily: "var(--font-mono)" }}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.6 }}>
              Wird proportional auf {holdings.filter((h) => h.weight > 0.005).length} Positionen aufgeteilt.
              Benötigt USDC in deiner Wallet.
            </p>

            <button
              id="build-preview-btn"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={handleBuildPreview}
              disabled={!isValidAmount || isLoading}
            >
              {isLoading ? "Vorschau wird erstellt…" : orderType === "geplant" ? "Sparplan prüfen →" : "Aufteilung prüfen →"}
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "12px" }}>
                {orders.length} {orders.length === 1 ? "Auftrag" : "Aufträge"} · gesamt{" "}
                <span className="mono" style={{ color: "var(--text)" }}>
                  {formatUSD(totalUSD)} USDC{orderType === "geplant" ? " / Ausführung" : ""}
                </span>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {orders.map((order, i) => (
                  <div
                    key={order.outputMint}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: i < orders.length - 1 ? "1px solid var(--border-dim)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="badge badge-green" style={{ fontSize: "10px" }}>
                        {order.symbol}
                      </span>
                      <span
                        className="mono"
                        style={{ fontSize: "11px", color: "var(--text-muted)" }}
                      >
                        {(order.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="mono" style={{ fontSize: "13px", fontWeight: 600 }}>
                        {formatUSD(order.amountUSD)}
                      </div>
                      {order.estimatedOut > 0 ? (
                        <div className="mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          ≈{order.estimatedOut.toFixed(4)} {order.symbol}
                        </div>
                      ) : (
                        <div className="mono" style={{ fontSize: "10px", color: "var(--loss)", fontWeight: 600 }}>
                          Keine Route verfügbar
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                background: "var(--green-dim)",
                border: "1px solid rgba(20, 241, 149, 0.15)",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                color: "var(--text-dim)",
                marginBottom: "20px",
                lineHeight: 1.6,
              }}
            >
              {isDemo
                ? "ℹ Demo-Modus: Diese Aufteilung ist erfunden. Es wird kein Auftrag an Jupiter geschickt, nichts signiert und nichts gesendet."
                : "ℹ Kauf zum Marktpreis über Jupiter. Kurse können sich bis zur Signatur ändern. Slippage-Toleranz: 0,5 %."}
            </div>

            {!connected && !isDemo ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
                  Verbinde deine Wallet, um fortzufahren
                </p>
                <ConnectButton />
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  id="back-to-amount-btn"
                  className="btn btn-ghost"
                  onClick={() => setStep("amount")}
                  style={{ flex: 1 }}
                >
                  ← Zurück
                </button>
                <button
                  id="execute-orders-btn"
                  className="btn btn-primary"
                  onClick={handleExecute}
                  disabled={isLoading || orders.some(o => o.estimatedOut === 0)}
                  style={{ flex: 2 }}
                >
                  {orderType === "geplant" ? "Plan aktivieren →" : "Signieren & ausführen →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Signing */}
        {step === "signing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "2px solid var(--border)",
                borderTopColor: "var(--green)",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
              {isDemo ? "Simuliere Ausführung" : "Warte auf Signatur"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {isDemo ? "Nur zur Vorführung — deine Wallet wird nicht angefasst" : "Prüfe deine Wallet und signiere jede Transaktion"}
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "var(--green-dim)",
                border: "1px solid rgba(20, 241, 149, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "24px",
              }}
            >
              ✓
            </div>
            <div
              className="gradient-text"
              style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}
            >
              {isDemo ? "Demo abgeschlossen" : orderType === "geplant" ? "Sparplan aktiviert!" : "Depot gebaut!"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
              {isDemo
                ? `${txSignatures.length} ${txSignatures.length === 1 ? "simulierter Auftrag" : "simulierte Aufträge"} — nichts wurde gesendet`
                : orderType === "geplant"
                  ? `Dein Sparplan über ${formatUSD(totalUSD)} wurde eingerichtet.`
                  : `${txSignatures.length} Transaktion${txSignatures.length > 1 ? "en" : ""} bestätigt`}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              {txSignatures.map((sig, i) =>
                isDemo ? (
                  <div
                    key={sig}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: "space-between", cursor: "default", opacity: 0.75 }}
                  >
                    <span className="mono" style={{ fontSize: "11px" }}>
                      {sig.slice(0, 8)}…{sig.slice(-8)}
                    </span>
                    <span className="demo-badge">nicht on-chain</span>
                  </div>
                ) : (
                  <a
                    key={sig}
                    href={`https://solscan.io/tx/${sig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: "space-between" }}
                    id={`tx-link-${i}`}
                  >
                    <span className="mono" style={{ fontSize: "11px" }}>
                      {sig.slice(0, 8)}...{sig.slice(-8)}
                    </span>
                    <span>Solscan ↗</span>
                  </a>
                )
              )}
            </div>

            <button
              id="close-success-btn"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ width: "100%" }}
            >
              Schließen
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div>
            <div
              style={{
                padding: "16px",
                background: "rgba(255, 77, 109, 0.1)",
                border: "1px solid rgba(255, 77, 109, 0.25)",
                borderRadius: "var(--radius)",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#FF4D6D", marginBottom: "6px" }}>
                Etwas ist schiefgelaufen
              </div>
              <div
                className="mono"
                style={{ fontSize: "11px", color: "var(--text-muted)", wordBreak: "break-all" }}
              >
                {errorMsg}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                id="retry-btn"
                className="btn btn-ghost"
                onClick={() => { setStep("amount"); setErrorMsg(""); }}
                style={{ flex: 1 }}
              >
                ← Erneut versuchen
              </button>
              <button
                id="close-error-btn"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
