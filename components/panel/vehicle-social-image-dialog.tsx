"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Download, ImageIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { packQrMatrix } from "@/lib/client/qr-matrix"
import {
  buildVehicleMeta,
  buildVehicleOgUrl,
  suggestVehicleBadge,
  vehiclePriceText,
} from "@/lib/social-image-url"
import { cn } from "@/lib/utils"

export type SocialImageVehicle = {
  vehicleTitle: string
  brand: string
  model: string
  year: number
  mileage: number
  fuel: string
  transmission: string
  price: number
  image: string | null
  publicUrl: string
  createdAt?: string | null
  priceDroppedAt?: string | null
}

export type SocialImageGallery = {
  name: string
  logo: string | null
  monogram: string
  showroomUrl: string
  phone?: string | null
  city?: string | null
  heroTagline?: string | null
  vehicleCount?: number
} | null

type ThemeKey = "koyu" | "acik" | "cerceve"

const THEME_OPTIONS: Array<{ value: ThemeKey; label: string }> = [
  { value: "koyu", label: "Koyu" },
  { value: "acik", label: "Açık" },
  { value: "cerceve", label: "Çerçeve" },
]

type SocialFormat = {
  key: "square" | "story"
  label: string
  hint: string
  aspectClass: string
  fileSuffix: string
}

const FORMATS: SocialFormat[] = [
  {
    key: "square",
    label: "Kare · Instagram & gönderi",
    hint: "1080 × 1080",
    aspectClass: "aspect-square",
    fileSuffix: "kare",
  },
  {
    key: "story",
    label: "Hikâye · Story & WhatsApp durumu",
    hint: "1080 × 1920",
    aspectClass: "aspect-[9/16]",
    fileSuffix: "hikaye",
  },
]

// Optional corner badge. `null` = follow the smart auto-suggestion, "" = force no
// badge, anything else = explicit. Keys match /og/vehicle?badge=.
const BADGE_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Otomatik" },
  { value: "", label: "Rozet yok" },
  { value: "firsat", label: "Fırsat" },
  { value: "yeni", label: "Yeni" },
  { value: "fiyat-dustu", label: "Fiyat düştü" },
  { value: "satildi", label: "Satıldı" },
  { value: "rezerve", label: "Rezerve" },
]

// Turkish display label for whatever the auto-suggestion resolves to.
const AUTO_BADGE_LABELS: Record<string, string> = {
  yeni: "Yeni",
  "fiyat-dustu": "Fiyat düştü",
}

function buildFileSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "arac"
  )
}

function toHashtag(value: string) {
  const cleaned = value.normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "")
  return cleaned ? `#${cleaned}` : ""
}

/**
 * Build a `SocialImageVehicle` from a panel vehicle shape (which carries
 * brand/model/year rather than a pre-built title). Used by the vehicle list and
 * edit pages where the dialog is opened from a row/header rather than the QR page.
 */
export function toSocialImageVehicle(vehicle: {
  brand: string
  model: string
  variant?: string | null
  year: number
  mileage: number
  fuel: string
  transmission: string
  price: number
  image?: string | null
  photos?: string[]
  publicUrl?: string | null
  createdAt?: string | null
  priceDroppedAt?: string | null
}): SocialImageVehicle {
  const variantPart = vehicle.variant ? ` ${vehicle.variant}` : ""
  return {
    vehicleTitle: `${vehicle.year} ${vehicle.brand} ${vehicle.model}${variantPart}`.trim(),
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    price: vehicle.price,
    image: vehicle.image ?? vehicle.photos?.[0] ?? null,
    publicUrl: vehicle.publicUrl ?? "",
    createdAt: vehicle.createdAt ?? null,
    priceDroppedAt: vehicle.priceDroppedAt ?? null,
  }
}

export function VehicleSocialImageDialog({
  vehicle,
  gallery,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  vehicle: SocialImageVehicle
  gallery: SocialImageGallery
  /** Controlled open state (for opening from a dropdown/menu). Omit for self-managed. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hide the built-in icon trigger when the dialog is opened externally. */
  hideTrigger?: boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // null = follow the auto-suggestion; "" = forced off; else explicit badge key.
  const [badgeOverride, setBadgeOverride] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeKey>("koyu")
  const [showWhatsapp, setShowWhatsapp] = useState(true)
  const [showQr, setShowQr] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
    if (!next) {
      setErrorMessage(null)
      setCaptionCopied(false)
    }
  }

  const priceText = vehiclePriceText(vehicle.price)

  const meta = useMemo(
    () => buildVehicleMeta({ mileage: vehicle.mileage, fuel: vehicle.fuel, transmission: vehicle.transmission }),
    [vehicle.mileage, vehicle.fuel, vehicle.transmission],
  )

  // Smart default badge from the vehicle's freshness / price history. The user can
  // override it (including forcing it off); a null override means "use this".
  const autoBadge = useMemo(
    () => suggestVehicleBadge({ createdAt: vehicle.createdAt, priceDroppedAt: vehicle.priceDroppedAt }),
    [vehicle.createdAt, vehicle.priceDroppedAt],
  )
  const effectiveBadge = badgeOverride ?? autoBadge

  // QR matrix is generated client-side (the qrcode lib bundles for the browser but
  // not the edge runtime) and passed to the OG route as a compact base64 string.
  const qrData = useMemo(() => (vehicle.publicUrl ? packQrMatrix(vehicle.publicUrl) : null), [vehicle.publicUrl])
  const galleryPhone = gallery?.phone || ""

  const urls = useMemo(() => {
    const map: Record<string, string> = {}
    for (const format of FORMATS) {
      map[format.key] = buildVehicleOgUrl({
        format: format.key,
        title: vehicle.vehicleTitle,
        priceText,
        meta,
        galleryName: gallery?.name ?? null,
        logo: gallery?.logo ?? null,
        monogram: gallery?.monogram ?? null,
        showroomUrl: gallery?.showroomUrl ?? null,
        photo: vehicle.image,
        badge: effectiveBadge || undefined,
        theme,
        phoneDisplay: showWhatsapp ? galleryPhone || null : null,
        qr: showQr && qrData ? qrData.qr : null,
        qrN: showQr && qrData ? qrData.n : null,
      })
    }
    return map
  }, [
    vehicle.vehicleTitle,
    vehicle.image,
    priceText,
    meta,
    gallery,
    effectiveBadge,
    theme,
    showWhatsapp,
    galleryPhone,
    showQr,
    qrData,
  ])

  const caption = useMemo(() => {
    const lines: string[] = [vehicle.vehicleTitle, priceText]
    if (meta) lines.push(meta)
    lines.push("")
    const galleryLabel = gallery?.name ? `${gallery.name} vitrininde.` : "Vitrinimizde."
    lines.push(`${galleryLabel} Detaylı fotoğraflar ve test sürüşü için WhatsApp'tan yazabilirsiniz.`)
    if (vehicle.publicUrl) {
      lines.push("")
      lines.push(vehicle.publicUrl)
    }
    const tags = ["#ikinciel", "#otomobil", toHashtag(vehicle.brand), toHashtag(vehicle.model)].filter(Boolean)
    if (tags.length > 0) {
      lines.push("")
      lines.push(tags.join(" "))
    }
    return lines.join("\n")
  }, [vehicle.vehicleTitle, vehicle.brand, vehicle.model, vehicle.publicUrl, priceText, meta, gallery])

  const fileSlug = useMemo(
    () => buildFileSlug(`${vehicle.brand}-${vehicle.model}-${vehicle.year}`),
    [vehicle.brand, vehicle.model, vehicle.year],
  )

  const downloadImage = async (format: SocialFormat) => {
    setDownloading(format.key)
    setErrorMessage(null)
    try {
      const response = await fetch(urls[format.key], { cache: "no-store" })
      if (!response.ok) throw new Error("download_failed")
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `cebindegaleri-${fileSlug}-${format.fileSuffix}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setErrorMessage("Görsel indirilemedi. Lütfen tekrar deneyin.")
    } finally {
      setDownloading(null)
    }
  }

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      setCaptionCopied(true)
      window.setTimeout(() => setCaptionCopied(false), 2000)
    } catch {
      setErrorMessage("Metin kopyalanamadı. Metni elle seçip kopyalayabilirsiniz.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            aria-label={`${vehicle.vehicleTitle} için sosyal medya görseli`}
          >
            <ImageIcon className="w-3 h-3" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sosyal medya görseli</DialogTitle>
          <DialogDescription>
            {vehicle.vehicleTitle} için hazır paylaşımlık görseller. İndirip Instagram gönderisi, hikâye veya WhatsApp
            durumunda paylaşabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Görsel ayarları: şablon, rozet ve iletişim öğeleri */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Şablon</span>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={theme === option.value ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Köşe rozeti</span>
            <div className="flex flex-wrap gap-2">
              {BADGE_OPTIONS.map((option) => (
                <Button
                  key={option.value ?? "auto"}
                  type="button"
                  variant={badgeOverride === option.value ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setBadgeOverride(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {badgeOverride === null && (
              <p className="text-xs text-muted-foreground">
                {autoBadge
                  ? `Otomatik öneri: ${AUTO_BADGE_LABELS[autoBadge] ?? autoBadge}`
                  : "Bu araç için otomatik rozet önerisi yok."}
              </p>
            )}
          </div>

          {(galleryPhone || qrData) && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">İletişim öğeleri</span>
              <div className="flex flex-wrap gap-2">
                {galleryPhone && (
                  <Button
                    type="button"
                    variant={showWhatsapp ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    onClick={() => setShowWhatsapp((value) => !value)}
                  >
                    WhatsApp numarası · {showWhatsapp ? "açık" : "kapalı"}
                  </Button>
                )}
                {qrData && (
                  <Button
                    type="button"
                    variant={showQr ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    onClick={() => setShowQr((value) => !value)}
                  >
                    Karekod · {showQr ? "açık" : "kapalı"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {galleryPhone
                  ? "WhatsApp numarası ve karekod, görseli görenlerin size ulaşmasını kolaylaştırır."
                  : "Karekod, görseli görenlerin araç sayfasını telefonla açmasını sağlar."}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {FORMATS.map((format) => (
            <div key={format.key} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{format.label}</span>
                <span className="text-xs text-muted-foreground">{format.hint}</span>
              </div>

              <div
                className={`relative ${format.aspectClass} w-full overflow-hidden rounded-lg border border-border bg-muted`}
              >
                {!loaded[urls[format.key]] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- on-demand OG render, not a static asset */}
                <img
                  key={urls[format.key]}
                  src={urls[format.key]}
                  alt={`${vehicle.vehicleTitle} ${format.label} önizleme`}
                  className="h-full w-full object-contain"
                  onLoad={() => setLoaded((current) => ({ ...current, [urls[format.key]]: true }))}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => void downloadImage(format)}
                disabled={downloading !== null}
              >
                {downloading === format.key ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Hazırlanıyor
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    İndir
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Ready-to-copy Turkish caption */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Hazır paylaşım metni</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-8", captionCopied && "border-emerald-500/40 text-emerald-700")}
              onClick={() => void copyCaption()}
            >
              {captionCopied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Metni kopyala
                </>
              )}
            </Button>
          </div>
          <Textarea
            readOnly
            value={caption}
            rows={7}
            className="resize-none text-sm"
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className="text-xs text-muted-foreground">
            Görseli paylaşırken bu metni açıklamaya yapıştırabilirsiniz. Etiketleri ve linki dilediğiniz gibi
            düzenleyebilirsiniz.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
