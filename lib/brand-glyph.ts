// Monoline "G" glyph — an open ring (the "C" of Cebinde) flowing into an inward
// bar (the "G" of Galeri). A single continuous stroke that stays crisp and
// theme-adaptive (it draws in `currentColor`) where a metallic raster mark
// can't go: the Satori-rendered share cards (app/og/{vehicle,showroom,brand})
// and the QR-center badge (lib/qr-logo.ts), which must survive a single-colour
// stroke and tiny sizes.
//
// The primary brand mark — the interlocked metallic "CG" — lives in
// scripts/brand/logo.html and is rendered by scripts/brand/generate-logo.mjs
// into the favicon / touch icon / OG tile; the React BrandLogo header tile
// (components/brand/brand-logo.tsx) paints the same gold/silver CG in CSS.
export const BRAND_GLYPH_PATH = 'M76.21 31.65 A32 32 0 1 0 80.43 59.89 L56 59.89'
export const BRAND_GLYPH_VIEWBOX = '0 0 100 100'
export const BRAND_GLYPH_STROKE_WIDTH = 13

// Core brand surfaces.
export const BRAND_INK = '#0a0a0a'
export const BRAND_PAPER = '#ffffff'
