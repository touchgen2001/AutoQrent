// Single source of truth for the Cebindegaleri monogram — a bold monoline "G".
// The open ring nods to the "C" of Cebinde; the inward bar makes the "G" of
// Galeri. One continuous stroke so it stays crisp from a 32px favicon up to a
// hero lockup. Shared by the React BrandLogo component, the QR-center badge
// (lib/qr-logo.ts) and the social share cards (app/og/*).
//
// The raster + favicon assets are produced offline by
// scripts/brand/generate-logo.mjs, which keeps an in-sync copy of this path
// (it's a plain .mjs build script and can't import this TS module).
export const BRAND_GLYPH_PATH = 'M76.21 31.65 A32 32 0 1 0 80.43 59.89 L56 59.89'
export const BRAND_GLYPH_VIEWBOX = '0 0 100 100'
export const BRAND_GLYPH_STROKE_WIDTH = 13

// Core brand surfaces.
export const BRAND_INK = '#0a0a0a'
export const BRAND_PAPER = '#ffffff'
