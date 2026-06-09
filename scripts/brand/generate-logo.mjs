// Cebindegaleri brand mark generator.
//
// Single source of truth for the logo is scripts/brand/logo.html — the
// interlocked metallic "CG" monogram (gold C over silver G), the gold→silver
// "speed line", the CEBİNDEGALERİ wordmark and the Axyronis Technologies A.Ş
// company line. This script drives that HTML with Playwright (headless
// Chromium) to render every brand asset at the right size, then uses sharp to
// down-sample the square tile into the favicon / touch-icon / OG-tile PNGs.
//
// Run: `node scripts/brand/generate-logo.mjs`          (writes into the repo)
//      `node scripts/brand/generate-logo.mjs --test`   (writes into /tmp/brandtest)
//
// Outputs (repo mode):
//   public/apple-icon.png            180  touch icon (phone home screen)
//   public/icon-light-32x32.png       32  favicon (light browser chrome)
//   public/icon-dark-32x32.png        32  favicon (dark browser chrome)
//   public/icon.svg                       favicon (svg, wraps the 256px tile)
//   public/icon-192.png / icon-512.png    PWA / web-manifest icons (purpose any)
//   public/icon-maskable-512.png          PWA maskable icon (Android adaptive)
//   app/favicon.ico                  16/32/48  classic favicon fallback
//   app/og/logo.png                  180  default share-card brand tile
//   public/brand/social/cebindegaleri-profil.png    social avatar (1080²)
//   public/brand/social/cebindegaleri-kapak.png     social cover (1640×624)
//   public/brand/cebindegaleri-logo.png             full lockup, dark bg
//   public/brand/cebindegaleri-logo-transparent.png full lockup, transparent
//   public/brand/cebindegaleri-logo-horizontal.png  wide lockup, transparent
//   public/brand/cebindegaleri-mark.png             monogram only, transparent
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')
const LOGO_HTML = join(__dirname, 'logo.html')

// sharp isn't hoisted to top-level node_modules under pnpm; resolve it from the store.
function loadSharp() {
  const pnpmDir = join(repoRoot, 'node_modules', '.pnpm')
  const sharpPkg = readdirSync(pnpmDir).find((name) => name.startsWith('sharp@'))
  if (!sharpPkg) throw new Error('sharp not found in node_modules/.pnpm')
  return require(join(pnpmDir, sharpPkg, 'node_modules', 'sharp'))
}
const sharp = loadSharp()

const testMode = process.argv[2] === '--test'
const OUT = testMode ? join('/tmp', 'brandtest') : repoRoot
mkdirSync(OUT, { recursive: true })

// Render one variant of logo.html and return the PNG buffer of the #art node.
async function renderVariant(browser, { variant, width, height, scale = 2, transparent = false }) {
  const context = await browser.newContext({ deviceScaleFactor: scale })
  const page = await context.newPage()
  await page.setViewportSize({ width, height })
  await page.goto(`file://${LOGO_HTML}#${variant}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(200)
  const el = await page.$('#art')
  const buf = await el.screenshot({ omitBackground: transparent, type: 'png' })
  await context.close()
  return buf
}

async function writePng(buf, relPath, size) {
  const out = testMode ? join(OUT, relPath.replace(/[\/]/g, '_')) : join(repoRoot, relPath)
  mkdirSync(dirname(out), { recursive: true })
  const pipeline = sharp(buf)
  if (size) pipeline.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  await pipeline.png().toFile(out)
  console.log(`wrote ${out}`)
}

async function writeRaw(buf, relPath) {
  const out = testMode ? join(OUT, relPath.replace(/[\/]/g, '_')) : join(repoRoot, relPath)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, buf)
  console.log(`wrote ${out}`)
}

// Assemble a classic multi-size favicon.ico from PNG entries. The ICO format
// allows PNG-compressed images (Vista+), which every current browser reads, so
// we just wrap the sharp-rendered PNGs in an ICONDIR + ICONDIRENTRY header.
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = icon
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = 6 + dir.length
  entries.forEach((e, i) => {
    const o = i * 16
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0) // width (0 ⇒ 256)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1) // height
    dir.writeUInt8(0, o + 2) // palette colours
    dir.writeUInt8(0, o + 3) // reserved
    dir.writeUInt16LE(1, o + 4) // colour planes
    dir.writeUInt16LE(32, o + 6) // bits per pixel
    dir.writeUInt32LE(e.data.length, o + 8) // image byte length
    dir.writeUInt32LE(offset, o + 12) // image offset
    offset += e.data.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)])
}

async function tilePng(tile, size) {
  return sharp(tile).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

async function main() {
  const browser = await chromium.launch()
  try {
    // --- Square tile (favicon / touch icon / OG tile) -----------------------
    // Rendered at 512 CSS × 2 = 1024px so the 32px favicons down-sample cleanly.
    const tile = await renderVariant(browser, { variant: 'tile', width: 512, height: 512, scale: 2, transparent: true })
    await writePng(tile, 'public/apple-icon.png', 180)
    await writePng(tile, 'app/og/logo.png', 180)
    await writePng(tile, 'public/icon-light-32x32.png', 32)
    await writePng(tile, 'public/icon-dark-32x32.png', 32)

    // icon.svg: wrap the crisp 256px tile so the SVG favicon matches the metallic
    // monogram exactly (a single continuous-tone mark can't be a clean stroked
    // path the way the old monoline glyph was).
    const tile256 = await sharp(tile).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <image width="256" height="256" href="data:image/png;base64,${tile256.toString('base64')}"/>
</svg>\n`
    await writeRaw(Buffer.from(svg), 'public/icon.svg')

    // --- PWA / web-manifest icons -------------------------------------------
    await writePng(tile, 'public/icon-192.png', 192)
    await writePng(tile, 'public/icon-512.png', 512)
    // Maskable (Android adaptive): full-bleed, monogram inside the safe zone.
    const maskable = await renderVariant(browser, { variant: 'tile-maskable', width: 512, height: 512, scale: 2 })
    await writePng(maskable, 'public/icon-maskable-512.png', 512)

    // --- Classic multi-size favicon.ico (16 / 32 / 48) ----------------------
    const ico = buildIco(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await tilePng(tile, size) }))))
    await writeRaw(ico, 'app/favicon.ico')

    // --- Social-media set (Cebindegaleri's own profiles) --------------------
    const profile = await renderVariant(browser, { variant: 'social-profile', width: 1080, height: 1080, scale: 1 })
    await writeRaw(profile, 'public/brand/social/cebindegaleri-profil.png')
    const cover = await renderVariant(browser, { variant: 'social-cover', width: 1640, height: 624, scale: 1 })
    await writeRaw(cover, 'public/brand/social/cebindegaleri-kapak.png')

    // --- Standalone lockups (deliverables + future site use) ----------------
    const full = await renderVariant(browser, { variant: 'full', width: 1440, height: 1440, scale: 1 })
    await writeRaw(full, 'public/brand/cebindegaleri-logo.png')

    const fullT = await renderVariant(browser, { variant: 'full-transparent', width: 1440, height: 1440, scale: 1, transparent: true })
    await writeRaw(fullT, 'public/brand/cebindegaleri-logo-transparent.png')

    const horizontal = await renderVariant(browser, { variant: 'horizontal', width: 2200, height: 760, scale: 1, transparent: true })
    await writeRaw(horizontal, 'public/brand/cebindegaleri-logo-horizontal.png')

    const mark = await renderVariant(browser, { variant: 'mark', width: 720, height: 720, scale: 1, transparent: true })
    await writeRaw(mark, 'public/brand/cebindegaleri-mark.png')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
