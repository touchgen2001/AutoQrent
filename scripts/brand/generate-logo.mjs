// Cebindegaleri brand asset generator.
//
// Single source of truth is scripts/brand/cebindegaleri-master.jpg. The master
// contains the QR-integrated metallic CG mark, CEBİNDEGALERİ wordmark and the
// KAREKODLU GALERİ tagline. This script derives the site mark, favicons, PWA
// icons, social assets and standalone lockups from that source.
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
//   public/brand/cebindegaleri-logo-transparent.png full lockup compatibility copy
//   public/brand/cebindegaleri-logo-horizontal.png  wide lockup, dark background
//   public/brand/cebindegaleri-mark.png             QR-integrated CG mark
//   public/brand/cebindegaleri-mark-transparent.png transparent horizontal site mark
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')
const MASTER_LOGO = join(__dirname, 'cebindegaleri-master.jpg')

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

async function createMark(master) {
  const mark = await sharp(master)
    .extract({ left: 330, top: 380, width: 365, height: 180 })
    .resize(650, 650, {
      fit: 'contain',
      background: { r: 2, g: 4, b: 5, alpha: 1 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: 720,
      height: 720,
      channels: 4,
      background: { r: 2, g: 4, b: 5, alpha: 1 },
    },
  })
    .composite([{ input: mark, left: 35, top: 35 }])
    .png()
    .toBuffer()
}

async function createTransparentMark(master) {
  const { data, info } = await sharp(master)
    .extract({ left: 330, top: 380, width: 365, height: 180 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgba = Buffer.alloc(info.width * info.height * 4)

  for (let sourceOffset = 0, targetOffset = 0; sourceOffset < data.length; sourceOffset += 3, targetOffset += 4) {
    const r = data[sourceOffset]
    const g = data[sourceOffset + 1]
    const b = data[sourceOffset + 2]
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

    rgba[targetOffset] = r
    rgba[targetOffset + 1] = g
    rgba[targetOffset + 2] = b
    rgba[targetOffset + 3] = Math.max(0, Math.min(255, Math.round((luminance - 12) * 3)))
  }

  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(1000, 360, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}

async function createLockup(master, width, height) {
  return sharp(master)
    .extract({ left: 96, top: 328, width: 832, height: 398 })
    .resize(width, height, {
      fit: 'contain',
      background: { r: 2, g: 4, b: 5, alpha: 1 },
    })
    .png()
    .toBuffer()
}

async function createMaskable(tile) {
  const safeMark = await sharp(tile).resize(360, 360).png().toBuffer()

  return sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 2, g: 4, b: 5, alpha: 1 },
    },
  })
    .composite([{ input: safeMark, left: 76, top: 76 }])
    .png()
    .toBuffer()
}

async function main() {
  const master = readFileSync(MASTER_LOGO)
  const tile = await createMark(master)
  const transparentMark = await createTransparentMark(master)
  const fullLockup = await sharp(master).resize(1440, 1440).png().toBuffer()
  const horizontalLockup = await createLockup(master, 2200, 760)

  // --- Square tile (favicon / touch icon / OG tile) -----------------------
  await writePng(tile, 'public/apple-icon.png', 180)
  await writePng(tile, 'app/og/logo.png', 180)
  await writePng(tile, 'public/icon-light-32x32.png', 32)
  await writePng(tile, 'public/icon-dark-32x32.png', 32)

  const tile256 = await sharp(tile).resize(256, 256).png().toBuffer()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <image width="256" height="256" href="data:image/png;base64,${tile256.toString('base64')}"/>
</svg>\n`
  await writeRaw(Buffer.from(svg), 'public/icon.svg')

  // --- PWA / web-manifest icons -------------------------------------------
  await writePng(tile, 'public/icon-192.png', 192)
  await writePng(tile, 'public/icon-512.png', 512)
  await writeRaw(await createMaskable(tile), 'public/icon-maskable-512.png')

  // --- Classic multi-size favicon.ico (16 / 32 / 48) ----------------------
  const ico = buildIco(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await tilePng(tile, size) }))))
  await writeRaw(ico, 'app/favicon.ico')

  // --- Social-media set ----------------------------------------------------
  await writePng(fullLockup, 'public/brand/social/cebindegaleri-profil.png', 1080)
  await writeRaw(await createLockup(master, 1640, 624), 'public/brand/social/cebindegaleri-kapak.png')

  // --- Standalone lockups --------------------------------------------------
  await writeRaw(fullLockup, 'public/brand/cebindegaleri-logo.png')
  await writeRaw(fullLockup, 'public/brand/cebindegaleri-logo-transparent.png')
  await writeRaw(horizontalLockup, 'public/brand/cebindegaleri-logo-horizontal.png')
  await writeRaw(tile, 'public/brand/cebindegaleri-mark.png')
  await writeRaw(transparentMark, 'public/brand/cebindegaleri-mark-transparent.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
