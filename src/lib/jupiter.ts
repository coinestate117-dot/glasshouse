import { VersionedTransaction } from "@solana/web3.js";

const JUPITER_API = "https://lite-api.jup.ag/ultra/v1";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;

/** Minimum USDC per order in smallest units ($0.50) */
export const MIN_ORDER_AMOUNT = 500_000;

export interface JupiterOrderResponse {
  requestId: string;
  transaction: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct?: string;
  error?: string;
  errorCode?: string;
}

export interface JupiterExecuteResponse {
  status: "Success" | "Failed" | "Pending";
  signature: string;
  error?: string;
}

export async function createOrder(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  taker: string;
}): Promise<JupiterOrderResponse> {
  const res = await fetch(`${JUPITER_API}/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      taker: params.taker,
      swapMode: "ExactIn",
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      data.error || data.message || `Jupiter order failed (${res.status})`
    );
  }

  return data;
}

export async function executeOrder(
  signedTransaction: string,
  requestId: string
): Promise<JupiterExecuteResponse> {
  const res = await fetch(`${JUPITER_API}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId }),
  });

  const data = await res.json();

  if (!res.ok && !data.status) {
    throw new Error(
      data.error || data.message || `Jupiter execute failed (${res.status})`
    );
  }

  return data;
}

/** Deserialize a base64 transaction from Jupiter */
export function deserializeTx(base64: string): VersionedTransaction {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return VersionedTransaction.deserialize(bytes);
}

/** Serialize a signed transaction to base64 */
export function serializeTx(tx: VersionedTransaction): string {
  const bytes = tx.serialize();
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert a USD amount to USDC smallest units */
export function usdToLamports(usd: number): number {
  return Math.floor(usd * 10 ** USDC_DECIMALS);
}

/** Friendly error messages for common Jupiter errors */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("No route found") || msg.includes("ROUTE_NOT_FOUND"))
    return "No swap route available for this token";
  if (msg.includes("Slippage") || msg.includes("slippage"))
    return "Price moved too much, try again";
  if (msg.includes("insufficient") || msg.includes("Insufficient"))
    return "Not enough USDC balance";
  if (msg.includes("expired") || msg.includes("Expired"))
    return "Transaction expired, try again";
  if (msg.includes("rejected") || msg.includes("Rejected"))
    return "Transaction rejected";
  if (msg.length > 80) return "Swap failed — try again later";
  return msg;
}
