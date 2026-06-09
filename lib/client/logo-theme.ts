import { useEffect, useState } from "react"

import { pickThemeFromColor, type RgbColor } from "@/lib/social-image-url"

// Shared logo → theme suggestion used by every social-image dialog. The gallery
// logo is drawn small on a canvas, its dominant chromatic color sampled, and
// mapped to an OG theme (koyu/lacivert/bordo). Pure color math lives in
// `pickThemeFromColor`; this module owns the browser-only canvas + React glue.

export type LogoTheme = "koyu" | "lacivert" | "bordo"

// Sample a logo's dominant chromatic color by drawing it small and averaging the
// opaque, non-background pixels. Returns null when the canvas is unavailable or
// tainted (cross-origin logo without CORS headers) so the caller keeps the default.
export function averageColorFromImage(img: HTMLImageElement): RgbColor | null {
  const size = 32
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  let fr = 0
  let fg = 0
  let fb = 0
  let fallbackCount = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const cr = data[i]
    const cg = data[i + 1]
    const cb = data[i + 2]
    fr += cr
    fg += cg
    fb += cb
    fallbackCount += 1
    const max = Math.max(cr, cg, cb)
    const min = Math.min(cr, cg, cb)
    // Skip near-white background and near-black outlines for the chromatic average.
    if (min > 230 || max < 25) continue
    r += cr
    g += cg
    b += cb
    count += 1
  }
  if (count > 0) return { r: r / count, g: g / count, b: b / count }
  if (fallbackCount > 0) return { r: fr / fallbackCount, g: fg / fallbackCount, b: fb / fallbackCount }
  return null
}

// Read the gallery logo and suggest the OG theme that matches its brand color.
// State is only set inside the async image onload (never synchronously in the
// effect body), which keeps react-hooks/set-state-in-effect happy. Returns null
// until/unless a color is resolved (no logo, tainted canvas, …) → caller defaults.
export function useLogoTheme(logoUrl: string | null | undefined): LogoTheme | null {
  const [suggested, setSuggested] = useState<LogoTheme | null>(null)

  useEffect(() => {
    if (!logoUrl) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      if (cancelled) return
      try {
        const color = averageColorFromImage(img)
        if (color) setSuggested(pickThemeFromColor(color))
      } catch {
        // Tainted canvas / no 2d context — keep the default theme.
      }
    }
    img.src = logoUrl
    return () => {
      cancelled = true
    }
  }, [logoUrl])

  return suggested
}
