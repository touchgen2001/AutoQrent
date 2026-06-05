ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS public_theme TEXT NOT NULL DEFAULT 'premium';

ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS public_accent_color TEXT NOT NULL DEFAULT '#dc2626';

ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS public_background_style TEXT NOT NULL DEFAULT 'warm';

ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS public_showroom_note TEXT;

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_public_theme_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_public_theme_check
CHECK (public_theme IN ('premium', 'classic', 'sport'));

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_public_background_style_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_public_background_style_check
CHECK (public_background_style IN ('warm', 'light', 'graphite'));

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_public_accent_color_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_public_accent_color_check
CHECK (public_accent_color ~* '^#[0-9a-f]{6}$');

ALTER TABLE galleries
DROP CONSTRAINT IF EXISTS galleries_public_showroom_note_length_check;

ALTER TABLE galleries
ADD CONSTRAINT galleries_public_showroom_note_length_check
CHECK (public_showroom_note IS NULL OR length(public_showroom_note) <= 220);
