import fs from "fs";
import path from "path";
import type { WalletType } from "@/types";

interface WalletPosition {
  asset_symbol: string;
  mint_address: string;
  ui_amount: number;
  value_usd: number;
  pct: number;
  underlying_symbol: string;
  logo_url: string | null;
}

export interface WalletData {
  address: string;
  total_value_usd: number;
  change_24h_pct: number;
  position_count: number;
  wallet_type: WalletType;
  xstock_count: number;
  xstock_ratio: number;
  sol_balance: number;
  recent_tx_count: number;
  positions: WalletPosition[];
}

interface PriceData {
  mint_address: string;
  symbol: string;
  underlying_symbol: string;
  price_usd: number;
  prev_close_usd: number | null;
}

const dataDir = path.join(process.cwd(), "data");

function readJson<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

let walletsCache: WalletData[] | null = null;
let pricesCache: PriceData[] | null = null;

export function getWallets(): WalletData[] {
  if (!walletsCache) {
    walletsCache = readJson<WalletData[]>("wallets.json");
  }
  return walletsCache;
}

export function getWallet(address: string): WalletData | undefined {
  return getWallets().find((w) => w.address === address);
}

export function getPrices(): PriceData[] {
  if (!pricesCache) {
    pricesCache = readJson<PriceData[]>("prices.json");
  }
  return pricesCache;
}
