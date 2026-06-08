import QRCode from "qrcode"

// Generate a QR matrix on the client and pack it into a compact base64 string so
// it fits in a query param (~110 bytes for a typical vehicle URL). The edge OG
// route decodes it with lib/og-qr.ts. We generate here — not in the edge route —
// because the `qrcode` package resolves to its browser build in the client bundle
// (`fs` stubbed), whereas its node entry would not bundle cleanly for edge.
export function packQrMatrix(text: string): { qr: string; n: number } | null {
  if (!text) return null
  try {
    const created = QRCode.create(text, { errorCorrectionLevel: "M" })
    const modules = created.modules as unknown as { size: number; data: Uint8Array | number[] }
    const size = modules.size
    const data = modules.data
    const total = size * size

    const bytes = new Uint8Array(Math.ceil(total / 8))
    for (let i = 0; i < total; i++) {
      if (data[i]) bytes[i >> 3] |= 1 << (7 - (i & 7))
    }

    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

    return { qr: btoa(binary), n: size }
  } catch {
    return null
  }
}
