/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Domain types ────────────────────────────────────────────────────────────
export type Asset = {
  id: number;
  symbol: string;
  name: string | null;
  mint: string;
  decimals: number;
  logo_url: string | null;
  updated_at: string;
};

export type Wallet = {
  address: string;
  label: string | null;
  is_curated: boolean;
  is_blocked: boolean;
  first_seen: string;
  updated_at: string;
};

export type Holding = {
  id: number;
  wallet: string;
  mint: string;
  symbol: string;
  raw_amount: number;
  ui_amount: number;
  price_usd: number | null;
  value_usd: number | null;
  weight: number | null;
  updated_at: string;
};

export type PortfolioStats = {
  wallet: string;
  total_value: number;
  position_count: number;
  top_symbol: string | null;
  top_weight: number | null;
  change_24h_pct: number | null;
  rank: number | null;
  updated_at: string;
};

export type Price = {
  mint: string;
  price_usd: number;
  change_24h: number | null;
  updated_at: string;
};

// ── Typed query helpers ──────────────────────────────────────────────────────
// Wraps the raw Supabase client to provide type-safe access without
// requiring generated types from `supabase gen types`.
export type TypedClient = {
  from<T extends keyof Tables>(table: T): any;
  _raw: SupabaseClient<any>;
};

type Tables = {
  assets: Asset;
  wallets: Wallet;
  holdings: Holding;
  portfolio_stats: PortfolioStats;
  prices: Price;
  blocked_addresses: { address: string; reason: string | null; added_at: string };
  users: { wallet_address: string; first_seen: string; last_login: string };
  watchlists: { user_address: string; target_wallet: string; added_at: string };
  portfolio_history: { id: number; wallet: string; snapshot_date: string; total_value: number; position_count: number };
  wallet_notes: { id: number; wallet: string; author: string; content: string; created_at: string; updated_at: string };
  wallet_claims: { wallet: string; claimed_by: string; status: string; verification_url: string | null; created_at: string; updated_at: string };
};

function wrapClient(raw: SupabaseClient<any>): TypedClient {
  return {
    from: (table) => raw.from(table),
    _raw: raw,
  };
}

// ── Client factories ─────────────────────────────────────────────────────────
function getUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

// Server-side client (service role key — bypasses RLS). Only for API routes.
export function createServerClient(): TypedClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return wrapClient(
    createClient(getUrl(), serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  );
}

// Client-side singleton (anon key)
let _clientSingleton: TypedClient | null = null;
export function getSupabase(): TypedClient {
  if (!_clientSingleton) {
    _clientSingleton = wrapClient(
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
      )
    );
  }
  return _clientSingleton;
}

export const supabase = {
  get client() { return getSupabase(); },
};
