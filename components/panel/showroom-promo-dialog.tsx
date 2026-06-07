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
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/vehicle-display"
import type { SocialImageGallery } from "@/components/panel/vehicle-social-image-dialog"

export type ShowroomPromoVehicle = {
  vehicleTitle: string
  price: number
  image: string | null
}

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

function priceText(price: number) {
  return price > 0 ? formatPrice(price) : "Fiyat için arayın"
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
      // itemTitle/itemPrice/itemPhoto are aligned by index in the OG route, so an
      // empty photo string is appended for highlights without a usable image.
      for (const item of highlights) {
        params.append("itemTitle", item.vehicleTitle)
        params.append("itemPrice", priceText(item.price))
        params.append("itemPhoto", item.image ?? "")
      }
      map[format.key] = `/og/showroom?${params.toString()}`
    }
    return map
  }, [gallery, vehicleCount, highlights])

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
