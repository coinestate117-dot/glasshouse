export interface XStockAsset {
  id: string;
  name: string;
  symbol: string;
  underlyingSymbol: string;
  logo: string;
  isTradingHalted: boolean;
  deployments: XStockDeployment[];
}

export interface XStockDeployment {
  address: string;
  network: string;
  supportsAtomicSwaps: boolean;
}

export interface XStockMultiplier {
  currentMultiplier: number;
  newMultiplier: number;
  activationDateTime: number;
  reason: string | null;
}

export interface GhAsset {
  symbol: string;
  name: string;
  underlying_symbol: string;
  mint_address: string;
  decimals: number;
  logo_url: string | null;
  current_multiplier: number;
  new_multiplier: number;
  activation_timestamp: number;
}

export interface GhWallet {
  address: string;
  total_value_usd: number;
  change_24h_pct: number;
  position_count: number;
  last_synced: string;
}

export interface GhPosition {
  id?: number;
  wallet_address: string;
  asset_symbol: string;
  mint_address: string;
  ui_amount: number;
  value_usd: number;
  pct: number;
}

export interface GhPrice {
  mint_address: string;
  symbol: string;
  underlying_symbol: string;
  price_usd: number;
  prev_close_usd: number | null;
}

export interface TokenAccountInfo {
  address: string;
  owner: string;
  mint: string;
  uiAmount: number;
  rawAmount: string;
  decimals: number;
}

export interface SyncResult {
  assets: number;
  multipliers: number;
  candidateWallets: number;
  filteredWallets: number;
  positions: number;
  prices: number;
  topWallets: { address: string; value: number }[];
}
