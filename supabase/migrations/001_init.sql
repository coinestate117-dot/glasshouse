-- Glasshouse Supabase Schema
-- Run: supabase db push or paste into Supabase SQL editor

-- xStocks asset list (cached from xstocks.fi API)
CREATE TABLE IF NOT EXISTS assets (
  id          SERIAL PRIMARY KEY,
  symbol      TEXT NOT NULL UNIQUE,
  name        TEXT,
  mint        TEXT NOT NULL UNIQUE,
  decimals    INTEGER NOT NULL DEFAULT 6,
  logo_url    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tracked wallets (filtered, real user wallets only)
CREATE TABLE IF NOT EXISTS wallets (
  address     TEXT PRIMARY KEY,
  label       TEXT,              -- optional curated label
  is_curated  BOOLEAN DEFAULT FALSE,
  is_blocked  BOOLEAN DEFAULT FALSE,
  first_seen  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings per wallet
CREATE TABLE IF NOT EXISTS holdings (
  id           SERIAL PRIMARY KEY,
  wallet       TEXT NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  mint         TEXT NOT NULL REFERENCES assets(mint) ON DELETE CASCADE,
  symbol       TEXT NOT NULL,
  raw_amount   BIGINT NOT NULL,
  ui_amount    NUMERIC(30, 10) NOT NULL,
  price_usd    NUMERIC(20, 6),
  value_usd    NUMERIC(20, 6),
  weight       NUMERIC(8, 6),    -- 0..1
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet, mint)
);

-- Aggregated portfolio stats per wallet
CREATE TABLE IF NOT EXISTS portfolio_stats (
  wallet         TEXT PRIMARY KEY REFERENCES wallets(address) ON DELETE CASCADE,
  total_value    NUMERIC(20, 6) NOT NULL DEFAULT 0,
  position_count INTEGER NOT NULL DEFAULT 0,
  top_symbol     TEXT,
  top_weight     NUMERIC(8, 6),
  change_24h_pct NUMERIC(10, 4),
  rank           INTEGER,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Price cache (Jupiter)
CREATE TABLE IF NOT EXISTS prices (
  mint        TEXT PRIMARY KEY REFERENCES assets(mint),
  price_usd   NUMERIC(20, 6) NOT NULL,
  change_24h  NUMERIC(10, 4),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked addresses (AMM pools, CEX, treasury)
CREATE TABLE IF NOT EXISTS blocked_addresses (
  address   TEXT PRIMARY KEY,
  reason    TEXT,
  added_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed known blocked addresses
INSERT INTO blocked_addresses (address, reason) VALUES
  -- Raydium AMM pools (xStocks)
  ('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', 'Raydium v4 authority'),
  ('7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5', 'Orca Whirlpools authority'),
  -- Backed Finance treasury (xStocks issuer)
  ('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'Backed Finance treasury'),
  -- CEX hot wallets
  ('5tzFkiKscXHK5ZXCGbCqAKKRdPiSNJH6CdPTaKUhWRo1', 'Binance hot wallet'),
  ('GVUbFMpFYwAFDR29DKJGT62kCGYVjEBJpZ72Ge8FKHRR', 'Coinbase hot wallet')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_holdings_wallet ON holdings(wallet);
CREATE INDEX IF NOT EXISTS idx_holdings_mint ON holdings(mint);
CREATE INDEX IF NOT EXISTS idx_portfolio_stats_rank ON portfolio_stats(rank);
CREATE INDEX IF NOT EXISTS idx_portfolio_stats_value ON portfolio_stats(total_value DESC);
