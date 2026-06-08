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
  if (input.theme && input.theme !== "koyu") params.set("theme", input.theme)
  if (input.phoneDisplay) params.set("phone", input.phoneDisplay)
  if (input.qr && input.qrN) {
    params.set("qr", input.qr)
    params.set("qrN", String(input.qrN))
  }
  return `/og/vehicle?${params.toString()}`
}

// Suggest an automatic corner badge from a vehicle's freshness / price history.
// A recent price drop wins over newness. Returns "" when nothing applies.
export function suggestVehicleBadge(
  input: { createdAt?: string | null; priceDroppedAt?: string | null },
  now: number = Date.now(),
): string {
  const within = (iso: string | null | undefined, days: number) => {
    if (!iso) return false
    const time = Date.parse(iso)
    if (!Number.isFinite(time)) return false
    const delta = now - time
    return delta >= 0 && delta <= days * 24 * 60 * 60 * 1000
  }

  if (within(input.priceDroppedAt, 30)) return "fiyat-dustu"
  if (within(input.createdAt, 14)) return "yeni"
  return ""
}
