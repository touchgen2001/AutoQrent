"use client"

import { useMemo, useState } from "react"
import { Download, ImageIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  formatMileage,
  formatPrice,
  getFuelTypeLabel,
  getTransmissionLabel,
  normalizeFuelType,
  normalizeTransmission,
} from "@/lib/vehicle-display"

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
}

export type SocialImageGallery = {
  name: string
  logo: string | null
  monogram: string
  showroomUrl: string
} | null

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
      .slice(0, 60) || "arac"
  )
}

export function VehicleSocialImageDialog({
  vehicle,
  gallery,
}: {
  vehicle: SocialImageVehicle
  gallery: SocialImageGallery
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const priceText = vehicle.price > 0 ? formatPrice(vehicle.price) : "Fiyat için arayın"

  const meta = useMemo(() => {
    const parts: string[] = []
    if (vehicle.mileage > 0) parts.push(formatMileage(vehicle.mileage))
    const fuelLabel = getFuelTypeLabel(normalizeFuelType(vehicle.fuel))
    if (fuelLabel !== "Bilinmiyor") parts.push(fuelLabel)
    const transmissionLabel = getTransmissionLabel(normalizeTransmission(vehicle.transmission))
    if (transmissionLabel !== "Bilinmiyor") parts.push(transmissionLabel)
    return parts.join(" · ")
  }, [vehicle.mileage, vehicle.fuel, vehicle.transmission])

  const urls = useMemo(() => {
    const map: Record<string, string> = {}
    for (const format of FORMATS) {
      const params = new URLSearchParams({
        format: format.key,
        title: vehicle.vehicleTitle,
        price: priceText,
      })
      if (meta) params.set("meta", meta)
      if (gallery?.name) params.set("gallery", gallery.name)
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
      if (vehicle.image) params.set("photo", vehicle.image)
      map[format.key] = `/og/vehicle?${params.toString()}`
    }
    return map
  }, [vehicle.vehicleTitle, vehicle.image, priceText, meta, gallery])

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setErrorMessage(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2" aria-label={`${vehicle.vehicleTitle} için sosyal medya görseli`}>
          <ImageIcon className="w-3 h-3" />
        </Button>
      </DialogTrigger>
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
                {!loaded[format.key] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- on-demand OG render, not a static asset */}
                <img
                  src={urls[format.key]}
                  alt={`${vehicle.vehicleTitle} ${format.label} önizleme`}
                  className="h-full w-full object-contain"
                  onLoad={() => setLoaded((current) => ({ ...current, [format.key]: true }))}
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
      </DialogContent>
    </Dialog>
  )
}
