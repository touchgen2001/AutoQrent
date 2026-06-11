"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  Phone, 
  MessageCircle, 
  MapPin, 
  Calendar, 
  Share2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Clock,
  Building2,
  QrCode,
  ClipboardCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PublicLanguageSwitcher, usePublicLocale } from "@/components/shared/public-language-switcher"
import { VehicleImageFrame } from "@/components/shared/vehicle-image-frame"
import type { PublicVehicle, PublicVehicleDetail } from "@/lib/public-catalog-types"
import { buildVehicleBreadcrumbJsonLd, buildVehicleFaqItems, buildVehicleFaqJsonLd, buildVehicleJsonLd } from "@/lib/public-vehicle-jsonld"
import { IMAGE_PRESETS } from "@/lib/image-presets"
import { formatPublicNumber, formatPublicPrice, type PublicLocale } from "@/lib/public-i18n"

function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

type VehicleLeadFormData = {
  name: string
  email: string
  phone: string
  message: string
  website: string
  formStartedAt: number
}

type PublicVehicleEventType =
  | "view"
  | "whatsapp_click"
  | "call_click"
  | "location_click"
  | "share_click"
  | "form_open"

function buildInitialLeadFormData(): VehicleLeadFormData {
  return {
    name: "",
    email: "",
    phone: "",
    message: "",
    website: "",
    formStartedAt: Date.now(),
  }
}

type PublicVehiclePageClientProps = {
  routeId: string
  vehicle: PublicVehicleDetail
  otherVehicles?: PublicVehicle[]
}

function buildLocalizedLeadDefaultMessage(vehicleTitle: string, locale: PublicLocale, leadDefaultMessage: string) {
  if (locale === "tr") return `${vehicleTitle} ${leadDefaultMessage}`
  return `${leadDefaultMessage} (${vehicleTitle})`
}

function getOwnerLabel(previousOwners: number | null, locale: PublicLocale, ownerUnknown: string, ownerSuffix: string) {
  if (previousOwners === null) return ownerUnknown
  if (locale === "en") return `${previousOwners}${ownerSuffix}`
  if (locale === "ru") return `${previousOwners}${ownerSuffix}`
  if (locale === "ar") return `${previousOwners}${ownerSuffix}`
  return `${previousOwners}${ownerSuffix}`
}

function hasUsablePhone(value: string) {
  return value.replace(/\D/g, "").length >= 10
}

function hasUsableAddress(value: string) {
  const normalized = value.trim().toLowerCase()
  return Boolean(normalized && !normalized.includes("adres bilgisi eklenmedi"))
}

export function PublicVehiclePageClient({ routeId, vehicle, otherVehicles = [] }: PublicVehiclePageClientProps) {
  const { locale, setLocale, t, dir } = usePublicLocale()
  const searchParams = useSearchParams()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showGallery, setShowGallery] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [leadForm, setLeadForm] = useState<VehicleLeadFormData>(() => buildInitialLeadFormData())
  const [leadSubmitState, setLeadSubmitState] = useState<"idle" | "success" | "error">("idle")
  const [leadSubmitMessage, setLeadSubmitMessage] = useState("")
  const [leadFallbackWhatsAppUrl, setLeadFallbackWhatsAppUrl] = useState<string | null>(null)
  const [isLeadSubmitting, setIsLeadSubmitting] = useState(false)

  const vehicleJsonLd = buildVehicleJsonLd(vehicle)
  const vehicleFaqJsonLd = buildVehicleFaqJsonLd(vehicle)
  const vehicleBreadcrumbJsonLd = buildVehicleBreadcrumbJsonLd(vehicle)
  const vehicleFaqItems = buildVehicleFaqItems(vehicle)
  const vehicleTitle = `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.variant}`.trim()
  const hasVehicleImages = vehicle.images.length > 0
  const currentImageSrc = hasVehicleImages ? vehicle.images[currentImageIndex] || null : null
  const whatsappTarget = vehicle.gallery.whatsapp || vehicle.gallery.phone.replace(/\D/g, "")
  const canUseWhatsApp = hasUsablePhone(whatsappTarget)
  const canCallGallery = hasUsablePhone(vehicle.gallery.phone)
  const canOpenLocation = hasUsableAddress(vehicle.gallery.address)
  const routeSource = useMemo(() => {
    const src = searchParams.get("src")
    if (src === "qr") return "qr" as const
    if (src === "showroom") return "showroom" as const
    return "direct" as const
  }, [searchParams])
  const referrerSlug = useMemo(() => {
    const ref = searchParams.get("ref")
    if (!ref) return undefined
    const normalized = ref.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 80)
    return normalized || undefined
  }, [searchParams])
  const defaultLeadMessage = useMemo(
    () => buildLocalizedLeadDefaultMessage(vehicleTitle, locale, t("leadDefaultMessage")),
    [locale, t, vehicleTitle],
  )
  const sourceBadgeText = useMemo(() => {
    if (routeSource === "qr") return t("qrSourceBadge")
    if (routeSource === "showroom") return t("showroomSourceBadge")
    return t("directSourceBadge")
  }, [routeSource, t])
  const qrActionSteps = useMemo(
    () => [
      t("qrActionStepInspect"),
      canUseWhatsApp || canCallGallery ? t("qrActionStepContact") : t("qrActionStepForm"),
      t("qrActionStepPanel"),
    ],
    [canCallGallery, canUseWhatsApp, t],
  )
  const canSubmitLeadForm = useMemo(() => {
    return (
      leadForm.name.trim().length >= 2 &&
      Boolean(leadForm.phone.trim() || leadForm.email.trim())
    )
  }, [leadForm.name, leadForm.phone, leadForm.email])

  const recordVehicleEvent = useCallback((eventType: PublicVehicleEventType) => {
    if (!vehicle.routeId) return

    void fetch("/api/public/vehicle-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        vehicleRouteId: vehicle.routeId,
        source: routeSource,
        eventType,
      }),
      keepalive: true,
    }).catch(() => {
      // Event tracking must not block user flow.
    })
  }, [routeSource, vehicle.routeId])

  useEffect(() => {
    const marker = `vehicle-event:${vehicle.routeId}:${routeSource}`
    const now = Date.now()

    try {
      const previous = Number(window.sessionStorage.getItem(marker) || "0")
      if (Number.isFinite(previous) && previous > 0 && now - previous < 15 * 60 * 1000) {
        return
      }
      window.sessionStorage.setItem(marker, String(now))
    } catch {
      // Ignore storage access issues and continue best effort request.
    }

    recordVehicleEvent("view")
  }, [recordVehicleEvent, routeSource, vehicle.routeId])

  const formatPrice = (price: number) => formatPublicPrice(price, locale)

  const handleWhatsApp = () => {
    if (!canUseWhatsApp) return

    recordVehicleEvent("whatsapp_click")
    const message = encodeURIComponent(
      `${t("whatsappVehicleMessage")} ${vehicle.brand} ${vehicle.model} ${vehicle.variant} (${vehicle.year}). (Ref: ${routeId})${referrerSlug ? ` (Showroom: ${referrerSlug})` : ""}`
    )
    window.open(`https://wa.me/${whatsappTarget}?text=${message}`, '_blank')
  }

  const handleCall = () => {
    if (!canCallGallery) return
    recordVehicleEvent("call_click")
    window.location.href = `tel:${vehicle.gallery.phone}`
  }

  const handleLocation = () => {
    if (!canOpenLocation) return
    recordVehicleEvent("location_click")
    window.open(`https://maps.google.com/?q=${encodeURIComponent(vehicle.gallery.address)}`, '_blank')
  }

  // One-tap WhatsApp share: opens the recipient picker (no number) with a ready
  // localized message + the clean vehicle URL (tracking params stripped) so the
  // gallery can forward the listing to a customer instantly. Also serves as the
  // desktop fallback for handleShare (navigator.share is mobile-only).
  const handleWhatsAppShare = () => {
    recordVehicleEvent("share_click")
    const shareUrl = `${window.location.origin}${window.location.pathname}`
    const message = `${t("shareVehicleText")}\n${vehicleTitle} — ${formatPrice(vehicle.price)}\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}`
    if (typeof navigator !== "undefined" && navigator.share) {
      recordVehicleEvent("share_click")
      try {
        await navigator.share({
          title: vehicleTitle,
          text: `${vehicleTitle} — ${formatPrice(vehicle.price)}`,
          url: shareUrl,
        })
      } catch {
        // User cancelled or error
      }
      return
    }
    // Desktop / browsers without the Web Share API: fall back to WhatsApp share.
    handleWhatsAppShare()
  }

  const nextImage = () => {
    if (!hasVehicleImages) return
    setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length)
  }

  const prevImage = () => {
    if (!hasVehicleImages) return
    setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length)
  }

  const openContactForm = () => {
    recordVehicleEvent("form_open")
    setLeadSubmitState("idle")
    setLeadSubmitMessage("")
    setLeadFallbackWhatsAppUrl(null)
    setLeadForm((prev) => ({
      ...prev,
      formStartedAt: Date.now(),
    }))
    setShowContactForm(true)
  }

  const closeContactForm = () => {
    setShowContactForm(false)
  }

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLeadSubmitting) {
      return
    }

    if (!canSubmitLeadForm) {
      setLeadSubmitState("error")
      setLeadSubmitMessage(t("validationLead"))
      return
    }

    setIsLeadSubmitting(true)
    setLeadSubmitState("idle")
    setLeadSubmitMessage("")
    setLeadFallbackWhatsAppUrl(null)

    try {
      const response = await fetch("/api/vehicle-lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone,
          message: leadForm.message.trim() || defaultLeadMessage,
          vehicleId: vehicle.routeId,
          vehicleTitle,
          galleryWhatsapp: vehicle.gallery.whatsapp,
          source: routeSource,
          referrerSlug,
          website: leadForm.website,
          formStartedAt: leadForm.formStartedAt,
        }),
      })

      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        fallbackWhatsAppUrl?: string | null
      }

      if (!response.ok || !data.ok) {
        setLeadSubmitState("error")
        setLeadSubmitMessage(data.message ?? t("leadFallbackError"))
        return
      }

      setLeadSubmitState("success")
      setLeadSubmitMessage(data.message ?? t("leadFallbackSuccess"))
      setLeadFallbackWhatsAppUrl(data.fallbackWhatsAppUrl ?? null)
      setLeadForm(buildInitialLeadFormData())
    } catch {
      setLeadSubmitState("error")
      setLeadSubmitMessage(t("networkError"))
    } finally {
      setIsLeadSubmitting(false)
    }
  }

  const handleGalleryTouchEnd = (touchEndX: number) => {
    if (!hasVehicleImages) return
    if (touchStartX === null) return

    const swipeDistance = touchStartX - touchEndX
    setTouchStartX(null)
    if (Math.abs(swipeDistance) < 40) return

    if (swipeDistance > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length)
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length)
    }
  }

  useEffect(() => {
    if (!showGallery) return
    if (!hasVehicleImages) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowGallery(false)
      } else if (event.key === "ArrowRight") {
        setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length)
      } else if (event.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [hasVehicleImages, showGallery, vehicle.images.length])

  // One consolidated, sorted spec list (sahibinden tarzı) — replaces the three
  // scattered spec blocks so the info reads as a single tidy table.
  const damageText =
    vehicle.status.hasDamage === null ? t("damageUnknown") : vehicle.status.hasDamage ? t("damageYes") : t("damageNo")
  const serviceText =
    vehicle.status.serviceHistory === null
      ? t("serviceUnknown")
      : vehicle.status.serviceHistory === "partial"
        ? t("servicePartial")
        : vehicle.status.serviceHistory
          ? t("serviceFull")
          : t("serviceNo")
  const warrantyText =
    vehicle.status.warranty === null ? t("warrantyUnknown") : vehicle.status.warranty ? t("warrantyYes") : t("warrantyNo")
  const ownerText = getOwnerLabel(vehicle.status.previousOwners, locale, t("ownerUnknown"), t("ownerSuffix"))

  const specRows = [
    { label: t("modelYear"), value: String(vehicle.year) },
    { label: t("mileage"), value: `${formatPublicNumber(vehicle.mileage, locale)} km` },
    { label: t("fuel"), value: vehicle.fuel },
    { label: t("transmission"), value: vehicle.transmission },
    { label: t("bodyType"), value: vehicle.bodyType },
    { label: t("engineSize"), value: vehicle.engineSize },
    { label: t("horsePower"), value: vehicle.horsePower },
    { label: t("color"), value: vehicle.color },
  ].filter((row) => typeof row.value === "string" && row.value.trim().length > 0 && row.value.trim() !== "-")

  const conditionChips = [
    { text: damageText, ok: vehicle.status.hasDamage === false },
    { text: serviceText, ok: vehicle.status.serviceHistory === true || vehicle.status.serviceHistory === "partial" },
    { text: ownerText, ok: false },
    { text: warrantyText, ok: vehicle.status.warranty === true },
  ]

  return (
    <div className="min-h-screen bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))]" dir={dir}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(vehicleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(vehicleFaqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(vehicleBreadcrumbJsonLd) }}
      />

      {/* Header - Gallery Info */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{vehicle.gallery.name}</h2>
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
                <Clock className="w-3 h-3" />
                <span className="truncate">{vehicle.gallery.workingHours}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PublicLanguageSwitcher
              locale={locale}
              onLocaleChange={setLocale}
              label={t("language")}
              tone="dark"
              className="h-9 max-w-[120px] px-2"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label={t("shareVehicle")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-4 lg:py-6">
      {/* Image Gallery */}
      <div className="relative lg:sticky lg:top-20 lg:self-start lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border">
        <div
          className={cn("aspect-[4/3] bg-muted overflow-hidden", hasVehicleImages && "cursor-pointer")}
          onClick={() => {
            if (hasVehicleImages) setShowGallery(true)
          }}
        >
          <VehicleImageFrame
            src={currentImageSrc}
            alt={`${vehicle.brand} ${vehicle.model} ${vehicle.variant}`}
            width={1200}
            height={900}
            fill={false}
            preload={hasVehicleImages && currentImageIndex === 0}
            loading={currentImageIndex === 0 ? "eager" : "lazy"}
            quality={IMAGE_PRESETS.vehicleDetailCover.quality}
            sizes={IMAGE_PRESETS.vehicleDetailCover.sizes}
            className="aspect-[4/3]"
            imageClassName="h-full w-full object-cover"
            placeholderClassName="min-h-full"
          />
        </div>

        {/* Image Navigation */}
        {hasVehicleImages && vehicle.images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {hasVehicleImages && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-sm">
            {currentImageIndex + 1} / {vehicle.images.length}
          </div>
        )}

        {/* Thumbnail Strip — gerçek küçük fotoğraflar */}
        {hasVehicleImages && vehicle.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-muted/40 p-2">
            {vehicle.images.map((imageSrc, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`${t("thumbnail")} ${index + 1}`}
                className={cn(
                  "relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  index === currentImageIndex ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <VehicleImageFrame
                  src={imageSrc}
                  alt={`${vehicleTitle} ${t("thumbnail")} ${index + 1}`}
                  sizes="80px"
                  quality={60}
                  imageClassName="object-cover"
                  loading="lazy"
                  placeholderClassName="[&_svg]:h-4 [&_svg]:w-4 [&_span]:sr-only"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="px-4 py-5 lg:px-0 lg:py-0">
        {/* Title & Price */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {t("forSale")}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-primary/5 px-2 py-0.5 text-xs font-semibold text-primary">
                {routeSource === "qr" ? <QrCode className="size-3" /> : <ClipboardCheck className="size-3" />}
                {sourceBadgeText}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-muted-foreground">
              {vehicle.variant} • {vehicle.year}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">
              {formatPrice(vehicle.price)}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleWhatsAppShare}
          className="mt-4 w-full border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]"
        >
          <Share2 className="mr-2 h-4 w-4" />
          {t("shareWhatsapp")}
        </Button>

        {routeSource === "qr" && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-primary/10 bg-primary text-primary-foreground shadow-sm">
            <div className="flex items-start gap-3 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <QrCode className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground/60">
                  {t("qrVisitEyebrow")}
                </p>
                <h2 className="mt-1 text-lg font-black">{t("qrVisitTitle")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                  {t("qrVisitDescription")}
                </p>
              </div>
            </div>
            <div className="grid gap-2 border-t border-white/10 bg-white/[0.04] p-3 sm:grid-cols-3">
              {qrActionSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-primary-foreground/80">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/12 text-[11px] text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Araç Bilgileri — tek, sıralı liste (sahibinden tarzı) */}
        <div className="mt-5">
          <h3 className="mb-3 font-semibold text-foreground">{t("technicalSpecs")}</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            {specRows.map((row, index) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
                  index % 2 === 1 && "bg-muted/40",
                )}
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {conditionChips.map((chip) => (
              <span
                key={chip.text}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  chip.ok ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
                )}
              >
                {chip.ok ? <Check className="size-3.5" /> : null}
                {chip.text}
              </span>
            ))}
          </div>
        </div>

        {/* Features */}
        {vehicle.features.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold text-foreground mb-3">{t("features")}</h3>
            <div className="flex flex-wrap gap-2">
              {vehicle.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-muted text-sm rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-5">
          <h3 className="font-semibold text-foreground mb-3">{t("description")}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {vehicle.description}
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-5">
          <h3 className="font-semibold text-foreground mb-3">{t("faq")}</h3>
          <div className="space-y-2">
            {vehicleFaqItems.map((item) => (
              <details key={item.question} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Bu galeriden diğer araçlar */}
        {otherVehicles.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-3 font-semibold text-foreground">{t("moreFromGallery")}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {otherVehicles.map((item) => (
                <Link
                  key={item.routeId}
                  href={`/arac/${item.routeId}`}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-accent/40"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    <VehicleImageFrame
                      src={item.images[0] || null}
                      alt={`${item.brand} ${item.model}`}
                      sizes="(max-width: 640px) 50vw, 220px"
                      quality={62}
                      imageClassName="object-cover transition group-hover:scale-[1.03]"
                      loading="lazy"
                      placeholderClassName="[&_svg]:h-6 [&_svg]:w-6 [&_span]:sr-only"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.year} · {formatPublicNumber(item.mileage, locale)} km
                    </p>
                    <p className="mt-1 text-sm font-bold text-accent">{formatPrice(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Gallery Location */}
        <div className="mt-5 p-4 bg-muted rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{vehicle.gallery.name}</p>
                <p className="text-sm text-muted-foreground">{vehicle.gallery.address}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLocation} disabled={!canOpenLocation}>
              {t("route")}
            </Button>
          </div>
          {referrerSlug && (
            <Button asChild variant="link" className="mt-3 h-auto px-0 text-sm font-semibold">
              <Link href={`/showroom/${referrerSlug}`}>{t("backToShowroom")}</Link>
            </Button>
          )}
        </div>
      </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">{t("informationForm")}</h3>
              <button onClick={closeContactForm} aria-label={t("close")}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleLeadSubmit} noValidate>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={leadForm.website}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, website: event.target.value }))}
                className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
              />
              <Input
                type="text"
                name="name"
                value={leadForm.name}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t("namePlaceholder")}
                required
              />
              <Input
                type="email"
                name="email"
                value={leadForm.email}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder={t("emailPlaceholder")}
              />
              <Input
                type="tel"
                name="phone"
                value={leadForm.phone}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder={t("phonePlaceholder")}
              />
              <Textarea
                name="message"
                value={leadForm.message}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder={t("messagePlaceholder")}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t("defaultMessageInfo")}
              </p>

              {leadSubmitState !== "idle" && (
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    leadSubmitState === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-red-500/30 bg-red-500/10 text-red-700",
                  )}
                >
                  {leadSubmitMessage}
                  {leadSubmitState === "success" && leadFallbackWhatsAppUrl ? (
                    <Button asChild size="sm" className="mt-3 w-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
                      <Link href={leadFallbackWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 size-4" />
                        {t("continueOnWhatsapp")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLeadSubmitting || !canSubmitLeadForm}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isLeadSubmitting ? t("sending") : t("send")}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur">
        <div className="flex gap-2">
          <Button 
            onClick={handleWhatsApp}
            disabled={!canUseWhatsApp}
            title={!canUseWhatsApp ? t("whatsappMissing") : undefined}
            className="flex-1 h-12 bg-[#25D366] text-white hover:bg-[#25D366]/90 disabled:bg-muted disabled:text-muted-foreground"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {t("whatsapp")}
          </Button>
          <Button 
            onClick={handleCall}
            disabled={!canCallGallery}
            title={!canCallGallery ? t("phoneMissing") : undefined}
            className="flex-1 h-12 bg-accent hover:bg-accent/90 text-accent-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            <Phone className="w-5 h-5 mr-2" />
            {t("call")}
          </Button>
          <Button 
            variant="outline"
            className="h-12 px-4"
            onClick={handleLocation}
            disabled={!canOpenLocation}
            aria-label={t("openLocation")}
            title={!canOpenLocation ? t("locationMissing") : undefined}
          >
            <MapPin className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline"
            className="h-12 px-4"
            onClick={openContactForm}
            aria-label={t("openInfoForm")}
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showGallery && hasVehicleImages && (
        <div className="fixed inset-0 z-50 bg-black">
          <button 
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
          >
            <X className="w-6 h-6" />
          </button>
          {vehicle.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <div
            className="h-full flex items-center justify-center px-3 pb-20"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleGalleryTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            <div className="relative w-full max-w-5xl aspect-[4/3]">
              <VehicleImageFrame
                src={currentImageSrc}
                alt={`${vehicleTitle} - ${t("galleryVisual")} ${currentImageIndex + 1}`}
                sizes="(max-width: 768px) 100vw, 92vw"
                quality={76}
                imageClassName="object-contain"
                loading="eager"
                placeholderClassName="bg-black text-white/70"
              />
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-sm text-white">
            <span>{currentImageIndex + 1}</span>
            <span>/</span>
            <span>{vehicle.images.length}</span>
          </div>
          {vehicle.images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 overflow-x-auto bg-black/65 px-3 py-3">
              <div className="mx-auto flex w-max gap-2">
                {vehicle.images.map((imageSrc, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "relative h-14 w-20 overflow-hidden rounded border transition-all",
                      index === currentImageIndex ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <VehicleImageFrame
                      src={imageSrc}
                      alt={`${vehicleTitle} ${t("thumbnail")} ${index + 1}`}
                      sizes="80px"
                      quality={62}
                      imageClassName="object-cover"
                      loading="lazy"
                      placeholderClassName="[&_svg]:h-5 [&_svg]:w-5 [&_span]:sr-only"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
