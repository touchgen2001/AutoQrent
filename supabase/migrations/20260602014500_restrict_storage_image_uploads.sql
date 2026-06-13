-- Defense in depth for public image bucket uploads.
-- API routes still perform the primary signature/payload validation before storage upload.
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'vehicle-images';
