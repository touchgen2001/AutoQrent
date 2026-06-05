ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS landing_cta_mode TEXT NOT NULL DEFAULT 'auto';

ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS landing_cta_forced_variant TEXT;

ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS landing_cta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_landing_cta_mode_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_landing_cta_mode_check
CHECK (landing_cta_mode IN ('auto', 'forced'));

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_landing_cta_forced_variant_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_landing_cta_forced_variant_check
CHECK (landing_cta_forced_variant IS NULL OR landing_cta_forced_variant IN ('A', 'B'));

UPDATE galleries
SET
  landing_cta_mode = COALESCE(landing_cta_mode, 'auto'),
  landing_cta_updated_at = COALESCE(landing_cta_updated_at, now());
