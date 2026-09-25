/**
 * getCorrectBalance — THE authoritative function for xStocks token balances.
 *
 * xStocks use Token-2022 with Scaled UI Amount Extension.
 * The `multiplier` field in the Mint account may be STALE if a corporate
 * action (dividend, split) occurred and `newMultiplierEffectiveTimestamp` has passed.
 *
 * RULE: Never call `rawAmount / 10^decimals` yourself. Always use this function
 * or `getTokenAccountBalance` (which returns `uiAmount` already adjusted).
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getMultiplier } from "./xstocks";

function getHeliusConnection(): Connection {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error("Missing HELIUS_API_KEY");
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, "confirmed");
}

export type CorrectBalanceResult = {
  uiAmount: number;
  rawAmount: bigint;
  decimals: number;
  multiplierUsed: number;
};

/**
 * Get the correct UI balance for a token account, handling xStocks multiplier transitions.
 *
 * @param tokenAccountAddress - The SPL token account address (NOT the wallet owner address)
 */
export async function getCorrectBalance(
  tokenAccountAddress: string | PublicKey
): Promise<CorrectBalanceResult> {
  const conn = getHeliusConnection();
  const pubkey =
    typeof tokenAccountAddress === "string"
      ? new PublicKey(tokenAccountAddress)
      : tokenAccountAddress;

  // getTokenAccountBalance from Helius already applies the correct scaled UI amount
  // for Token-2022 accounts, including the newMultiplier if the effective timestamp has passed.
  const resp = await conn.getTokenAccountBalance(pubkey);
  const { amount, decimals, uiAmount } = resp.value;

  if (uiAmount === null) {
    throw new Error(`Could not determine UI amount for token account ${pubkey.toBase58()}`);
  }

  return {
    uiAmount,
    rawAmount: BigInt(amount),
    decimals,
    // multiplierUsed is approximate — the RPC applies it internally
    multiplierUsed: uiAmount / (Number(amount) / Math.pow(10, decimals)),
  };
}

/**
 * Compute the correct UI balance from raw amount + symbol, resolving the
 * xStocks multiplier transition correctly. Use this when you have raw amount
 * but no RPC call available (e.g., batch processing).
 *
 * @param rawAmount - Raw token amount (as stored in the token account)
 * @param decimals  - Token decimals
 * @param symbol    - xStocks symbol (e.g., "NVDAx") for multiplier lookup
 */
export async function computeCorrectBalance(
  rawAmount: bigint,
  decimals: number,
  symbol: string
): Promise<number> {
  const { multiplier, newMultiplier, newMultiplierEffectiveTimestamp } =
    await getMultiplier(symbol);

  const nowSec = Math.floor(Date.now() / 1000);
  const effectiveMultiplier =
    newMultiplier !== null &&
    newMultiplierEffectiveTimestamp !== null &&
    nowSec >= newMultiplierEffectiveTimestamp
      ? newMultiplier
      : multiplier;

  const base = Number(rawAmount) / Math.pow(10, decimals);
  return base * effectiveMultiplier;
}
