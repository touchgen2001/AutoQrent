ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS public_hero_tagline TEXT;

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_public_hero_tagline_length_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_public_hero_tagline_length_check
CHECK (public_hero_tagline IS NULL OR length(public_hero_tagline) <= 80);
