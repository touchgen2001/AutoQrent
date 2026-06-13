-- Visitor "notify me when the price drops" Web Push subscriptions.
--
-- A public visitor (no account) can favourite a vehicle and opt in to a price-drop
-- alert. We store their browser push endpoint linked to the vehicle. When the
-- dealer lowers that vehicle's asking price (vehicle PATCH route), we push a
-- notification to every endpoint watching it, then remove the notified rows
-- (one-shot: they re-subscribe if they want to keep watching).
--
-- Only the service role touches this table (public APIs go through
-- supabaseAdminFetch), so RLS is enabled with NO public policies — locked down by
-- default; only the service role (which bypasses RLS) can read/write.

CREATE TABLE IF NOT EXISTS vehicle_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  baseline_price NUMERIC,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One alert per device per vehicle; re-subscribing refreshes the baseline.
  UNIQUE (vehicle_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_price_alerts_vehicle
  ON vehicle_price_alerts (vehicle_id);

ALTER TABLE vehicle_price_alerts ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service-role only.
