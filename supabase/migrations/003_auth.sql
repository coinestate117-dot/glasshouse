-- Glasshouse Auth: Sign-In with Solana + Passkeys
-- Ausführen: supabase db push oder im Supabase SQL-Editor einfügen.
--
-- Es werden bewusst KEINE personenbezogenen Daten gespeichert: nur die
-- öffentliche Solana-Adresse und öffentliche Passkey-Schlüssel. Kein KYC,
-- keine E-Mail, keine Verwahrung.

CREATE TABLE IF NOT EXISTS app_users (
  address       TEXT PRIMARY KEY,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_passkeys (
  credential_id TEXT PRIMARY KEY,
  address       TEXT NOT NULL REFERENCES app_users(address) ON DELETE CASCADE,
  public_key    TEXT NOT NULL,          -- base64url, öffentlicher Teil
  counter       BIGINT NOT NULL DEFAULT 0,
  transports    TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_passkeys_address ON app_passkeys(address);

-- Zugriff läuft ausschließlich über den Service-Role-Key auf dem Server.
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_passkeys ENABLE ROW LEVEL SECURITY;
