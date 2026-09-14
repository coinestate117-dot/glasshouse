import { Connection } from "@solana/web3.js";

const apiKey = process.env.HELIUS_API_KEY!;

export const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
  "confirmed"
);

// Raw JSON-RPC call for methods not in @solana/web3.js
export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }
  );
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}
