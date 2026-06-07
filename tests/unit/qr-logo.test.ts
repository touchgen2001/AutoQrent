import { describe, expect, it } from 'vitest'

import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH, BRAND_INK, BRAND_PAPER } from '../../lib/brand-glyph'
import { injectBrandBadge } from '../../lib/qr-logo'

// Mirrors the structure the `qrcode` library emits (a quiet-zone background path
// plus the module path), so the test exercises the real insertion point.
function makeQrSvg(total: number) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<path fill="#ffffff" d="M0 0h${total}v${total}H0z"/>` +
    `<path stroke="#000000" d="M4 4h1v1H4z"/>` +
    `</svg>`
  )
}

describe('injectBrandBadge', () => {
  it('inserts the badge just before the closing svg tag', () => {
    const result = injectBrandBadge(makeQrSvg(100))
    expect(result).toContain('<g>')
    expect(result.endsWith('</g></svg>')).toBe(true)
    // original module path is preserved
    expect(result).toContain('<path stroke="#000000" d="M4 4h1v1H4z"/>')
  })

  it('centres a white quiet square, dark tile and white glyph for a 100-unit viewBox', () => {
    const result = injectBrandBadge(makeQrSvg(100))
    // outer = 28 (28% of 100), centred at (100-28)/2 = 36
    expect(result).toContain(
      `<rect x="36" y="36" width="28" height="28" rx="7.28" ry="7.28" fill="${BRAND_PAPER}"/>`,
    )
    // inner tile = 28 * 0.72 = 20.16, centred at (100-20.16)/2 = 39.92
    expect(result).toContain(
      `<rect x="39.92" y="39.92" width="20.16" height="20.16" rx="4.838" ry="4.838" fill="${BRAND_INK}"/>`,
    )
    // glyph svg = 20.16 * 0.62 = 12.499, centred at 43.75
    expect(result).toContain('<svg x="43.75" y="43.75" width="12.499" height="12.499" viewBox="0 0 100 100" fill="none">')
    expect(result).toContain(
      `<path d="${BRAND_GLYPH_PATH}" stroke="${BRAND_PAPER}" stroke-width="${BRAND_GLYPH_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
  })

  it('scales the badge to any viewBox size', () => {
    const result = injectBrandBadge(makeQrSvg(33))
    // outer = 33 * 0.28 = 9.24, centred at (33-9.24)/2 = 11.88
    expect(result).toContain('<rect x="11.88" y="11.88" width="9.24" height="9.24"')
    expect(result).toContain(`fill="${BRAND_PAPER}"`)
    expect(result).toContain(BRAND_GLYPH_PATH)
  })

  it('returns the svg untouched when there is no viewBox', () => {
    const noViewBox = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>'
    expect(injectBrandBadge(noViewBox)).toBe(noViewBox)
  })

  it('returns the input untouched when there is no closing svg tag', () => {
    const broken = '<svg viewBox="0 0 100 100">'
    expect(injectBrandBadge(broken)).toBe(broken)
  })

  it('returns the svg untouched for a degenerate zero-size viewBox', () => {
    const zero = '<svg viewBox="0 0 0 0"></svg>'
    expect(injectBrandBadge(zero)).toBe(zero)
  })
})
