"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Download, FileArchive, ImageIcon, Loader2 } from "lucide-react"

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
import { recordVehicleShareDownloads } from "@/lib/client/social-share-events"
import { createZip, type ZipEntry } from "@/lib/client/zip"
import {
  buildVehicleCaption,
  buildVehicleMeta,
  buildVehicleOgUrl,
  suggestVehicleBadge,
  vehiclePriceText,
} from "@/lib/social-image-url"
import { cn } from "@/lib/utils"
import type { SocialImageGallery } from "@/components/panel/vehicle-social-image-dialog"

export type ShowroomPromoVehicle = {
  vehicleId?: string | null
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
  status?: string | null
  createdAt?: string | null
  priceDroppedAt?: string | null
}

// Cap on how many vehicle images we fetch in parallel while zipping a whole
// showroom, so a large inventory doesn't flood the edge route at once.
const ZIP_CONCURRENCY = 4

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

function buildFileSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "vitrin"
  )
}

function toHashtag(value: string) {
  const cleaned = value.normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "")
  return cleaned ? `#${cleaned}` : ""
}

/**
 * Showroom-wide promo image. One card for the whole gallery: an
 * "N araç vitrinde" headline, up to three highlighted vehicles (photos preferred)
 * and the showroom link — ready to share on Instagram, stories or WhatsApp.
 */
export function ShowroomPromoDialog({
  gallery,
  vehicles,
  vehicleCount,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  gallery: SocialImageGallery
  vehicles: ShowroomPromoVehicle[]
  vehicleCount: number
  /** Controlled open state (for opening from a menu). Omit for self-managed. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hide the built-in trigger when the dialog is opened externally. */
  hideTrigger?: boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [showWhatsapp, setShowWhatsapp] = useState(true)
  const [showQr, setShowQr] = useState(true)
  // Per-format ZIP build state: which format is building + how far along.
  const [zipBusy, setZipBusy] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null)

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

  const galleryPhone = gallery?.phone || ""
  // The showroom QR encodes the public showroom URL so a scan opens the whole
  // vitrin. Generated client-side (qrcode lib doesn't bundle for the edge route).
  const qrShowroom = useMemo(
    () => (gallery?.showroomUrl ? packQrMatrix(gallery.showroomUrl) : null),
    [gallery],
  )

  // Up to three highlights, preferring vehicles that have a usable photo so the
  // card looks full; the rest fill any remaining slots.
  const highlights = useMemo(() => {
    const withImage = vehicles.filter((vehicle) => vehicle.image)
    const withoutImage = vehicles.filter((vehicle) => !vehicle.image)
    return [...withImage, ...withoutImage].slice(0, 3)
  }, [vehicles])

  const urls = useMemo(() => {
    const map: Record<string, string> = {}
    for (const format of FORMATS) {
      const params = new URLSearchParams()
      params.set("format", format.key)
      if (gallery?.name) params.set("gallery", gallery.name)
      if (vehicleCount > 0) params.set("count", String(vehicleCount))
      if (gallery?.showroomUrl) {
        try {
          params.set("tag", new URL(gallery.showroomUrl).host)
        } catch {
          // ignore unparsable showroom url; route falls back to the brand domain
        }
      }
      if (gallery?.logo) {
        params.set("logo", gallery.logo)
      } else if (gallery?.monogram) {
        params.set("monogram", gallery.monogram)
      }
      if (showWhatsapp && galleryPhone) params.set("phone", galleryPhone)
      if (showQr && qrShowroom) {
        params.set("qr", qrShowroom.qr)
        params.set("qrN", String(qrShowroom.n))
      }
      // itemTitle/itemPrice/itemPhoto are aligned by index in the OG route, so an
      // empty photo string is appended for highlights without a usable image.
      for (const item of highlights) {
        params.append("itemTitle", item.vehicleTitle)
        params.append("itemPrice", vehiclePriceText(item.price))
        params.append("itemPhoto", item.image ?? "")
      }
      map[format.key] = `/og/showroom?${params.toString()}`
    }
    return map
  }, [gallery, vehicleCount, highlights, showWhatsapp, galleryPhone, showQr, qrShowroom])

  const caption = useMemo(() => {
    const name = gallery?.name ?? "Galerimiz"
    const lines: string[] = []
    if (vehicleCount > 0) {
      lines.push(`${name} vitrininde ${vehicleCount} araç sizi bekliyor.`)
    } else {
      lines.push(`${name} vitrinindeki araçlar sizi bekliyor.`)
    }
    lines.push("Tüm araçları görüntülemek, fotoğraflara bakmak ve test sürüşü için bize WhatsApp'tan yazabilirsiniz.")
    if (gallery?.showroomUrl) {
      lines.push("")
      lines.push(gallery.showroomUrl)
    }
    const tags = ["#galeri", "#ikinciel", "#otomobil", toHashtag(gallery?.name ?? "")].filter(Boolean)
    if (tags.length > 0) {
      lines.push("")
      lines.push(tags.join(" "))
    }
    return lines.join("\n")
  }, [gallery, vehicleCount])

  const fileSlug = useMemo(() => buildFileSlug(gallery?.name ?? "vitrin"), [gallery])

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
      link.download = `cebindegaleri-vitrin-${fileSlug}-${format.fileSuffix}.png`
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

  // Bulk-download every vehicle's share image (one chosen format) as a single ZIP,
  // so a dealer can grab the whole showroom in one click instead of one-by-one.
  // Each image uses the same smart auto-badge + WhatsApp contact as the single
  // previews, and we fetch with a small concurrency cap to stay gentle on the
  // edge route.
  const downloadZip = async (format: SocialFormat) => {
    if (vehicles.length === 0 || zipBusy) return
    setZipBusy(format.key)
    setErrorMessage(null)
    setZipProgress({ done: 0, total: vehicles.length })

    const phone = showWhatsapp ? galleryPhone || null : null
    const entries: ZipEntry[] = []
    // Per-vehicle captions + image names collected by index so the ZIP's
    // `metinler.txt` lines up with the numbered images even though the workers
    // below finish out of order.
    const captions: string[] = new Array(vehicles.length)
    const imageNames: string[] = new Array(vehicles.length)
    let nextIndex = 0
    let completed = 0

    const worker = async () => {
      while (nextIndex < vehicles.length) {
        const current = nextIndex
        nextIndex += 1
        const vehicle = vehicles[current]
        const url = buildVehicleOgUrl({
          format: format.key,
          title: vehicle.vehicleTitle,
          priceText: vehiclePriceText(vehicle.price),
          meta: buildVehicleMeta(vehicle),
          galleryName: gallery?.name ?? null,
          logo: gallery?.logo ?? null,
          monogram: gallery?.monogram ?? null,
          showroomUrl: gallery?.showroomUrl ?? null,
          photo: vehicle.image,
          badge:
            suggestVehicleBadge({
              status: vehicle.status,
              createdAt: vehicle.createdAt,
              priceDroppedAt: vehicle.priceDroppedAt,
            }) || undefined,
          phoneDisplay: phone,
        })
        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) throw new Error("download_failed")
        const data = new Uint8Array(await response.arrayBuffer())
        const slug = buildFileSlug(`${vehicle.brand}-${vehicle.model}-${vehicle.year}`)
        const name = `${String(current + 1).padStart(2, "0")}-${slug}-${format.fileSuffix}.png`
        entries.push({ name, data })
        imageNames[current] = name
        captions[current] = buildVehicleCaption({
          title: vehicle.vehicleTitle,
          priceText: vehiclePriceText(vehicle.price),
          meta: buildVehicleMeta(vehicle),
          galleryName: gallery?.name ?? null,
          publicUrl: vehicle.publicUrl,
          brand: vehicle.brand,
          model: vehicle.model,
        })
        completed += 1
        setZipProgress({ done: completed, total: vehicles.length })
      }
    }

    try {
      const workers = Array.from({ length: Math.min(ZIP_CONCURRENCY, vehicles.length) }, () => worker())
      await Promise.all(workers)
      // Workers finish out of order; sort by filename so the ZIP lists vehicles 01..N.
      entries.sort((a, b) => a.name.localeCompare(b.name))
      // A ready-to-paste caption per vehicle, each headed by its image file name so
      // the dealer knows which text goes with which picture.
      const intro = `${gallery?.name ?? "Vitrin"} · araç paylaşım metinleri\nHer başlık, ZIP içindeki aynı isimli görsele aittir.`
      const blocks = vehicles.map((vehicle, index) => {
        const heading = imageNames[index] ?? `${String(index + 1).padStart(2, "0")} · ${vehicle.vehicleTitle}`
        return `# ${heading}\n\n${captions[index] ?? ""}`
      })
      const captionText = [intro, ...blocks].join("\n\n----------------------------------------\n\n")
      entries.push({ name: "metinler.txt", data: new TextEncoder().encode(captionText) })
      const blob = createZip(entries)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `cebindegaleri-vitrin-gorselleri-${fileSlug}-${format.fileSuffix}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      // Best-effort: log one download event per vehicle so the panel's
      // "en çok indirilen araç görselleri" card reflects ZIP exports too.
      void recordVehicleShareDownloads(
        vehicles.map((vehicle) => ({
          vehicleId: vehicle.vehicleId,
          vehicleTitle: vehicle.vehicleTitle,
        })),
        { format: format.key, scope: "zip" },
      )
    } catch {
      setErrorMessage("Görsel paketi hazırlanamadı. Lütfen tekrar deneyin.")
    } finally {
      setZipBusy(null)
      setZipProgress(null)
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
          <Button variant="outline">
            <ImageIcon className="w-4 h-4 mr-2" />
            Vitrin tanıtım görseli
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vitrin tanıtım görseli</DialogTitle>
          <DialogDescription>
            Tüm vitrininiz için tek görsel: araç sayınız, öne çıkan modeller ve vitrin bağlantınız. İndirip Instagram
            gönderisi, hikâye veya WhatsApp durumunda paylaşabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {(galleryPhone || qrShowroom) && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4">
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
              {qrShowroom && (
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
              Karekod vitrin bağlantınızı taşır; WhatsApp numarası görseli görenlerin doğrudan size yazmasını sağlar.
            </p>
          </div>
        )}

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
                  alt={`Vitrin tanıtım görseli ${format.label} önizleme`}
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

        {/* Bulk export: every vehicle's share image as one ZIP */}
        {vehicles.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Araç görsel paketi (ZIP)</span>
              <p className="text-xs text-muted-foreground">
                Vitrindeki {vehicles.length} aracın paylaşım görselini ve her araç için hazır paylaşım metnini
                (metinler.txt) tek dosyada indirin. Her görselde otomatik rozet
                {galleryPhone ? " ve WhatsApp numaranız" : ""} kullanılır.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FORMATS.map((format) => (
                <Button
                  key={format.key}
                  variant="outline"
                  className="w-full"
                  onClick={() => void downloadZip(format)}
                  disabled={zipBusy !== null}
                >
                  {zipBusy === format.key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {zipProgress ? `Hazırlanıyor · ${zipProgress.done}/${zipProgress.total}` : "Hazırlanıyor"}
                    </>
                  ) : (
                    <>
                      <FileArchive className="mr-2 h-4 w-4" />
                      {format.fileSuffix === "kare" ? "Kare paketi" : "Hikâye paketi"}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

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
            rows={6}
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
