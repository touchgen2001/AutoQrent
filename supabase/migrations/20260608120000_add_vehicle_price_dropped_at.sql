-- Track the moment a vehicle's asking price last fell so the panel can surface an
-- automatic "FİYAT DÜŞTÜ" share badge. Stamped by the vehicle PATCH route when a
-- new price is lower than the stored one, cleared when the price rises again.
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS price_dropped_at TIMESTAMPTZ;
