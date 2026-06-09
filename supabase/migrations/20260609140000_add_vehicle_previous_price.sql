-- Store the asking price a vehicle had right before its most recent drop, so the
-- share card can show the discount amount ("30.000 TL düştü"). Set alongside
-- price_dropped_at by the vehicle PATCH route when a new price is lower, cleared
-- when the price rises again.
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS previous_price NUMERIC;
