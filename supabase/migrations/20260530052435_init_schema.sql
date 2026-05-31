-- AutoQrent (CebindeGaleri) Supabase Schema
-- Complete migration with RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  owner_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 1980 AND 2100),
  price BIGINT NOT NULL CHECK (price >= 0),
  km INT NOT NULL CHECK (km >= 0),
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  color TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  views INT NOT NULL DEFAULT 0,
  highlighted BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'vitrin',
  photos TEXT[] DEFAULT '{}',
  -- B2B fields
  b2b_price NUMERIC,
  is_b2b_visible BOOLEAN DEFAULT FALSE,
  commissional_sale_allowed BOOLEAN DEFAULT TRUE,
  -- Showcase fields
  is_on_showcase BOOLEAN DEFAULT FALSE,
  is_reserved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, slug)
);

-- Vehicle features table
CREATE TABLE IF NOT EXISTS vehicle_features (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_value TEXT NOT NULL,
  UNIQUE (vehicle_id, feature_key)
);

-- Vehicle media table
CREATE TABLE IF NOT EXISTS vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  sort_order INT NOT NULL DEFAULT 0
);

-- QR scans table
CREATE TABLE IF NOT EXISTS qr_scans (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  source TEXT,
  ua_hash TEXT,
  ip_hash TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicle views table (for analytics)
CREATE TABLE IF NOT EXISTS vehicle_views (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B2B requests table
CREATE TABLE IF NOT EXISTS b2b_requests (
  id SERIAL PRIMARY KEY,
  source_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  target_vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  requester_id TEXT,
  request_type VARCHAR(16) NOT NULL,
  note TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT b2b_requests_type_check CHECK (request_type IN ('offer', 'trade')),
  CONSTRAINT b2b_requests_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'))
);

-- B2B messages table
CREATE TABLE IF NOT EXISTS b2b_messages (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES b2b_requests(id) ON DELETE CASCADE,
  sender_type VARCHAR(16) NOT NULL,
  sender_id TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT b2b_messages_sender_type_check CHECK (sender_type IN ('system', 'gallery'))
);

-- Logistics orders table
CREATE TABLE IF NOT EXISTS logistics_orders (
  id SERIAL PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  user_id TEXT,
  driver_id TEXT,
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  price NUMERIC(12,2),
  tracking_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vehicles_gallery_status_created 
  ON vehicles (gallery_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model 
  ON vehicles (brand, model);

CREATE INDEX IF NOT EXISTS idx_vehicles_active_partial 
  ON vehicles (created_at DESC) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_qr_scans_vehicle_scanned_at 
  ON qr_scans (vehicle_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_views_vehicle_id 
  ON vehicle_views (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_views_created_at 
  ON vehicle_views (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_requests_target_created 
  ON b2b_requests (target_vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_requests_requester_created 
  ON b2b_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_messages_request_created 
  ON b2b_messages (request_id, created_at ASC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Galleries policies
CREATE POLICY "Public read galleries" ON galleries
  FOR SELECT USING (true);

CREATE POLICY "Admin full access galleries" ON galleries
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner manage own gallery" ON galleries
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'owner' AND
    owner_email = auth.jwt() ->> 'email'
  );

-- Vehicles policies
CREATE POLICY "Public read active vehicles" ON vehicles
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admin full access vehicles" ON vehicles
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner manage own vehicles" ON vehicles
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'owner' AND
    gallery_id IN (
      SELECT id FROM galleries 
      WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Vehicle features policies
CREATE POLICY "Public read vehicle features" ON vehicle_features
  FOR SELECT USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE status = 'active'
    )
  );

CREATE POLICY "Admin full access vehicle features" ON vehicle_features
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner manage own vehicle features" ON vehicle_features
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'owner' AND
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN galleries g ON v.gallery_id = g.id
      WHERE g.owner_email = auth.jwt() ->> 'email'
    )
  );

-- Vehicle media policies
CREATE POLICY "Public read vehicle media" ON vehicle_media
  FOR SELECT USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE status = 'active'
    )
  );

CREATE POLICY "Admin full access vehicle media" ON vehicle_media
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner manage own vehicle media" ON vehicle_media
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'owner' AND
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN galleries g ON v.gallery_id = g.id
      WHERE g.owner_email = auth.jwt() ->> 'email'
    )
  );

-- QR scans policies
CREATE POLICY "Public insert qr scans" ON qr_scans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read qr scans" ON qr_scans
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner read own qr scans" ON qr_scans
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN galleries g ON v.gallery_id = g.id
      WHERE g.owner_email = auth.jwt() ->> 'email'
    )
  );

-- Vehicle views policies
CREATE POLICY "Public insert vehicle views" ON vehicle_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read vehicle views" ON vehicle_views
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner read own vehicle views" ON vehicle_views
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN galleries g ON v.gallery_id = g.id
      WHERE g.owner_email = auth.jwt() ->> 'email'
    )
  );

-- B2B requests policies
CREATE POLICY "Admin full access b2b requests" ON b2b_requests
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner read own b2b requests" ON b2b_requests
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    (requester_id = auth.jwt() ->> 'email' OR
     target_vehicle_id IN (
       SELECT v.id FROM vehicles v
       JOIN galleries g ON v.gallery_id = g.id
       WHERE g.owner_email = auth.jwt() ->> 'email'
     ))
  );

CREATE POLICY "Owner create b2b requests" ON b2b_requests
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'owner' AND
    requester_id = auth.jwt() ->> 'email'
  );

CREATE POLICY "Owner update own b2b requests" ON b2b_requests
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'owner' AND
    target_vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN galleries g ON v.gallery_id = g.id
      WHERE g.owner_email = auth.jwt() ->> 'email'
    )
  );

-- B2B messages policies
CREATE POLICY "Admin full access b2b messages" ON b2b_messages
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner read own b2b messages" ON b2b_messages
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    request_id IN (
      SELECT br.id FROM b2b_requests br
      WHERE br.requester_id = auth.jwt() ->> 'email' OR
            br.target_vehicle_id IN (
              SELECT v.id FROM vehicles v
              JOIN galleries g ON v.gallery_id = g.id
              WHERE g.owner_email = auth.jwt() ->> 'email'
            )
    )
  );

CREATE POLICY "Owner create b2b messages" ON b2b_messages
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'owner' AND
    sender_id = auth.jwt() ->> 'email'
  );

-- Logistics orders policies
CREATE POLICY "Admin full access logistics" ON logistics_orders
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner read own logistics" ON logistics_orders
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'owner' AND
    user_id = auth.jwt() ->> 'email'
  );

CREATE POLICY "Owner create logistics" ON logistics_orders
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'owner' AND
    user_id = auth.jwt() ->> 'email'
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update vehicle views count
CREATE OR REPLACE FUNCTION update_vehicle_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles 
  SET views = views + 1 
  WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update views count
CREATE TRIGGER trigger_update_vehicle_views
  AFTER INSERT ON vehicle_views
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_views_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_b2b_requests_updated_at
  BEFORE UPDATE ON b2b_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_logistics_orders_updated_at
  BEFORE UPDATE ON logistics_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Default gallery
INSERT INTO galleries (name, slug, phone, email, owner_email)
VALUES ('Varsayılan Galeri', 'varsayilan-galeri', '', '', '')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('vehicle-images', 'vehicle-images', true),
  ('vehicle-documents', 'vehicle-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read vehicle images" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-images');

CREATE POLICY "Admin upload vehicle images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehicle-images' AND
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner upload own vehicle images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehicle-images' AND
    auth.jwt() ->> 'role' = 'owner'
  );

CREATE POLICY "Admin delete vehicle images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehicle-images' AND
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Owner delete own vehicle images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehicle-images' AND
    auth.jwt() ->> 'role' = 'owner'
  );
