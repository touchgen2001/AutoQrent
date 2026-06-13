// Decode a base64-packed QR bit matrix (row-major, MSB-first within each byte)
// into an SVG path `d` string of 1×1 squares for the dark modules. Built to run
// inside the edge `next/og` ImageResponse routes: it only uses `atob` (no Node
// Buffer) and produces a single <path>, the one SVG primitive Satori renders
// reliably (same approach as the brand glyph). The matrix itself is generated on
// the client (lib/client/qr-matrix.ts) and passed via query params, so the QR
// library never has to load in the edge runtime.
export function buildQrPath(packedBase64: string | null | undefined, size: number): string | null {
  if (!packedBase64) return null
  // QR versions 1..40 → 21..177 modules per side.
  if (!Number.isInteger(size) || size < 21 || size > 177) return null

  let binary: string
  try {
    binary = atob(packedBase64)
  } catch {
    return null
  }

  const total = size * size
  if (binary.length < Math.ceil(total / 8)) return null

  let d = ""
  for (let i = 0; i < total; i++) {
    const byte = binary.charCodeAt(i >> 3)
    const bit = (byte >> (7 - (i & 7))) & 1
    if (!bit) continue
    const row = Math.floor(i / size)
    const col = i % size
    d += `M${col} ${row}h1v1h-1z`
  }

  return d || null
}
