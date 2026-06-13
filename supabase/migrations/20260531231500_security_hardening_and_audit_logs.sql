-- Security hardening + centralized audit logs

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  ip_hash TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
CREATE POLICY "Admin read audit logs" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Owner read own audit logs" ON audit_logs;
CREATE POLICY "Owner read own audit logs" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    actor_email = auth.jwt() ->> 'email'
  );

DROP POLICY IF EXISTS "Service role insert audit logs" ON audit_logs;
CREATE POLICY "Service role insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================
-- RLS HARDENING FOR PUBLIC WRITE TABLES
-- ============================================
-- Keep reads open where needed, but remove anonymous direct inserts.
-- These writes should happen via secured backend/edge functions.

DROP POLICY IF EXISTS "Public insert qr scans" ON qr_scans;
DROP POLICY IF EXISTS "Authenticated insert qr scans" ON qr_scans;
CREATE POLICY "Authenticated insert qr scans" ON qr_scans
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "Public insert vehicle views" ON vehicle_views;
DROP POLICY IF EXISTS "Authenticated insert vehicle views" ON vehicle_views;
CREATE POLICY "Authenticated insert vehicle views" ON vehicle_views
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR auth.jwt() ->> 'role' = 'service_role'
  );
