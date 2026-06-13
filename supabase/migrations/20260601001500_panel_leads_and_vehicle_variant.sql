-- Panel data model hardening:
-- 1) add `variant` to vehicles for panel create/list consistency
-- 2) add `leads` table for real lead pipeline tracking

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT,
  source TEXT NOT NULL DEFAULT 'form',
  status TEXT NOT NULL DEFAULT 'yeni',
  notes TEXT[] NOT NULL DEFAULT '{}',
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leads_source_check CHECK (source IN ('qr', 'showroom', 'whatsapp', 'telefon', 'form', 'test-surusu')),
  CONSTRAINT leads_status_check CHECK (status IN ('yeni', 'arandi', 'gorusuluyor', 'test-surusu', 'satisa-dondu', 'kayip'))
);

CREATE INDEX IF NOT EXISTS idx_leads_gallery_status_created
  ON leads (gallery_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_vehicle_created
  ON leads (vehicle_id, created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access leads" ON leads;
CREATE POLICY "Admin full access leads" ON leads
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Owner read own leads" ON leads;
CREATE POLICY "Owner read own leads" ON leads
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    gallery_id IN (
      SELECT id FROM galleries
      WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owner create own leads" ON leads;
CREATE POLICY "Owner create own leads" ON leads
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'owner' AND
    gallery_id IN (
      SELECT id FROM galleries
      WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owner update own leads" ON leads;
CREATE POLICY "Owner update own leads" ON leads
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'owner' AND
    gallery_id IN (
      SELECT id FROM galleries
      WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owner delete own leads" ON leads;
CREATE POLICY "Owner delete own leads" ON leads
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'owner' AND
    gallery_id IN (
      SELECT id FROM galleries
      WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
