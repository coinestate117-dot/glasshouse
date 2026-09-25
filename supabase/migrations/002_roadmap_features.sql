-- Migration 002: Roadmap Features
-- Add tables for Watchlists, History, Curation, and Claims

-- 1. Users (Auth via wallet signature)
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  first_seen     TIMESTAMPTZ DEFAULT NOW(),
  last_login     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Watchlists (Users watching specific wallets)
CREATE TABLE IF NOT EXISTS watchlists (
  user_address   TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  target_wallet  TEXT NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  added_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_address, target_wallet)
);

-- 3. Portfolio History (Daily snapshots for history chart)
CREATE TABLE IF NOT EXISTS portfolio_history (
  id             SERIAL PRIMARY KEY,
  wallet         TEXT NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  snapshot_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value    NUMERIC(20, 6) NOT NULL,
  position_count INTEGER NOT NULL,
  UNIQUE (wallet, snapshot_date)
);

-- 4. Community Notes (Light social layer)
CREATE TABLE IF NOT EXISTS wallet_notes (
  id             SERIAL PRIMARY KEY,
  wallet         TEXT NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  author         TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wallet Claims (Public figures claiming a wallet)
CREATE TABLE IF NOT EXISTS wallet_claims (
  wallet         TEXT PRIMARY KEY REFERENCES wallets(address) ON DELETE CASCADE,
  claimed_by     TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  verification_url TEXT, -- e.g. tweet URL for verification
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only add if not already present, we'll just try to create the triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_notes_updated_at') THEN
    CREATE TRIGGER update_wallet_notes_updated_at
        BEFORE UPDATE ON wallet_notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_claims_updated_at') THEN
    CREATE TRIGGER update_wallet_claims_updated_at
        BEFORE UPDATE ON wallet_claims
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_address);
CREATE INDEX IF NOT EXISTS idx_watchlists_target ON watchlists(target_wallet);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_wallet_date ON portfolio_history(wallet, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_notes_wallet ON wallet_notes(wallet);
