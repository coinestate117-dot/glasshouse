/**
 * Jupiter Ultra API — Angebot einholen und signierte Transaktion abschicken.
 *
 * Wichtig zum Verhalten der Ultra-API (am 24.09. gegen die Live-API geprüft):
 *  - /order ist ein GET mit Query-Parametern. Ein POST antwortet mit 404.
 *  - Ohne `taker` liefert sie nur ein Angebot, `transaction` ist dann null.
 *    Genau das wollen wir für die Vorschau.
 *  - Erst mit `taker` (der Adresse des Nutzers) kommt eine signierbare
 *    Transaktion plus `requestId` zurück.
 *  - Signiert wird ausschliesslich in der Wallet des Nutzers. Wir sehen
 *    keinen Schlüssel und verwahren nichts.
 */

import { getPricesDirect } from "./direct";

const JUPITER_ULTRA_API = "https://lite-api.jup.ag/ultra/v1";

export type JupiterPrice = {
  mint: string;
  price: number;
  change24h: number | null;
};

export type JupiterOrderResult = {
  requestId: string;
  /** base64-kodierte, unsignierte Transaktion. Null, wenn kein `taker` übergeben wurde. */
  transaction: string | null;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
};

export type CopyOrderItem = {
  symbol: string;
  outputMint: string;
  inputMint: string; // standardmässig USDC
  amountUSD: number;
  estimatedOut: number;
  weight: number;
};

// USDC auf Solana Mainnet
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;

/**
 * Preise für mehrere Mints.
 *
 * Nutzt bewusst dieselbe Quelle wie der Rest der App (`getPricesDirect`,
 * Jupiter Price v3). Vorher stand hier eine eigene v2-Adresse, die
 * abgeschaltet ist und mit 404 antwortete.
 */
export async function getPrices(mints: string[]): Promise<Map<string, JupiterPrice>> {
  const direct = await getPricesDirect(mints);
  const out = new Map<string, JupiterPrice>();
  for (const [mint, info] of direct) {
    out.set(mint, { mint, price: info.price, change24h: info.change24h ?? null });
  }
  return out;
}

/**
 * Baut aus dem Depot einer beobachteten Wallet eine Aufteilung für den
 * eigenen Betrag — gewichtet wie im Original.
 *
 * Das Ergebnis ist eine Vorschau. Der Aufrufer muss sie dem Nutzer zeigen,
 * bevor irgendetwas signiert wird.
 */
export async function buildCopyOrderList(
  holdings: Array<{ mint: string; symbol: string; weight: number }>,
  totalUSD: number
): Promise<CopyOrderItem[]> {
  const relevant = holdings.filter((h) => h.weight > 0.005); // Kleinstposten (<0,5 %) weglassen
  if (relevant.length === 0) return [];

  const prices = await getPrices(relevant.map((h) => h.mint));

  // Nach dem Filtern neu normieren, sonst summieren sich die Anteile nicht
  // auf 100 % und der Nutzer gibt weniger aus als eingegeben.
  const totalWeight = relevant.reduce((sum, h) => sum + h.weight, 0) || 1;

  return relevant.map((h) => {
    const normalizedWeight = h.weight / totalWeight;
    const amountUSD = totalUSD * normalizedWeight;
    const price = prices.get(h.mint)?.price ?? 0;

    return {
      symbol: h.symbol,
      outputMint: h.mint,
      inputMint: USDC_MINT,
      amountUSD,
      estimatedOut: price > 0 ? amountUSD / price : 0,
      weight: normalizedWeight,
    };
  });
}

/**
 * Holt ein Ultra-Angebot für einen einzelnen Tausch.
 *
 * Mit `taker` enthält die Antwort eine unsignierte Transaktion, die der
 * Nutzer in seiner Wallet bestätigt. Ohne `taker` ist es nur ein Angebot.
 */
export async function getUltraOrder(
  inputMint: string,
  outputMint: string,
  inputAmountUSDC: number,
  taker?: string
): Promise<JupiterOrderResult> {
  const rawAmount = Math.floor(inputAmountUSDC * 10 ** USDC_DECIMALS);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new Error("Betrag ist zu klein für einen Tausch");
  }

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(rawAmount),
  });
  if (taker) params.set("taker", taker);

  // Referral nur mitschicken, wenn beides konfiguriert ist — ein halb
  // gesetztes Paar lehnt die API ab.
  const referralAccount = process.env.JUPITER_REFERRAL_ACCOUNT;
  const referralFeeBps = process.env.JUPITER_REFERRAL_FEE_BPS;
  if (referralAccount && referralFeeBps) {
    params.set("referralAccount", referralAccount);
    params.set("referralFee", referralFeeBps);
  }

  const res = await fetch(`${JUPITER_ULTRA_API}/order?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jupiter Ultra /order: ${res.status} — ${text.slice(0, 200)}`);
  }

  const json = JSON.parse(text) as JupiterOrderResult & { error?: string };
  if (json.error) throw new Error(`Jupiter Ultra /order: ${json.error}`);

  return json;
}

/**
 * Wie getUltraOrder, aber der Betrag steht bereits in der kleinsten Einheit
 * des Eingangs-Tokens. Wird beim Verkaufen gebraucht: dort geht der Token
 * hinein, und seine Menge lässt sich nicht als USDC-Betrag ausdrücken.
 */
export async function getUltraOrderRawAmount(
  inputMint: string,
  outputMint: string,
  rawAmount: number,
  taker?: string
): Promise<JupiterOrderResult> {
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new Error("Menge ist zu klein für einen Tausch");
  }

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(rawAmount),
  });
  if (taker) params.set("taker", taker);

  const res = await fetch(`${JUPITER_ULTRA_API}/order?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jupiter Ultra /order: ${res.status} — ${text.slice(0, 200)}`);
  }

  const json = JSON.parse(text) as JupiterOrderResult & { error?: string };
  if (json.error) throw new Error(`Jupiter Ultra /order: ${json.error}`);

  return json;
}

/**
 * Schickt die vom Nutzer signierte Transaktion zur Ausführung.
 */
export async function executeUltraOrder(
  requestId: string,
  signedTransaction: string // base64
): Promise<{ signature: string; status: string; error?: string }> {
  const res = await fetch(`${JUPITER_ULTRA_API}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ requestId, signedTransaction }),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jupiter Ultra /execute: ${res.status} — ${text.slice(0, 200)}`);
  }

  const json = JSON.parse(text) as {
    signature?: string;
    status?: string;
    error?: string;
    code?: number;
  };

  // Die API antwortet auch bei einem fehlgeschlagenen Tausch mit 200 und
  // meldet den Fehler im Rumpf — sonst würde der Nutzer "erledigt" sehen,
  // obwohl nichts passiert ist.
  if (json.error || json.status === "Failed" || !json.signature) {
    throw new Error(json.error ?? "Tausch wurde nicht ausgeführt");
  }

  return { signature: json.signature, status: json.status ?? "Success" };
}
