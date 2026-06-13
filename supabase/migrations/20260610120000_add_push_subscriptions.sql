-- Web Push subscriptions for the dealer panel — out-of-app new-lead alerts.
--
-- A gallery (dealer) can register one or more browser/device push endpoints.
-- When a new lead arrives, the vehicle-lead endpoint sends a push to every
-- endpoint registered for that gallery, so the owner is alerted even when the
-- panel tab is closed. Only the service role touches this table (panel APIs go
-- through supabaseAdminFetch), so RLS is enabled with NO public policies — the
-- table is locked down by default and only the service role (which bypasses
-- RLS) can read/write it.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_gallery
  ON push_subscriptions (gallery_id, created_at DESC);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service-role only.
