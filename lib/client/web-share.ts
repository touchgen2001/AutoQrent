// Web Share API Level 2 (file sharing) helpers. On a supported phone these let a
// dealer push a freshly rendered card straight into the native WhatsApp/Instagram
// share sheet, skipping the download → re-upload round trip. Everything degrades
// gracefully: on unsupported browsers the caller falls back to a plain download.

function makeProbeFile(): File {
  return new File([new Uint8Array(1)], "probe.png", { type: "image/png" })
}

// Whether the browser can share an image File. Checked up front so the UI only
// shows a "Paylaş" button where it will actually work (desktop Chrome, for
// example, exposes navigator.share but cannot share files).
export function supportsImageFileShare(): boolean {
  if (typeof navigator === "undefined") return false
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false
  try {
    return navigator.canShare({ files: [makeProbeFile()] })
  } catch {
    return false
  }
}

export type ShareImageResult = "shared" | "cancelled" | "unsupported" | "failed"

// Share a single rendered image plus an optional caption. Returns a discriminated
// result instead of throwing so the caller can tell a user cancel ("cancelled")
// apart from a real failure and only record analytics on a genuine "shared".
export async function shareImageFile(input: {
  blob: Blob
  filename: string
  title?: string
  text?: string
}): Promise<ShareImageResult> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported"
  }
  const file = new File([input.blob], input.filename, { type: input.blob.type || "image/png" })
  if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
    return "unsupported"
  }
  try {
    await navigator.share({ files: [file], title: input.title, text: input.text })
    return "shared"
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    return "failed"
  }
}
