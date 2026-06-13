import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH, BRAND_INK, BRAND_PAPER } from '@/lib/brand-glyph'

// Overlays the Cebindegaleri monogram in the centre of a QR SVG produced by the
// `qrcode` library (which emits `<svg ... viewBox="0 0 N N">` where N is the
// module count plus the quiet-zone margin on each side). The badge is a white
// rounded "quiet" square holding a dark brand tile with the white "G" glyph.
//
// Callers MUST generate the QR with errorCorrectionLevel 'H' (30% recovery): the
// badge blanks ~9% of the code area, well inside that budget, so every code still
// scans. The function is a pure string transform (no DOM) so it runs in any
// runtime and is unit-tested. If the SVG can't be parsed it is returned intact,
// so a QR is never lost to a badge failure.

const VIEWBOX_PATTERN = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

export function injectBrandBadge(svg: string): string {
  const viewBox = svg.match(VIEWBOX_PATTERN)
  const closingIndex = svg.lastIndexOf('</svg>')
  if (!viewBox || closingIndex === -1) return svg

  const total = Number(viewBox[1])
  if (!Number.isFinite(total) || total <= 0) return svg

  // White quiet square → dark brand tile → white glyph, all centred.
  const outer = total * 0.28
  const outerPos = round((total - outer) / 2)
  const outerSize = round(outer)
  const outerRadius = round(outer * 0.26)

  const inner = outer * 0.72
  const innerPos = round((total - inner) / 2)
  const innerSize = round(inner)
  const innerRadius = round(inner * 0.24)

  const glyph = inner * 0.62
  const glyphPos = round((total - glyph) / 2)
  const glyphSize = round(glyph)

  const badge =
    `<g>` +
    `<rect x="${outerPos}" y="${outerPos}" width="${outerSize}" height="${outerSize}" rx="${outerRadius}" ry="${outerRadius}" fill="${BRAND_PAPER}"/>` +
    `<rect x="${innerPos}" y="${innerPos}" width="${innerSize}" height="${innerSize}" rx="${innerRadius}" ry="${innerRadius}" fill="${BRAND_INK}"/>` +
    `<svg x="${glyphPos}" y="${glyphPos}" width="${glyphSize}" height="${glyphSize}" viewBox="0 0 100 100" fill="none">` +
    `<path d="${BRAND_GLYPH_PATH}" stroke="${BRAND_PAPER}" stroke-width="${BRAND_GLYPH_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>` +
    `</g>`

  return svg.slice(0, closingIndex) + badge + svg.slice(closingIndex)
}
