// Cebindegaleri brand mark generator.
//
// Single source of truth for the logo glyph: a bold monoline "G" monogram.
// The open ring nods to the "C" of Cebinde; the inward bar makes the "G" of
// Galeri. It reads cleanly from 32px favicons up to 180px touch icons.
//
// Renders every raster brand asset (apple touch icon, light/dark favicons, the
// /og card brand tile) from the same geometry via sharp, and writes the
// scheme-aware favicon SVG. Run: `node scripts/brand/generate-logo.mjs`
// (sharp is a transitive dep; resolved from the pnpm store below).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { readdirSync, writeFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')

// sharp isn't hoisted to top-level node_modules under pnpm; resolve it from the store.
function loadSharp() {
  const pnpmDir = join(repoRoot, 'node_modules', '.pnpm')
  const sharpPkg = readdirSync(pnpmDir).find((name) => name.startsWith('sharp@'))
  if (!sharpPkg) throw new Error('sharp not found in node_modules/.pnpm')
  return require(join(pnpmDir, sharpPkg, 'node_modules', 'sharp'))
}
const sharp = loadSharp()

// --- Glyph geometry (100x100 canvas, monoline "G") --------------------------
// Built as a single continuous stroke: an arc that opens on the right, flowing
// into a horizontal bar pointing inward — the classic geometric G.
const GLYPH_VIEWBOX = 100
const STROKE = 13
// Arc: R=32 ring centered at (50,50). Start 35deg (upper-right), sweep the long
// way counter-clockwise to -18deg (lower-right), then a bar inward to x=56.
const GLYPH_PATH = 'M76.21 31.65 A32 32 0 1 0 80.43 59.89 L56 59.89'

function glyphMarkup(stroke) {
  return `<path d="${GLYPH_PATH}" fill="none" stroke="${stroke}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round" />`
}

// --- Tile composition -------------------------------------------------------
function tileSvg({ size, bg, fg, gradient = false }) {
  const radius = Math.round(size * 0.22)
  const glyphSize = size * 0.6
  const offset = (size - glyphSize) / 2
  const scale = glyphSize / GLYPH_VIEWBOX

  const defs = gradient
    ? `<defs>
        <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${bg.from}" />
          <stop offset="0.55" stop-color="${bg.mid}" />
          <stop offset="1" stop-color="${bg.to}" />
        </linearGradient>
        <radialGradient id="sheen" cx="0.28" cy="-0.1" r="0.9">
          <stop offset="0" stop-color="rgba(255,255,255,0.22)" />
          <stop offset="0.55" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>`
    : ''
  const fill = gradient ? 'url(#tile)' : bg
  const sheen = gradient
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#sheen)" />`
    : ''

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    <rect width="${size}" height="${size}" rx="${radius}" fill="${fill}" />
    ${sheen}
    <g transform="translate(${offset} ${offset}) scale(${scale})">
      ${glyphMarkup(fg)}
    </g>
  </svg>`
}

// Scheme-aware favicon: black tile/white glyph in light browser chrome,
// white tile/black glyph in dark chrome (mirrors the previous icon.svg rules).
function faviconSvg() {
  const radius = 38
  const glyphSize = 180 * 0.6
  const offset = (180 - glyphSize) / 2
  const scale = glyphSize / GLYPH_VIEWBOX
  return `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    @media (prefers-color-scheme: light) {
      .tile { fill: #0a0a0a; }
      .glyph { stroke: #ffffff; }
    }
    @media (prefers-color-scheme: dark) {
      .tile { fill: #ffffff; }
      .glyph { stroke: #0a0a0a; }
    }
  </style>
  <rect class="tile" width="180" height="180" rx="${radius}" />
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path class="glyph" d="${GLYPH_PATH}" fill="none" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`
}

const DARK_BG = { from: '#2b2b2e', mid: '#161618', to: '#0a0a0a' }
const WHITE = '#fafafa'
const INK = '#0a0a0a'

async function renderPng(svg, outPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log(`wrote ${outPath}`)
}

const OUT = process.argv[2] === '--test' ? join('/tmp', 'brandtest') : repoRoot
const p = (rel) => join(OUT === repoRoot ? repoRoot : OUT, rel)

async function main() {
  const testMode = OUT !== repoRoot
  // Touch icon + OG-card brand tile: premium dark gradient tile, white glyph.
  const darkTile180 = tileSvg({ size: 180, bg: DARK_BG, fg: WHITE, gradient: true })
  await renderPng(darkTile180, testMode ? p('apple-icon.png') : join(repoRoot, 'public', 'apple-icon.png'), 180)
  await renderPng(darkTile180, testMode ? p('og-logo.png') : join(repoRoot, 'app', 'og', 'logo.png'), 180)

  // Favicons: light-scheme => dark tile/white glyph; dark-scheme => white tile/ink glyph.
  const lightFavicon = tileSvg({ size: 32, bg: INK, fg: WHITE })
  const darkFavicon = tileSvg({ size: 32, bg: '#ffffff', fg: INK })
  await renderPng(lightFavicon, testMode ? p('icon-light-32x32.png') : join(repoRoot, 'public', 'icon-light-32x32.png'), 32)
  await renderPng(darkFavicon, testMode ? p('icon-dark-32x32.png') : join(repoRoot, 'public', 'icon-dark-32x32.png'), 32)

  // Larger previews for visual QA in test mode.
  if (testMode) {
    await renderPng(tileSvg({ size: 256, bg: INK, fg: WHITE }), p('preview-light-256.png'), 256)
    await renderPng(tileSvg({ size: 256, bg: '#ffffff', fg: INK }), p('preview-dark-256.png'), 256)
  }

  const faviconOut = testMode ? p('icon.svg') : join(repoRoot, 'public', 'icon.svg')
  writeFileSync(faviconOut, `${faviconSvg()}\n`)
  console.log(`wrote ${faviconOut}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
