"use client"

import { useMemo, useState } from "react"
import { Download, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { SocialImageGallery } from "@/components/panel/vehicle-social-image-dialog"
import { buildBrandOgUrl } from "@/lib/social-image-url"

type BrandFormat = {
  key: "profile" | "cover"
  label: string
  hint: string
  aspectClass: string
  fileSuffix: string
}

const FORMATS: BrandFormat[] = [
  {
    key: "profile",
    label: "Profil · Instagram & WhatsApp",
    hint: "1080 × 1080",
    aspectClass: "aspect-square",
    fileSuffix: "profil",
  },
  {
    key: "cover",
    label: "Kapak · Facebook & WhatsApp Business",
    hint: "1640 × 624",
    aspectClass: "aspect-[1640/624]",
    fileSuffix: "kapak",
  },
]

function buildFileSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "galeri"
  )
}

/**
 * Brand-kit images for a dealer's social profiles: a square profile avatar and a
 * wide cover banner that match the showroom identity (logo/monogram, name,
 * tagline, vehicle count). Rendered on demand by the /og/brand edge route.
 */
export function GalleryBrandKitDialog({
  gallery,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  gallery: SocialImageGallery
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

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
    if (!next) setErrorMessage(null)
  }

  const urls = useMemo(() => {
    const map: Record<string, string> = {}
    for (const format of FORMATS) {
      map[format.key] = buildBrandOgUrl(gallery, format.key)
    }
    return map
  }, [gallery])

  const fileSlug = useMemo(() => buildFileSlug(gallery?.name ?? "galeri"), [gallery])

  const downloadImage = async (format: BrandFormat) => {
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            Profil & kapak görseli
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil & kapak görseli</DialogTitle>
          <DialogDescription>
            Galeri kimliğinize uygun profil fotoğrafı ve kapak görseli. Instagram, Facebook ve WhatsApp Business
            profilinizde kullanabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-6">
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
                  alt={`${format.label} önizleme`}
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

        <p className="text-xs text-muted-foreground">
          Profil görseli kare olarak hazırlanır; Instagram ve WhatsApp profilde yuvarlak gösterir, içerik ortada
          güvenli alanda tutulur.
        </p>
      </DialogContent>
    </Dialog>
  )
}
