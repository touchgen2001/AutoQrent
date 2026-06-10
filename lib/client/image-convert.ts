// Browser-side image re-encoding shared by the panel upload flows.
//
// Why this exists: the social share (OG) card is rendered by Satori/resvg, which
// can only embed PNG/JPEG — never WebP. A WebP gallery logo or vehicle photo
// would silently drop from the share preview. Re-encoding to a Satori-safe
// format in the browser (before upload) guarantees every logo and photo shows up
// on the card. Runs only in the browser (uses FileReader/Image/canvas).

export type ImageConvertOptions = {
  /** Output MIME type. Defaults to image/png. */
  mimeType?: 'image/png' | 'image/jpeg'
  /** Longest-edge cap in px; the image is scaled down (never up) to fit. Defaults to 1600. */
  maxDimension?: number
  /** JPEG quality between 0 and 1. Ignored for PNG. Defaults to 0.9. */
  quality?: number
  /** Solid background painted before the image (formats without alpha need this). Defaults to #ffffff for JPEG, none for PNG. */
  background?: string
  /** Fallback base name when the source file has none. Defaults to 'gorsel'. */
  fallbackName?: string
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read-failed'))
    reader.readAsDataURL(file)
  })
}

function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new window.Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('decode-failed'))
    el.src = dataUrl
  })
}

/**
 * Re-encode an image File in the browser to a Satori-safe raster format, scaled
 * to fit `maxDimension`. Throws on any failure (read/decode/encode) so callers
 * can decide whether to fail closed (logos) or fall back to the original (photos).
 */
export async function convertImageFile(file: File, options: ImageConvertOptions = {}): Promise<File> {
  const mimeType = options.mimeType ?? 'image/png'
  const maxDimension = options.maxDimension ?? 1600
  const quality = options.quality ?? 0.9
  const fallbackName = options.fallbackName ?? 'gorsel'

  const dataUrl = await readFileAsDataUrl(file)
  const image = await decodeImage(dataUrl)

  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  if (!naturalWidth || !naturalHeight) throw new Error('empty-image')

  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-unavailable')

  const background = options.background ?? (mimeType === 'image/jpeg' ? '#ffffff' : null)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : quality),
  )
  if (!blob) throw new Error('encode-failed')

  const extension = EXTENSION_BY_MIME[mimeType] ?? 'png'
  const baseName = file.name.replace(/\.[^.]+$/, '') || fallbackName
  return new File([blob], `${baseName}.${extension}`, { type: mimeType })
}

/**
 * Prepares a vehicle photo for upload. Modern phone cameras produce photos that
 * are 48–200 MP and frequently exceed the server's 10 MB / 60 MP safety limits,
 * so a full-resolution upload gets rejected ("görsel çok büyük") — and retrying
 * the same photo fails the same way. To make uploads "just work", EVERY photo is
 * scaled down to a web-friendly 2000 px long edge and re-encoded to JPEG (a car
 * photo needs no transparency and 2000 px is ample for the showroom + share card,
 * which can't embed WebP anyway). The server-side type/size/dimension checks stay
 * in place as a backstop. Fail-soft: on any decode/encode error the original file
 * is returned unchanged so the upload can still proceed and the server decides.
 */
export async function ensureShareSafePhoto(file: File): Promise<File> {
  try {
    return await convertImageFile(file, {
      mimeType: 'image/jpeg',
      maxDimension: 2000,
      quality: 0.9,
      fallbackName: 'arac-fotografi',
    })
  } catch {
    return file
  }
}
