"use client"

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BrandLogo } from "@/components/brand/brand-logo"
import { useRegistrationFunnel } from "@/components/analytics/use-registration-funnel"
import {
  QrCode,
  Upload,
  MapPin,
  Phone,
  Clock,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react"

const steps = [
  { id: 1, title: "Galeri Bilgileri", icon: QrCode },
  { id: 2, title: "İletişim", icon: Phone },
  { id: 3, title: "Konum", icon: MapPin },
  { id: 4, title: "Çalışma Saatleri", icon: Clock },
]

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])
const ALLOWED_LOGO_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"])
const ONBOARDING_DRAFT_STORAGE_KEY = "onboarding_draft_v1"

type DayHours = {
  start: string
  end: string
  closed?: boolean
}

type OnboardingFormData = {
  galleryName: string
  description: string
  logo: File | null
  logoPreview: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  city: string
  district: string
  latitude: string
  longitude: string
  workingHours: {
    weekdays: DayHours
    saturday: DayHours
    sunday: DayHours
  }
}

function isValidTimeRange(start: string, end: string) {
  return Boolean(start) && Boolean(end) && start < end
}

function isValidEmail(email: string) {
  if (!email.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function getMapQuery(input: { address: string; district: string; city: string }) {
  return [input.address.trim(), input.district.trim(), input.city.trim()].filter(Boolean).join(", ")
}

function parseCoordinate(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function isLatitudeValid(value: number | null) {
  return value !== null && value >= -90 && value <= 90
}

function isLongitudeValid(value: number | null) {
  return value !== null && value >= -180 && value <= 180
}

function buildOpenStreetMapEmbedUrl(latitude: number, longitude: number) {
  const delta = 0.02
  const minLon = longitude - delta
  const minLat = latitude - delta
  const maxLon = longitude + delta
  const maxLat = latitude + delta
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`
  const marker = `${latitude},${longitude}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`
}

function buildOpenStreetMapOpenUrl(latitude: number, longitude: number) {
  const zoom = 16
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`
}

function buildGoogleMapsShareUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function formatDayHours(hours: DayHours) {
  if (hours.closed) return "Kapalı"
  return `${hours.start} - ${hours.end}`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }
      reject(new Error("Logo dosyası okunamadı."))
    }
    reader.onerror = () => reject(new Error("Logo dosyası okunamadı."))
    reader.readAsDataURL(file)
  })
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function isAllowedLogoFile(file: File) {
  if (ALLOWED_LOGO_TYPES.has(file.type)) return true
  return ALLOWED_LOGO_EXTENSIONS.has(getFileExtension(file.name))
}

type GalleryLogoUploadResponse = {
  ok?: boolean
  message?: string
  item?: {
    publicUrl: string
  }
}

type PublicGeocodeResponse = {
  ok?: boolean
  message?: string
  item?: {
    latitude: number
    longitude: number
    displayName: string
  }
}

type PanelSettingsPatchResponse = {
  ok?: boolean
  message?: string
}

type OnboardingDraft = {
  currentStep: number
  formData: Omit<OnboardingFormData, "logo" | "logoPreview"> & { logoPreview?: string }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { trackEvent } = useRegistrationFunnel({ eventType: "onboarding_view" })
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftStatusMessage, setDraftStatusMessage] = useState<string | null>(null)
  const [isDragOverLogo, setIsDragOverLogo] = useState(false)
  const [formData, setFormData] = useState<OnboardingFormData>({
    galleryName: "",
    description: "",
    logo: null,
    logoPreview: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    address: "",
    city: "",
    district: "",
    latitude: "",
    longitude: "",
    workingHours: {
      weekdays: { start: "09:00", end: "19:00" },
      saturday: { start: "09:00", end: "17:00" },
      sunday: { closed: true, start: "10:00", end: "16:00" },
    },
  })

  const mapQuery = useMemo(
    () =>
      getMapQuery({
        address: formData.address,
        city: formData.city,
        district: formData.district,
      }),
    [formData.address, formData.city, formData.district],
  )

  const parsedLatitude = useMemo(() => parseCoordinate(formData.latitude), [formData.latitude])
  const parsedLongitude = useMemo(() => parseCoordinate(formData.longitude), [formData.longitude])
  const hasValidCoordinates = isLatitudeValid(parsedLatitude) && isLongitudeValid(parsedLongitude)

  const mapEmbedUrl = useMemo(() => {
    if (!hasValidCoordinates) return null
    return buildOpenStreetMapEmbedUrl(parsedLatitude as number, parsedLongitude as number)
  }, [hasValidCoordinates, parsedLatitude, parsedLongitude])

  const mapOpenUrl = useMemo(() => {
    if (!hasValidCoordinates) return null
    return buildOpenStreetMapOpenUrl(parsedLatitude as number, parsedLongitude as number)
  }, [hasValidCoordinates, parsedLatitude, parsedLongitude])

  const weekdayInvalid = !isValidTimeRange(formData.workingHours.weekdays.start, formData.workingHours.weekdays.end)
  const saturdayInvalid = !isValidTimeRange(formData.workingHours.saturday.start, formData.workingHours.saturday.end)
  const sundayInvalid =
    !formData.workingHours.sunday.closed
    && !isValidTimeRange(formData.workingHours.sunday.start, formData.workingHours.sunday.end)
  const hasHoursValidationError = weekdayInvalid || saturdayInvalid || sundayInvalid

  useEffect(() => {
    if (typeof window === "undefined") return

    const rawDraft = window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)
    if (!rawDraft) return

    try {
      const parsed = JSON.parse(rawDraft) as OnboardingDraft
      if (parsed?.formData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({
          ...prev,
          ...parsed.formData,
          logo: null,
          logoPreview: "",
        }))
      }

      if (typeof parsed?.currentStep === "number" && Number.isFinite(parsed.currentStep)) {
        setCurrentStep(Math.min(Math.max(Math.trunc(parsed.currentStep), 1), 4))
      }

      setDraftStatusMessage("Kaydedilmiş taslak geri yüklendi.")
    } catch {
      window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const draft: OnboardingDraft = {
      currentStep,
      formData: {
        galleryName: formData.galleryName,
        description: formData.description,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        latitude: formData.latitude,
        longitude: formData.longitude,
        workingHours: formData.workingHours,
      },
    }

    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [currentStep, formData])

  const handleBack = () => {
    setErrorMessage(null)
    if (currentStep > 1) setCurrentStep((prev) => prev - 1)
  }

  const handleSkip = () => {
    trackEvent({ eventType: "onboarding_skip", step: currentStep })
    router.push("/panel")
  }

  const updateDayHours = (
    day: "weekdays" | "saturday" | "sunday",
    field: "start" | "end" | "closed",
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value,
        },
      },
    }))
  }

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (formData.galleryName.trim().length < 2) return "Galeri adı en az 2 karakter olmalıdır."
      return null
    }

    if (currentStep === 2) {
      if (!formData.phone.trim() && !formData.whatsapp.trim()) {
        return "Telefon veya WhatsApp alanlarından en az birini doldurun."
      }
      if (!isValidEmail(formData.email)) return "Geçerli bir e-posta adresi girin."
      return null
    }

    if (currentStep === 3) {
      if (!formData.city.trim() || !formData.district.trim() || !formData.address.trim()) {
        return "İl, ilçe ve açık adres alanlarını doldurun."
      }
      if (!hasValidCoordinates) {
        return "Harita için geçerli enlem ve boylam bilgisi girin veya adresten otomatik doldurun."
      }
      return null
    }

    if (currentStep === 4) {
      if (hasHoursValidationError) {
        return "Saat aralıklarını kontrol edin. Başlangıç saati bitiş saatinden önce olmalıdır."
      }
      return null
    }

    return null
  }

  const handleNext = () => {
    const stepError = validateCurrentStep()
    if (stepError) {
      setErrorMessage(stepError)
      return
    }

    setErrorMessage(null)
    if (currentStep < 4) {
      const nextStep = currentStep + 1
      trackEvent({ eventType: "onboarding_step", step: nextStep })
      setCurrentStep(nextStep)
    }
  }

  const applyLogoFile = async (file: File) => {
    if (!isAllowedLogoFile(file)) {
      setErrorMessage("Sadece güvenli PNG, JPG veya WEBP logo yükleyebilirsiniz.")
      return
    }

    if (file.size > MAX_LOGO_BYTES) {
      setErrorMessage("Logo boyutu en fazla 5MB olmalıdır.")
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFormData((prev) => ({ ...prev, logo: file, logoPreview: dataUrl }))
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logo dosyası okunamadı.")
    }
  }

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    void applyLogoFile(file)
  }

  const handleLogoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOverLogo(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    void applyLogoFile(file)
  }

  const setCoordinates = (latitude: number, longitude: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }))
  }

  const handleResolveAddressToCoordinates = async () => {
    if (!mapQuery) {
      setErrorMessage("Önce il, ilçe ve açık adresi girin.")
      return
    }

    setIsResolvingAddress(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/public/geocode", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: mapQuery,
        }),
      })

      const data = (await response.json()) as PublicGeocodeResponse
      if (!response.ok || !data.ok || !data.item) {
        setErrorMessage(data.message ?? "Adres koordinata çevrilemedi.")
        return
      }

      setCoordinates(data.item.latitude, data.item.longitude)
    } catch {
      setErrorMessage("Ağ hatası nedeniyle koordinat bulunamadı.")
    } finally {
      setIsResolvingAddress(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("Tarayıcınız konum servisini desteklemiyor.")
      return
    }

    setErrorMessage(null)
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(position.coords.latitude, position.coords.longitude)
        setIsDetectingLocation(false)
      },
      () => {
        setErrorMessage("Mevcut konum alınamadı. Konum izni verdiğinizden emin olun.")
        setIsDetectingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const handleComplete = async () => {
    const stepError = validateCurrentStep()
    if (stepError) {
      setErrorMessage(stepError)
      return
    }

    setErrorMessage(null)
    setIsLoading(true)

    try {
      let uploadedLogoUrl: string | undefined

      if (formData.logo) {
        const payload = new FormData()
        payload.append("file", formData.logo)

        const response = await fetch("/api/panel/uploads/gallery-logo", {
          method: "POST",
          body: payload,
        })

        const data = (await response.json()) as GalleryLogoUploadResponse
        if (!response.ok || !data.ok || !data.item?.publicUrl) {
          setErrorMessage(data.message ?? "Logo yüklenemedi. Lütfen tekrar deneyin.")
          return
        }

        uploadedLogoUrl = data.item.publicUrl
      }

      const latitude = hasValidCoordinates ? (parsedLatitude as number) : null
      const longitude = hasValidCoordinates ? (parsedLongitude as number) : null

      const response = await fetch("/api/panel/settings", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: formData.galleryName,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          websiteUrl: formData.website,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          latitude,
          longitude,
          googleMapsUrl:
            latitude !== null && longitude !== null
              ? buildGoogleMapsShareUrl(latitude, longitude)
              : "",
          workingHours: {
            weekdays: formatDayHours(formData.workingHours.weekdays),
            saturday: formatDayHours(formData.workingHours.saturday),
            sunday: formatDayHours(formData.workingHours.sunday),
          },
          ...(uploadedLogoUrl ? { logoUrl: uploadedLogoUrl } : {}),
        }),
      })

      const data = (await response.json()) as PanelSettingsPatchResponse
      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "Galeri ayarları kaydedilemedi.")
        return
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY)
      }

      trackEvent({ eventType: "onboarding_complete", step: 4 })
      router.push("/panel")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Kurulum tamamlanamadı.")
    } finally {
      setIsLoading(false)
    }
  }

  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo href="/" tone="light" />
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Daha Sonra Tamamla
            </Button>
          </div>
          {draftStatusMessage && <p className="mt-2 text-xs text-muted-foreground">{draftStatusMessage}</p>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-10">
          <div className="relative hidden sm:block mb-3">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex flex-col items-center text-center">
                {index < steps.length - 1 && (
                  <div
                    className={`sm:hidden absolute left-[55%] top-5 h-0.5 w-[90%] ${
                      currentStep > step.id ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id
                      ? "bg-accent text-accent-foreground"
                      : currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Galeri Bilgileri</h2>
                <p className="text-muted-foreground mt-1">Galerinizin temel bilgilerini girin</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="galleryName">Galeri Adı</Label>
                  <Input
                    id="galleryName"
                    placeholder="ABC Otomotiv"
                    value={formData.galleryName}
                    onChange={(e) => setFormData({ ...formData, galleryName: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Galeri Açıklaması</Label>
                  <Textarea
                    id="description"
                    placeholder="Galeriniz hakkında kısa bir açıklama yazın..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Galeri Logosu</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors ${
                      isDragOverLogo ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => logoInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        logoInputRef.current?.click()
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDragOverLogo(true)
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault()
                      setIsDragOverLogo(false)
                    }}
                    onDrop={handleLogoDrop}
                  >
                    {formData.logoPreview ? (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.logoPreview}
                          alt="Yüklenen galeri logosu"
                          className="h-28 w-28 object-contain rounded-lg border border-border mx-auto bg-background"
                        />
                        <p className="text-sm text-foreground font-medium truncate">{formData.logo?.name}</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation()
                              logoInputRef.current?.click()
                            }}
                          >
                            Değiştir
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation()
                              setFormData((prev) => ({ ...prev, logo: null, logoPreview: "" }))
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Kaldır
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-foreground font-medium">Logo yüklemek için tıklayın veya sürükleyin</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG veya WEBP (max. 5MB). Dosya upload öncesi güvenlik taramasından geçer.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">İletişim Bilgileri</h2>
                <p className="text-muted-foreground mt-1">Müşterilerin size ulaşabileceği bilgileri girin</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Telefon numaranız"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="0530 XXX XX XX"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">E-posta</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="E-posta adresiniz"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Web Sitesi (Opsiyonel)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.galeri.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Konum Bilgileri</h2>
                <p className="text-muted-foreground mt-1">Galerinizin adres bilgilerini girin</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">İl</Label>
                    <Input
                      id="city"
                      placeholder="İstanbul"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">İlçe</Label>
                    <Input
                      id="district"
                      placeholder="Kadıköy"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Açık Adres</Label>
                  <Textarea
                    id="address"
                    placeholder="Mahalle, Cadde, Sokak, No..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Enlem (Latitude)</Label>
                    <Input
                      id="latitude"
                      inputMode="decimal"
                      placeholder="41.008240"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Boylam (Longitude)</Label>
                    <Input
                      id="longitude"
                      inputMode="decimal"
                      placeholder="28.978359"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResolveAddressToCoordinates}
                    disabled={isResolvingAddress}
                  >
                    {isResolvingAddress ? "Adres aranıyor..." : "Adresten Koordinat Bul"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleUseCurrentLocation}
                    disabled={isDetectingLocation}
                  >
                    {isDetectingLocation ? "Konum alınıyor..." : "Mevcut Konumumu Kullan"}
                  </Button>
                </div>
                {!hasValidCoordinates && (
                  <p className="text-xs text-destructive">
                    İlerlemek için geçerli enlem ve boylam girin veya adresten otomatik koordinat bulun.
                  </p>
                )}

                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between gap-3 text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5" />
                      <span className="text-sm">Harita önizlemesi (pin sabit)</span>
                    </div>
                    {mapOpenUrl && (
                      <a
                        href={mapOpenUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        Haritada Aç
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="mt-3 h-56 bg-muted-foreground/10 rounded-lg overflow-hidden">
                    {mapEmbedUrl ? (
                      <iframe
                        title="Galeri konum haritası"
                        src={mapEmbedUrl}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center px-4 text-center">
                        <span className="text-sm text-muted-foreground">
                          Haritayı görmek için koordinat bilgisi girin veya adresten otomatik doldurun.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Çalışma Saatleri</h2>
                <p className="text-muted-foreground mt-1">Galerinizin açık olduğu saatleri belirleyin</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Hafta İçi</span>
                    <span className="text-sm text-muted-foreground">Pazartesi - Cuma</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <Input
                      type="time"
                      value={formData.workingHours.weekdays.start}
                      onChange={(e) => updateDayHours("weekdays", "start", e.target.value)}
                      className="h-10"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={formData.workingHours.weekdays.end}
                      onChange={(e) => updateDayHours("weekdays", "end", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  {weekdayInvalid && (
                    <p className="text-xs text-destructive">
                      Hafta içi için başlangıç saati bitiş saatinden önce olmalıdır.
                    </p>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Cumartesi</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <Input
                      type="time"
                      value={formData.workingHours.saturday.start}
                      onChange={(e) => updateDayHours("saturday", "start", e.target.value)}
                      className="h-10"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={formData.workingHours.saturday.end}
                      onChange={(e) => updateDayHours("saturday", "end", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  {saturdayInvalid && (
                    <p className="text-xs text-destructive">
                      Cumartesi için başlangıç saati bitiş saatinden önce olmalıdır.
                    </p>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Pazar</span>
                    <label className="text-sm text-muted-foreground inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!formData.workingHours.sunday.closed}
                        onChange={(e) => updateDayHours("sunday", "closed", !e.target.checked)}
                      />
                      Açık
                    </label>
                  </div>

                  {formData.workingHours.sunday.closed ? (
                    <p className="text-sm text-accent font-medium">Kapalı</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <Input
                          type="time"
                          value={formData.workingHours.sunday.start}
                          onChange={(e) => updateDayHours("sunday", "start", e.target.value)}
                          className="h-10"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={formData.workingHours.sunday.end}
                          onChange={(e) => updateDayHours("sunday", "end", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      {sundayInvalid && (
                        <p className="text-xs text-destructive">
                          Pazar için başlangıç saati bitiş saatinden önce olmalıdır.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="h-11">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext} className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground">
                Devam Et
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading || hasHoursValidationError}
              >
                {isLoading ? "Tamamlanıyor..." : "Kurulumu Tamamla"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
