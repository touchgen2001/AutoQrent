-- Tracks every accepted vehicle image as a first-class asset.
-- The app uploads through server routes with the service role; direct client API access stays closed.
CREATE TABLE IF NOT EXISTS uploaded_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL DEFAULT 'vehicle-images',
  object_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL,
  extension TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  width INT CHECK (width IS NULL OR width > 0),
  height INT CHECK (height IS NULL OR height > 0),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  scan_status TEXT NOT NULL DEFAULT 'clean'
    CHECK (scan_status IN ('pending', 'clean', 'rejected')),
  status TEXT NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'attached', 'deleted', 'orphaned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attached_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uploaded_assets_bucket_object_path_key UNIQUE (bucket, object_path),
  CONSTRAINT uploaded_assets_vehicle_status_check CHECK (
    status <> 'attached'
    OR vehicle_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS uploaded_assets_gallery_status_created_idx
  ON uploaded_assets (gallery_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS uploaded_assets_vehicle_idx
  ON uploaded_assets (vehicle_id)
  WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS uploaded_assets_gallery_sha_idx
  ON uploaded_assets (gallery_id, sha256);

ALTER TABLE uploaded_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_assets FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE uploaded_assets FROM anon, authenticated, public;
GRANT ALL ON TABLE uploaded_assets TO service_role;

DROP POLICY IF EXISTS "Service role manages uploaded assets" ON uploaded_assets;
CREATE POLICY "Service role manages uploaded assets"
  ON uploaded_assets
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
