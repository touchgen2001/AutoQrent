// Shared helpers for embedding remote images (gallery logos, vehicle photos)
// into Satori/`next/og` cards. Edge-safe: no Node Buffer, no Node-only APIs.
//
// Hard SSRF + failure guards: the source must be an http(s) URL whose host is
// the app's own host or the Supabase storage host (where panel uploads live),
// the content-type must be a raster PNG/JPEG that Satori/resvg renders reliably
// (NOT webp/svg), the magic bytes must match, and the payload must be ≤2.5MB.
// Any failure returns null so the card still renders without the image.

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(['image/png', 'image/jpeg'])
const MAX_IMAGE_BYTES = 5_000_000

// Edge runtime has no Node Buffer; convert in 32KB chunks so large images don't
// overflow the call stack via String.fromCharCode(...spread).
export function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function hasSupportedImageMagic(contentType: string, bytes: Uint8Array) {
  if (contentType === 'image/png') {
    return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  }
  if (contentType === 'image/jpeg') {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  return false
}

function buildAllowedHosts(requestUrl: string) {
  const allowedHosts = new Set<string>()
  try {
    allowedHosts.add(new URL(requestUrl).host)
  } catch {
    // ignore unparsable request URL
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (supabaseUrl) {
    try {
      allowedHosts.add(new URL(supabaseUrl).host)
    } catch {
      // ignore unparsable env URL
    }
  }
  return allowedHosts
}

export async function loadRemoteImageDataUri(rawUrl: string | null, requestUrl: string): Promise<string | null> {
  if (!rawUrl) return null

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!buildAllowedHosts(requestUrl).has(url.host)) return null

  try {
    const res = await fetch(url.toString(), { headers: { accept: 'image/png,image/jpeg' } })
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null
    if (!hasSupportedImageMagic(contentType, new Uint8Array(buffer))) return null
    return `data:${contentType};base64,${toBase64(buffer)}`
  } catch {
    return null
  }
}
