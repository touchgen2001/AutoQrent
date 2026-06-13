-- Cebindegaleri Super Admin DB-backed account system

CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SUPPORT_AGENT',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  password_hash TEXT NOT NULL,
  password_hash_scheme TEXT NOT NULL DEFAULT 'scrypt:v1',
  password_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_revoked_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip_hash TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_accounts_username_lowercase CHECK (username = lower(username)),
  CONSTRAINT admin_accounts_username_shape CHECK (username ~ '^[a-z0-9._-]{3,64}$'),
  CONSTRAINT admin_accounts_role_check CHECK (role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN')),
  CONSTRAINT admin_accounts_status_check CHECK (status IN ('ACTIVE', 'FROZEN', 'DISABLED')),
  CONSTRAINT admin_accounts_failed_login_count_check CHECK (failed_login_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_accounts_username_active
  ON admin_accounts (username)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_accounts_status_role
  ON admin_accounts (status, role)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_accounts_last_login
  ON admin_accounts (last_login_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION set_admin_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_accounts_updated_at ON admin_accounts;
CREATE TRIGGER trg_admin_accounts_updated_at
  BEFORE UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_accounts_updated_at();

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE admin_accounts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin_accounts TO service_role;

DROP POLICY IF EXISTS "Service role manage admin accounts" ON admin_accounts;
CREATE POLICY "Service role manage admin accounts" ON admin_accounts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
