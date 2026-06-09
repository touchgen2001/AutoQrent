import {
  formatMileage,
  formatPrice,
  getFuelTypeLabel,
  getTransmissionLabel,
  normalizeFuelType,
  normalizeTransmission,
} from "@/lib/vehicle-display"

// Shared builders for the vehicle social-share image URLs (/og/vehicle). Both the
// preview dialog and the bulk ZIP export route every image through here so a
// downloaded card is byte-for-byte the one the dealer previewed.

export type SocialFormatKey = "square" | "story"

export function vehiclePriceText(price: number): string {
  return price > 0 ? formatPrice(price) : "Fiyat için arayın"
}

export function buildVehicleMeta(vehicle: {
  mileage: number
  fuel: string
  transmission: string
}): string {
  const parts: string[] = []
  if (vehicle.mileage > 0) parts.push(formatMileage(vehicle.mileage))
  const fuelLabel = getFuelTypeLabel(normalizeFuelType(vehicle.fuel))
  if (fuelLabel !== "Bilinmiyor") parts.push(fuelLabel)
  const transmissionLabel = getTransmissionLabel(normalizeTransmission(vehicle.transmission))
  if (transmissionLabel !== "Bilinmiyor") parts.push(transmissionLabel)
  return parts.join(" · ")
}

export type VehicleOgUrlInput = {
  format: SocialFormatKey
  title: string
  priceText: string
  meta?: string
  galleryName?: string | null
  logo?: string | null
  monogram?: string | null
  showroomUrl?: string | null
  photo?: string | null
  badge?: string
  theme?: string
  /** Pre-formatted discount amount text (e.g. "30.000 TL") for the price-drop strip. */
  drop?: string
  phoneDisplay?: string | null
  qr?: string | null
  qrN?: number | null
}

export function buildVehicleOgUrl(input: VehicleOgUrlInput): string {
  const params = new URLSearchParams({
    format: input.format,
    title: input.title,
    price: input.priceText,
  })
  if (input.meta) params.set("meta", input.meta)
  if (input.galleryName) params.set("gallery", input.galleryName)
  if (input.showroomUrl) {
    try {
      params.set("tag", new URL(input.showroomUrl).host)
    } catch {
      // ignore unparsable showroom url; the route falls back to the brand domain
    }
  }
  if (input.logo) {
    params.set("logo", input.logo)
  } else if (input.monogram) {
    params.set("monogram", input.monogram)
  }
  if (input.photo) params.set("photo", input.photo)
  if (input.badge) params.set("badge", input.badge)
  if (input.drop) params.set("drop", input.drop)
  if (input.theme && input.theme !== "koyu") params.set("theme", input.theme)
  if (input.phoneDisplay) params.set("phone", input.phoneDisplay)
  if (input.qr && input.qrN) {
    params.set("qr", input.qr)
    params.set("qrN", String(input.qrN))
  }
  return `/og/vehicle?${params.toString()}`
}

// Suggest an automatic corner badge from a vehicle's status / freshness / price
// history. Status (sold/reserved) is the most important thing to communicate, so
// it wins over a price drop, which in turn wins over newness. Returns "" when
// nothing applies.
export function suggestVehicleBadge(
  input: { status?: string | null; createdAt?: string | null; priceDroppedAt?: string | null },
  now: number = Date.now(),
): string {
  const within = (iso: string | null | undefined, days: number) => {
    if (!iso) return false
    const time = Date.parse(iso)
    if (!Number.isFinite(time)) return false
    const delta = now - time
    return delta >= 0 && delta <= days * 24 * 60 * 60 * 1000
  }

  if (input.status === "sold") return "satildi"
  if (input.status === "reserved") return "rezerve"
  if (within(input.priceDroppedAt, 30)) return "fiyat-dustu"
  if (within(input.createdAt, 14)) return "yeni"
  return ""
}

export type RgbColor = { r: number; g: number; b: number }

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 255) return 255
  return value
}

// Pick the OG theme whose accent best matches a gallery's dominant logo color.
// Near-grayscale logos (low chroma) stay on the default dark "koyu" theme; strong
// reds/magentas map to "bordo"; blues/teals map to "lacivert". Pure function so it
// is unit-tested; the dialog feeds it a color sampled from the logo on the canvas.
export function pickThemeFromColor(rgb: RgbColor): "koyu" | "lacivert" | "bordo" {
  const r = clampChannel(rgb.r)
  const g = clampChannel(rgb.g)
  const b = clampChannel(rgb.b)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min
  if (chroma < 40) return "koyu"
  let hue: number
  if (max === r) {
    hue = ((g - b) / chroma) % 6
  } else if (max === g) {
    hue = (b - r) / chroma + 2
  } else {
    hue = (r - g) / chroma + 4
  }
  hue *= 60
  if (hue < 0) hue += 360
  if (hue >= 330 || hue < 45) return "bordo"
  if (hue >= 195 && hue < 290) return "lacivert"
  return "koyu"
}

export type BrandOgFormatKey = "profile" | "cover"

export type BrandOgGalleryInput = {
  name?: string | null
  showroomUrl?: string | null
  logo?: string | null
  monogram?: string | null
  city?: string | null
  heroTagline?: string | null
  vehicleCount?: number | null
}

// Build the gallery brand-kit image URL (/og/brand). Shared by the brand-kit
// preview dialog and the showroom ZIP export so the profile/cover images in the
// pack are byte-for-byte the ones the dealer previewed.
export function buildBrandOgUrl(
  gallery: BrandOgGalleryInput | null | undefined,
  format: BrandOgFormatKey,
  theme?: string,
): string {
  const params = new URLSearchParams()
  params.set("format", format)
  if (theme && theme !== "koyu") params.set("theme", theme)
  if (gallery?.name) params.set("gallery", gallery.name)
  if (gallery?.showroomUrl) {
    try {
      params.set("tag", new URL(gallery.showroomUrl).host)
    } catch {
      // ignore unparsable showroom url; the route falls back to the brand domain
    }
  }
  if (gallery?.logo) {
    params.set("logo", gallery.logo)
  } else if (gallery?.monogram) {
    params.set("monogram", gallery.monogram)
  }
  if (gallery?.city) params.set("city", gallery.city)
  if (gallery?.heroTagline) params.set("tagline", gallery.heroTagline)
  if (gallery?.vehicleCount && gallery.vehicleCount > 0) params.set("count", String(gallery.vehicleCount))
  return `/og/brand?${params.toString()}`
}

function toHashtag(value: string): string {
  const cleaned = value.normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "")
  return cleaned ? `#${cleaned}` : ""
}

// Build the ready-to-post Turkish caption for a single vehicle. Shared by the
// per-vehicle share dialog and the showroom ZIP export (one caption per car in
// `metinler.txt`) so a dealer gets the exact same text in both places.
export function buildVehicleCaption(input: {
  title: string
  priceText: string
  meta?: string | null
  galleryName?: string | null
  publicUrl?: string | null
  brand?: string | null
  model?: string | null
}): string {
  const lines: string[] = [input.title, input.priceText]
  if (input.meta) lines.push(input.meta)
  lines.push("")
  const galleryLabel = input.galleryName ? `${input.galleryName} vitrininde.` : "Vitrinimizde."
  lines.push(`${galleryLabel} Detaylı fotoğraflar ve test sürüşü için WhatsApp'tan yazabilirsiniz.`)
  if (input.publicUrl) {
    lines.push("")
    lines.push(input.publicUrl)
  }
  const tags = ["#ikinciel", "#otomobil", toHashtag(input.brand ?? ""), toHashtag(input.model ?? "")].filter(Boolean)
  if (tags.length > 0) {
    lines.push("")
    lines.push(tags.join(" "))
  }
  return lines.join("\n")
}
