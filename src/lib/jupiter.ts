import { VersionedTransaction } from "@solana/web3.js";

const JUPITER_API = "https://api.jup.ag/swap/v1";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;

/** Minimum USDC per order in smallest units ($0.50) */
export const MIN_ORDER_AMOUNT = 500_000;

function apiKey(): string {
  const key = process.env.NEXT_PUBLIC_JUPITER_API_KEY ?? "";
  if (!key) throw new Error("NEXT_PUBLIC_JUPITER_API_KEY not set");
  return key;
}

/* ─── Quote ─── */

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: {
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
    };
    percent: number;
  }[];
  contextSlot: number;
  timeTaken: number;
  error?: string;
}

export async function getQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}): Promise<QuoteResponse> {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: String(params.amount),
    slippageBps: String(params.slippageBps ?? 50),
  });

  const res = await fetch(`${JUPITER_API}/quote?${qs}`, {
    headers: { "x-api-key": apiKey() },
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `Quote failed (${res.status})`);
  }

  return data;
}

/* ─── Swap (build transaction) ─── */

export interface SwapResponse {
  swapTransaction: string; // base64 encoded
  lastValidBlockHeight: number;
}

export async function buildSwap(
  quoteResponse: QuoteResponse,
  userPublicKey: string
): Promise<SwapResponse> {
  const res = await fetch(`${JUPITER_API}/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `Swap build failed (${res.status})`);
  }

  return data;
}

/* ─── Transaction helpers ─── */

/** Deserialize a base64 transaction from Jupiter */
export function deserializeTx(base64: string): VersionedTransaction {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
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

/** Friendly error messages for common Jupiter/swap errors */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("No route") || msg.includes("ROUTE_NOT_FOUND"))
    return "No swap route available";
  if (msg.includes("lippage"))
    return "Price moved too much, try again";
  if (msg.includes("nsufficient"))
    return "Not enough USDC balance";
  if (msg.includes("xpir"))
    return "Transaction expired, try again";
  if (msg.includes("eject"))
    return "Transaction rejected";
  if (msg.includes("API_KEY"))
    return "API configuration error";
  if (msg.length > 80) return "Swap failed — try again later";
  return msg;
}
