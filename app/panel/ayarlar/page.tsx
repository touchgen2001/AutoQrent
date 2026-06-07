'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Upload,
  Save,
  ExternalLink,
  Users,
  CreditCard,
  Palette,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowUpRight,
} from 'lucide-react'
import { getPanelAuthSession } from '@/lib/client/panel-auth'
import {
  DEFAULT_PUBLIC_SHOWROOM_THEME,
  PUBLIC_SHOWROOM_BACKGROUND_VALUES,
  PUBLIC_SHOWROOM_THEME_VALUES,
  type PublicShowroomBackground,
  type PublicShowroomTheme,
  type PublicShowroomThemeSettings,
} from '@/lib/public-showroom-theme'
import {
  SUBSCRIPTION_PLAN_CODES,
  formatPlanPrice,
  subscriptionFeatureLabels,
  subscriptionStatusLabels,
  type BillingInterval,
  type SubscriptionFeature,
  type SubscriptionPlanCode,
  type SubscriptionPlanDefinition,
  type SubscriptionStatus,
} from '@/lib/subscription-plans'

type SettingsTab = 'profile' | 'team' | 'appearance' | 'subscription'

type DealerState = {
  galleryId: string | null
  name: string
  slug: string
  logo?: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  city: string
  district: string
  latitude: string
  longitude: string
  googleMapsUrl?: string
  workingHours: {
    weekdays: string
    saturday: string
    sunday: string
  }
  socialMedia?: {
    instagram?: string
    facebook?: string
    youtube?: string
    twitter?: string
  }
  publicTheme: PublicShowroomThemeSettings
  publicThemeStorageReady: boolean
  vehicleCount: number
  activeVehicleCount: number
}

const INITIAL_DEALER_STATE: DealerState = {
  galleryId: null,
  name: '',
  slug: '',
  logo: undefined,
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  city: '',
  district: '',
  latitude: '',
  longitude: '',
  googleMapsUrl: undefined,
  workingHours: {
    weekdays: '',
    saturday: '',
    sunday: '',
  },
  socialMedia: {},
  publicTheme: DEFAULT_PUBLIC_SHOWROOM_THEME,
  publicThemeStorageReady: false,
  vehicleCount: 0,
  activeVehicleCount: 0,
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const PLACEHOLDER_TOKEN_REGEX = /^(ornek|örnek|example|test|dummy|deneme|xxx+)$/i

type SettingsApiResponse = {
  ok?: boolean
  message?: string
  settings?: {
    galleryId: string
    name: string
    slug: string
    phone: string
    whatsapp: string
    email: string
    logoUrl: string
    address: string
    city: string
    district: string
    latitude: number | null
    longitude: number | null
    googleMapsUrl: string
    workingHours: {
      weekdays: string
      saturday: string
      sunday: string
    }
    websiteUrl: string
    socialMedia: {
      instagram: string
      facebook: string
      youtube: string
      twitter: string
    }
    publicTheme?: PublicShowroomThemeSettings
    publicThemeStorageReady?: boolean
    vehicleCount: number
    activeVehicleCount: number
  }
}

type SubscriptionUsageMetric = {
  used: number
  limit: number | null
  remaining: number | null
}

type PanelSubscriptionState = {
  galleryId: string
  planCode: SubscriptionPlanCode
  planName: string
  status: SubscriptionStatus
  effectiveStatus: SubscriptionStatus
  billingInterval: BillingInterval
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  paymentStatus: string
  provider: string
  isTrialActive: boolean
  isTrialExpired: boolean
  isMutationAllowed: boolean
  requiresPlanSelection: boolean
  usage: {
    vehicles: SubscriptionUsageMetric
    users: SubscriptionUsageMetric
  }
  features: Record<SubscriptionFeature, boolean>
}

type SubscriptionApiResponse = {
  ok?: boolean
  message?: string
  quoteRequired?: boolean
  subscription?: PanelSubscriptionState
  catalog?: {
    plans: Record<SubscriptionPlanCode, SubscriptionPlanDefinition>
  }
  paymentProvider?: {
    connected: boolean
    provider: string | null
    message: string
  }
}

const PUBLIC_THEME_LABELS: Record<PublicShowroomTheme, string> = {
  premium: 'Premium koyu',
  classic: 'Klasik açık',
  sport: 'Sport kontrast',
}

const PUBLIC_BACKGROUND_LABELS: Record<PublicShowroomBackground, string> = {
  warm: 'Sıcak galeri sayfası',
  light: 'Temiz beyaz',
  graphite: 'Grafit koyu',
}

const PUBLIC_ACCENT_PRESETS = ['#2f2d2c', '#0a0a0a', '#3f3f46', '#57534e', '#71717a']

type GalleryLogoUploadResponse = {
  ok?: boolean
  message?: string
  item?: {
    publicUrl: string
  }
}

function normalizeSettingsTab(value: string | null | undefined): SettingsTab {
  if (value === 'team' || value === 'appearance' || value === 'subscription') {
    return value
  }
  return 'profile'
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function isAllowedLogoFile(file: File) {
  if (ALLOWED_LOGO_TYPES.has(file.type)) return true
  return ALLOWED_LOGO_EXTENSIONS.has(getFileExtension(file.name))
}

function parseCoordinate(value: string) {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isLatitudeValid(value: number) {
  return value >= -90 && value <= 90
}

function isLongitudeValid(value: number) {
  return value >= -180 && value <= 180
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

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function formatPanelDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatUsageLimit(metric: SubscriptionUsageMetric) {
  return metric.limit === null ? `${metric.used} / Sınırsız` : `${metric.used} / ${metric.limit}`
}

function usagePercent(metric: SubscriptionUsageMetric) {
  if (metric.limit === null || metric.limit <= 0) return 0
  return Math.min(100, Math.round((metric.used / metric.limit) * 100))
}

function hasPlaceholderToken(value: string) {
  return PLACEHOLDER_TOKEN_REGEX.test(value)
}

function SettingsPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const [dealer, setDealer] = useState<DealerState>(INITIAL_DEALER_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLogoUploading, setIsLogoUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [sessionOwner, setSessionOwner] = useState<{ name: string; email: string } | null>(null)
  const [subscription, setSubscription] = useState<PanelSubscriptionState | null>(null)
  const [subscriptionPlans, setSubscriptionPlans] = useState<Record<SubscriptionPlanCode, SubscriptionPlanDefinition> | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true)
  const [isPlanUpdating, setIsPlanUpdating] = useState<SubscriptionPlanCode | null>(null)
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null)
  const [paymentProviderMessage, setPaymentProviderMessage] = useState<string | null>(null)
  const activeTab = normalizeSettingsTab(searchParams.get('tab'))

  const parsedLatitude = parseCoordinate(dealer.latitude)
  const parsedLongitude = parseCoordinate(dealer.longitude)
  const hasValidCoordinates =
    parsedLatitude !== null
    && parsedLongitude !== null
    && isLatitudeValid(parsedLatitude)
    && isLongitudeValid(parsedLongitude)
  const hasCoordinateInput = Boolean(dealer.latitude.trim() || dealer.longitude.trim())
  const hasInvalidCoordinateInput = hasCoordinateInput && !hasValidCoordinates
  const mapEmbedUrl = hasValidCoordinates
    ? buildOpenStreetMapEmbedUrl(parsedLatitude as number, parsedLongitude as number)
    : null
  const mapsOpenUrl =
    dealer.googleMapsUrl?.trim()
    || (hasValidCoordinates ? buildGoogleMapsUrl(parsedLatitude as number, parsedLongitude as number) : '')

  const publicShowroomUrl = dealer.slug ? `/showroom/${dealer.slug}` : null
  const planList = subscriptionPlans
    ? SUBSCRIPTION_PLAN_CODES.map((planCode) => subscriptionPlans[planCode]).filter(Boolean)
    : []

  const liveVisibility = useMemo(
    () => [
      {
        label: 'Galeri Sayfası Adresi',
        value: publicShowroomUrl ? 'Hazır' : 'Eksik',
        detail: publicShowroomUrl ? publicShowroomUrl : 'Slug tanımlanmadı',
      },
      {
        label: 'Telefon Kanalı',
        value: dealer.phone.trim() ? 'Aktif' : 'Kapalı',
        detail: dealer.phone.trim() || 'Telefon bilgisi yok',
      },
      {
        label: 'WhatsApp Kanalı',
        value: dealer.whatsapp.trim() ? 'Aktif' : 'Kapalı',
        detail: dealer.whatsapp.trim() || 'WhatsApp bilgisi yok',
      },
      {
        label: 'Konum Verisi',
        value: mapsOpenUrl ? 'Aktif' : 'Eksik',
        detail: mapsOpenUrl ? 'Harita linki kaydedildi' : 'Koordinat veya harita linki yok',
      },
    ],
    [dealer.phone, dealer.whatsapp, mapsOpenUrl, publicShowroomUrl],
  )

  const updatePublicTheme = (patch: Partial<PublicShowroomThemeSettings>) => {
    setDealer((current) => ({
      ...current,
      publicTheme: {
        ...current.publicTheme,
        ...patch,
      },
    }))
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const session = await getPanelAuthSession()
      if (!active || !session) return
      setSessionOwner({
        name: session.fullName,
        email: session.email,
      })
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch('/api/panel/settings', { cache: 'no-store' })
        const data = (await response.json()) as SettingsApiResponse

        if (!response.ok || !data.ok || !data.settings) {
          setErrorMessage(data.message ?? 'Ayarlar yüklenemedi.')
          return
        }

        setDealer({
          galleryId: data.settings.galleryId,
          name: data.settings.name,
          slug: data.settings.slug,
          phone: data.settings.phone,
          whatsapp: data.settings.whatsapp,
          email: data.settings.email,
          website: data.settings.websiteUrl,
          logo: data.settings.logoUrl || undefined,
          address: data.settings.address,
          city: data.settings.city,
          district: data.settings.district,
          latitude: data.settings.latitude === null || data.settings.latitude === undefined ? '' : String(data.settings.latitude),
          longitude: data.settings.longitude === null || data.settings.longitude === undefined ? '' : String(data.settings.longitude),
          googleMapsUrl: data.settings.googleMapsUrl || undefined,
          workingHours: {
            weekdays: data.settings.workingHours?.weekdays || '',
            saturday: data.settings.workingHours?.saturday || '',
            sunday: data.settings.workingHours?.sunday || '',
          },
          socialMedia: {
            instagram: data.settings.socialMedia?.instagram || '',
            facebook: data.settings.socialMedia?.facebook || '',
            youtube: data.settings.socialMedia?.youtube || '',
            twitter: data.settings.socialMedia?.twitter || '',
          },
          publicTheme: data.settings.publicTheme || DEFAULT_PUBLIC_SHOWROOM_THEME,
          publicThemeStorageReady: Boolean(data.settings.publicThemeStorageReady),
          vehicleCount: data.settings.vehicleCount || 0,
          activeVehicleCount: data.settings.activeVehicleCount || 0,
        })
      } catch {
        setErrorMessage('Ağ hatası nedeniyle ayarlar yüklenemedi.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchSettings()
  }, [])

  useEffect(() => {
    const fetchSubscription = async () => {
      setIsSubscriptionLoading(true)
      setSubscriptionMessage(null)

      try {
        const response = await fetch('/api/panel/subscription', { cache: 'no-store' })
        const data = (await response.json()) as SubscriptionApiResponse

        if (!response.ok || !data.ok || !data.subscription || !data.catalog?.plans) {
          setSubscriptionMessage(data.message ?? 'Abonelik bilgisi yüklenemedi.')
          return
        }

        setSubscription(data.subscription)
        setSubscriptionPlans(data.catalog.plans)
        setBillingInterval(data.subscription.billingInterval)
        setPaymentProviderMessage(data.paymentProvider?.message ?? null)
      } catch {
        setSubscriptionMessage('Ağ hatası nedeniyle abonelik bilgisi yüklenemedi.')
      } finally {
        setIsSubscriptionLoading(false)
      }
    }

    void fetchSubscription()
  }, [])

  const handlePlanSelect = async (planCode: SubscriptionPlanCode) => {
    if (isPlanUpdating) return

    setIsPlanUpdating(planCode)
    setSubscriptionMessage(null)

    try {
      const response = await fetch('/api/panel/subscription', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          planCode,
          billingInterval,
        }),
      })

      const data = (await response.json()) as SubscriptionApiResponse
      if (!response.ok || !data.ok || !data.subscription || !data.catalog?.plans) {
        setSubscriptionMessage(data.message ?? 'Plan seçimi kaydedilemedi.')
        return
      }

      setSubscription(data.subscription)
      setSubscriptionPlans(data.catalog.plans)
      setPaymentProviderMessage(data.paymentProvider?.message ?? null)
      setSubscriptionMessage(data.message ?? (data.quoteRequired ? 'Teklif talebi için iletişim ekibine yönlendirileceksiniz.' : 'Plan seçimi kaydedildi.'))
    } catch {
      setSubscriptionMessage('Ağ hatası nedeniyle plan seçimi kaydedilemedi.')
    } finally {
      setIsPlanUpdating(null)
    }
  }

  const handleSave = async () => {
    if (!dealer.galleryId || isSaving) return

    const latitudeInput = dealer.latitude.trim()
    const longitudeInput = dealer.longitude.trim()
    const latitude = latitudeInput ? parseCoordinate(latitudeInput) : null
    const longitude = longitudeInput ? parseCoordinate(longitudeInput) : null

    if (latitudeInput && (latitude === null || !isLatitudeValid(latitude))) {
      setErrorMessage('Enlem değeri -90 ile 90 arasında olmalıdır.')
      return
    }

    if (longitudeInput && (longitude === null || !isLongitudeValid(longitude))) {
      setErrorMessage('Boylam değeri -180 ile 180 arasında olmalıdır.')
      return
    }

    if (dealer.phone.trim() && hasPlaceholderToken(dealer.phone)) {
      setErrorMessage('Telefon alanında örnek/sahte değer kullanamazsınız.')
      return
    }

    if (dealer.whatsapp.trim() && hasPlaceholderToken(dealer.whatsapp)) {
      setErrorMessage('WhatsApp alanında örnek/sahte değer kullanamazsınız.')
      return
    }

    if (dealer.website.trim() && hasPlaceholderToken(dealer.website)) {
      setErrorMessage('Web sitesi alanında örnek/test domain kullanamazsınız.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setActionMessage(null)

    try {
      const resolvedGoogleMapsUrl = dealer.googleMapsUrl?.trim()
        || (latitude !== null && longitude !== null ? buildGoogleMapsUrl(latitude, longitude) : '')

      const response = await fetch('/api/panel/settings', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: dealer.name,
          slug: dealer.slug,
          phone: dealer.phone,
          whatsapp: dealer.whatsapp,
          email: dealer.email,
          websiteUrl: dealer.website,
          logoUrl: dealer.logo || '',
          address: dealer.address,
          city: dealer.city,
          district: dealer.district,
          latitude,
          longitude,
          googleMapsUrl: resolvedGoogleMapsUrl,
          workingHours: dealer.workingHours,
          socialMedia: {
            instagram: dealer.socialMedia?.instagram || '',
            facebook: dealer.socialMedia?.facebook || '',
            youtube: dealer.socialMedia?.youtube || '',
            twitter: dealer.socialMedia?.twitter || '',
          },
          ...(dealer.publicThemeStorageReady ? { publicTheme: dealer.publicTheme } : {}),
        }),
      })

      const data = (await response.json()) as SettingsApiResponse
      if (!response.ok || !data.ok || !data.settings) {
        setErrorMessage(data.message ?? 'Ayarlar kaydedilemedi.')
        return
      }

      setDealer((prev) => ({
        ...prev,
        name: data.settings?.name ?? prev.name,
        slug: data.settings?.slug ?? prev.slug,
        phone: data.settings?.phone ?? prev.phone,
        whatsapp: data.settings?.whatsapp ?? prev.whatsapp,
        email: data.settings?.email ?? prev.email,
        website: data.settings?.websiteUrl ?? prev.website,
        logo: data.settings?.logoUrl || prev.logo,
        address: data.settings?.address ?? prev.address,
        city: data.settings?.city ?? prev.city,
        district: data.settings?.district ?? prev.district,
        latitude:
          data.settings?.latitude === null || data.settings?.latitude === undefined
            ? ''
            : String(data.settings.latitude),
        longitude:
          data.settings?.longitude === null || data.settings?.longitude === undefined
            ? ''
            : String(data.settings.longitude),
        googleMapsUrl: data.settings?.googleMapsUrl || prev.googleMapsUrl,
        workingHours: {
          weekdays: data.settings?.workingHours?.weekdays ?? prev.workingHours.weekdays,
          saturday: data.settings?.workingHours?.saturday ?? prev.workingHours.saturday,
          sunday: data.settings?.workingHours?.sunday ?? prev.workingHours.sunday,
        },
        socialMedia: {
          instagram: data.settings?.socialMedia?.instagram ?? prev.socialMedia?.instagram ?? '',
          facebook: data.settings?.socialMedia?.facebook ?? prev.socialMedia?.facebook ?? '',
          youtube: data.settings?.socialMedia?.youtube ?? prev.socialMedia?.youtube ?? '',
          twitter: data.settings?.socialMedia?.twitter ?? prev.socialMedia?.twitter ?? '',
        },
        publicTheme: data.settings?.publicTheme ?? prev.publicTheme,
        publicThemeStorageReady: data.settings?.publicThemeStorageReady ?? prev.publicThemeStorageReady,
        vehicleCount: data.settings?.vehicleCount ?? prev.vehicleCount,
        activeVehicleCount: data.settings?.activeVehicleCount ?? prev.activeVehicleCount,
      }))

      setActionMessage('Ayarlar kaydedildi.')
    } catch {
      setErrorMessage('Ağ hatası nedeniyle ayarlar kaydedilemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTabChange = (value: string) => {
    const nextTab = normalizeSettingsTab(value)

    const nextParams = new URLSearchParams(searchParams.toString())
    if (nextTab === 'profile') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', nextTab)
    }

    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const handleLogoUploadClick = () => {
    if (isLogoUploading) return
    setErrorMessage(null)
    setActionMessage(null)
    logoInputRef.current?.click()
  }

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!isAllowedLogoFile(file)) {
      setErrorMessage('Sadece güvenli PNG, JPG veya WEBP logo yükleyebilirsiniz.')
      return
    }

    if (file.size > MAX_LOGO_BYTES) {
      setErrorMessage('Logo boyutu en fazla 5MB olmalıdır.')
      return
    }

    setErrorMessage(null)
    setActionMessage(null)
    setIsLogoUploading(true)

    try {
      const payload = new FormData()
      payload.append('file', file)

      const response = await fetch('/api/panel/uploads/gallery-logo', {
        method: 'POST',
        body: payload,
      })

      const data = (await response.json()) as GalleryLogoUploadResponse
      if (!response.ok || !data.ok || !data.item?.publicUrl) {
        setErrorMessage(data.message ?? 'Logo yüklenemedi.')
        return
      }

      setDealer((prev) => ({ ...prev, logo: data.item?.publicUrl || prev.logo }))
      setActionMessage('Logo başarıyla yüklendi ve kaydedildi.')
    } catch {
      setErrorMessage('Ağ hatası nedeniyle logo yüklenemedi.')
    } finally {
      setIsLogoUploading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Ayarlar</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Panelde sadece canlı ve veritabanı ile senkron çalışan ayarlar gösterilir.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading || !dealer.galleryId}>
          <Save className='h-4 w-4 mr-2' />
          {isLoading ? 'Yükleniyor...' : isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      {errorMessage && (
        <div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          {errorMessage}
        </div>
      )}

      {actionMessage && (
        <div className='rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700'>
          {actionMessage}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className='space-y-6'>
        <TabsList className='bg-muted/50'>
          <TabsTrigger value='profile' className='gap-2'>
            <Building2 className='h-4 w-4' />
            <span className='hidden sm:inline'>Galeri Profili</span>
          </TabsTrigger>
          <TabsTrigger value='team' className='gap-2'>
            <Users className='h-4 w-4' />
            <span className='hidden sm:inline'>Hesap</span>
          </TabsTrigger>
          <TabsTrigger value='appearance' className='gap-2'>
            <Palette className='h-4 w-4' />
            <span className='hidden sm:inline'>Canlı Görünüm</span>
          </TabsTrigger>
          <TabsTrigger value='subscription' className='gap-2'>
            <CreditCard className='h-4 w-4' />
            <span className='hidden sm:inline'>Abonelik</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='profile' className='space-y-6'>
          <Card className='p-6 border-border/50'>
            <h3 className='font-semibold text-foreground mb-4'>Galeri Bilgileri</h3>
            <div className='grid gap-6 md:grid-cols-[200px_1fr]'>
              <div className='space-y-4'>
                <Label>Logo</Label>
                <div className='w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden'>
                  {dealer.logo ? (
                    <Image
                      src={dealer.logo}
                      alt='Logo'
                      width={128}
                      height={128}
                      className='object-contain'
                    />
                  ) : (
                    <Building2 className='h-10 w-10 text-muted-foreground' />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type='file'
                  accept='image/png,image/jpeg,image/jpg,image/webp'
                  className='hidden'
                  onChange={handleLogoFileChange}
                />
                <Button
                  variant='outline'
                  size='sm'
                  className='w-32'
                  onClick={handleLogoUploadClick}
                  disabled={isLogoUploading || isLoading}
                >
                  <Upload className='h-4 w-4 mr-2' />
                  {isLogoUploading ? 'Yükleniyor...' : 'Yükle'}
                </Button>
                <p className='text-xs text-muted-foreground'>
                  PNG, JPG veya WEBP. Logo yükleme öncesi güvenlik taramasından geçer.
                </p>
              </div>

              <div className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Galeri Adı</Label>
                    <Input id='name' value={dealer.name} onChange={(e) => setDealer({ ...dealer, name: e.target.value })} />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='slug'>Kısa Adres</Label>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm text-muted-foreground'>cebindegaleri.com/showroom/</span>
                      <Input id='slug' value={dealer.slug} onChange={(e) => setDealer({ ...dealer, slug: e.target.value })} className='flex-1' />
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Herkese açık galeri sayfası bağlantısı kayıtta güvenli uzun anahtarla saklanır.
                    </p>
                  </div>
                </div>

                <div className='pt-2'>
                  {publicShowroomUrl ? (
                    <Link
                      href={publicShowroomUrl}
                      target='_blank'
                      className='text-sm text-accent hover:underline inline-flex items-center gap-1'
                    >
                      Herkese açık sayfanızı görüntüleyin
                      <ExternalLink className='h-3.5 w-3.5' />
                    </Link>
                  ) : (
                    <p className='text-sm text-muted-foreground'>Herkese açık sayfa için kısa adres tanımlayın.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className='p-6 border-border/50'>
            <h3 className='font-semibold text-foreground mb-4'>İletişim Bilgileri</h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='phone'>Telefon</Label>
                <div className='relative'>
                  <Phone className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='phone'
                    value={dealer.phone}
                    onChange={(e) => setDealer({ ...dealer, phone: e.target.value })}
                    className='pl-10'
                    placeholder='0530 XXX XX XX'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='whatsapp'>WhatsApp</Label>
                <div className='relative'>
                  <Phone className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='whatsapp'
                    value={dealer.whatsapp}
                    onChange={(e) => setDealer({ ...dealer, whatsapp: e.target.value })}
                    className='pl-10'
                    placeholder='0530 XXX XX XX'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>E-posta</Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input id='email' type='email' value={dealer.email} onChange={(e) => setDealer({ ...dealer, email: e.target.value })} className='pl-10' />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='website'>Web Sitesi</Label>
                <div className='relative'>
                  <Globe className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='website'
                    type='url'
                    value={dealer.website}
                    onChange={(e) => setDealer({ ...dealer, website: e.target.value })}
                    className='pl-10'
                    placeholder='https://www.galeriadiniz.com'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='maps'>Google Maps Linki</Label>
                <div className='relative'>
                  <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='maps'
                    value={dealer.googleMapsUrl || ''}
                    onChange={(e) => setDealer({ ...dealer, googleMapsUrl: e.target.value })}
                    className='pl-10'
                    placeholder='https://www.google.com/maps?q=41.0082,28.9784'
                  />
                </div>
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='address'>Adres</Label>
                <Textarea id='address' value={dealer.address} onChange={(e) => setDealer({ ...dealer, address: e.target.value })} rows={2} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='city'>İl</Label>
                <Input id='city' value={dealer.city} onChange={(e) => setDealer({ ...dealer, city: e.target.value })} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='district'>İlçe</Label>
                <Input id='district' value={dealer.district} onChange={(e) => setDealer({ ...dealer, district: e.target.value })} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='latitude'>Enlem (Latitude)</Label>
                <Input
                  id='latitude'
                  inputMode='decimal'
                  placeholder='41.008240'
                  value={dealer.latitude}
                  onChange={(e) => setDealer({ ...dealer, latitude: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='longitude'>Boylam (Longitude)</Label>
                <Input
                  id='longitude'
                  inputMode='decimal'
                  placeholder='28.978359'
                  value={dealer.longitude}
                  onChange={(e) => setDealer({ ...dealer, longitude: e.target.value })}
                />
              </div>
              {hasInvalidCoordinateInput && (
                <p className='sm:col-span-2 text-xs text-destructive'>
                  Geçerli koordinat girin. Enlem -90..90, boylam -180..180 aralığında olmalıdır.
                </p>
              )}
              <div className='sm:col-span-2 rounded-xl border border-border bg-muted/30 p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-sm text-muted-foreground'>Harita önizlemesi</span>
                  {mapsOpenUrl ? (
                    <Link
                      href={mapsOpenUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='text-xs text-accent hover:underline inline-flex items-center gap-1'
                    >
                      Haritada Aç
                      <ExternalLink className='h-3.5 w-3.5' />
                    </Link>
                  ) : null}
                </div>
                <div className='mt-3 h-56 rounded-lg overflow-hidden bg-muted'>
                  {mapEmbedUrl ? (
                    <iframe
                      title='Galeri konum önizleme haritası'
                      src={mapEmbedUrl}
                      className='h-full w-full border-0'
                      loading='lazy'
                      referrerPolicy='no-referrer-when-downgrade'
                    />
                  ) : (
                    <div className='h-full flex items-center justify-center px-4 text-center text-sm text-muted-foreground'>
                      Koordinat girildiğinde harita önizlemesi burada görünür.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className='p-6 border-border/50'>
            <h3 className='font-semibold text-foreground mb-4 flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              Çalışma Saatleri
            </h3>
            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='weekdays'>Hafta İçi</Label>
                <Input
                  id='weekdays'
                  value={dealer.workingHours.weekdays}
                  onChange={(e) => setDealer({ ...dealer, workingHours: { ...dealer.workingHours, weekdays: e.target.value } })}
                  placeholder='09:00 - 19:00'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='saturday'>Cumartesi</Label>
                <Input
                  id='saturday'
                  value={dealer.workingHours.saturday}
                  onChange={(e) => setDealer({ ...dealer, workingHours: { ...dealer.workingHours, saturday: e.target.value } })}
                  placeholder='09:00 - 18:00'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='sunday'>Pazar</Label>
                <Input
                  id='sunday'
                  value={dealer.workingHours.sunday}
                  onChange={(e) => setDealer({ ...dealer, workingHours: { ...dealer.workingHours, sunday: e.target.value } })}
                  placeholder='Kapalı veya 10:00 - 16:00'
                />
              </div>
            </div>
          </Card>

          <Card className='p-6 border-border/50'>
            <h3 className='font-semibold text-foreground mb-4 flex items-center gap-2'>
              <Globe className='h-4 w-4' />
              Sosyal Medya
            </h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='instagram'>Instagram</Label>
                <div className='relative'>
                  <Instagram className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='instagram'
                    value={dealer.socialMedia?.instagram || ''}
                    onChange={(e) => setDealer({ ...dealer, socialMedia: { ...dealer.socialMedia, instagram: e.target.value } })}
                    className='pl-10'
                    placeholder='kullaniciadi'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='facebook'>Facebook</Label>
                <div className='relative'>
                  <Facebook className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='facebook'
                    value={dealer.socialMedia?.facebook || ''}
                    onChange={(e) => setDealer({ ...dealer, socialMedia: { ...dealer.socialMedia, facebook: e.target.value } })}
                    className='pl-10'
                    placeholder='sayfa-adi'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='youtube'>YouTube</Label>
                <div className='relative'>
                  <Youtube className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='youtube'
                    value={dealer.socialMedia?.youtube || ''}
                    onChange={(e) => setDealer({ ...dealer, socialMedia: { ...dealer.socialMedia, youtube: e.target.value } })}
                    className='pl-10'
                    placeholder='kanal-adi'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='twitter'>Twitter / X</Label>
                <div className='relative'>
                  <Twitter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='twitter'
                    value={dealer.socialMedia?.twitter || ''}
                    onChange={(e) => setDealer({ ...dealer, socialMedia: { ...dealer.socialMedia, twitter: e.target.value } })}
                    className='pl-10'
                    placeholder='kullaniciadi'
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='team' className='space-y-6'>
          <Card className='p-6 border-border/50'>
            <h3 className='font-semibold text-foreground mb-4'>Gerçek Panel Erişimi</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              Bu bölümde sadece doğrulanmış tekil hesap gösterilir. Backend entegrasyonu olmayan sahte kullanıcı listeleri kaldırıldı.
            </p>
            <div className='rounded-lg border border-border bg-muted/30 p-4'>
              <p className='text-sm font-medium text-foreground'>Hesap Sahibi</p>
              <p className='text-sm text-muted-foreground mt-1'>
                {sessionOwner?.name || dealer.name || 'İsim bilgisi yok'}
              </p>
              <p className='text-sm text-muted-foreground'>
                {sessionOwner?.email || dealer.email || 'E-posta bilgisi yok'}
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='appearance' className='space-y-6'>
          <Card className='p-6 border-border/50'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <h3 className='font-semibold text-foreground'>Herkese Açık Sayfa Tema ve Logo</h3>
                <p className='text-sm text-muted-foreground mt-1'>
                  Galerinin herkese açık sayfa görünümü burada gerçek logo, renk ve açıklama verisiyle yönetilir.
                </p>
              </div>
              {publicShowroomUrl ? (
                <Button asChild variant='outline' size='sm'>
                  <Link href={publicShowroomUrl} target='_blank'>
                    Önizle
                    <ExternalLink className='h-3.5 w-3.5 ml-2' />
                  </Link>
                </Button>
              ) : null}
            </div>

            {!dealer.publicThemeStorageReady && (
              <div className='mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800'>
                Herkese açık tema alanları canlı veritabanında hazır değil. Veritabanı güncellemesi uygulanana kadar bu ekran önizleme modunda çalışır.
              </div>
            )}

            <div className='mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
              <div className='space-y-5'>
                <div className='space-y-2'>
                  <Label>Tema</Label>
                  <div className='grid gap-2 sm:grid-cols-3'>
                    {PUBLIC_SHOWROOM_THEME_VALUES.map((theme) => (
                      <button
                        key={theme}
                        type='button'
                        onClick={() => updatePublicTheme({ theme })}
                        className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                          dealer.publicTheme.theme === theme
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-muted/20 text-foreground hover:border-foreground/40'
                        }`}
                      >
                        <span className='font-semibold'>{PUBLIC_THEME_LABELS[theme]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='publicAccentColor'>Vurgu Rengi</Label>
                    <div className='flex items-center gap-2'>
                      <Input
                        id='publicAccentColor'
                        type='color'
                        value={dealer.publicTheme.accentColor}
                        onChange={(event) => updatePublicTheme({ accentColor: event.target.value })}
                        className='h-10 w-14 p-1'
                      />
                      <Input
                        value={dealer.publicTheme.accentColor}
                        onChange={(event) => updatePublicTheme({ accentColor: event.target.value })}
                        maxLength={7}
                      />
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {PUBLIC_ACCENT_PRESETS.map((color) => (
                        <button
                          key={color}
                          type='button'
                          aria-label={`Renk ${color}`}
                          onClick={() => updatePublicTheme({ accentColor: color })}
                          className={`h-7 w-7 rounded-full border ${
                            dealer.publicTheme.accentColor === color ? 'border-foreground ring-2 ring-foreground/20' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label>Arka Plan</Label>
                    <div className='grid gap-2'>
                      {PUBLIC_SHOWROOM_BACKGROUND_VALUES.map((backgroundStyle) => (
                        <button
                          key={backgroundStyle}
                          type='button'
                          onClick={() => updatePublicTheme({ backgroundStyle })}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                            dealer.publicTheme.backgroundStyle === backgroundStyle
                              ? 'border-foreground bg-muted text-foreground'
                              : 'border-border bg-background text-muted-foreground hover:border-foreground/40'
                          }`}
                        >
                          {PUBLIC_BACKGROUND_LABELS[backgroundStyle]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='publicHeroTagline'>Sayfa Sloganı</Label>
                  <Input
                    id='publicHeroTagline'
                    value={dealer.publicTheme.heroTagline}
                    onChange={(event) => updatePublicTheme({ heroTagline: event.target.value.slice(0, 80) })}
                    maxLength={80}
                    placeholder='Örn. İstanbul’un güvenilir araç adresi'
                  />
                  <p className='text-xs text-muted-foreground'>
                    {dealer.publicTheme.heroTagline.length}/80 karakter. Sayfanın en üstünde galeri adının hemen üzerinde görünür. Örnek: “Güvenilir ikinci el, şeffaf fiyat” veya “2008’den beri İstanbul’da aile galerisi”. Sahte başarı oranı veya doğrulanmamış metrik yazmayın.
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='publicHeroNote'>Herkese Açık Sayfa Üst Açıklaması</Label>
                  <Textarea
                    id='publicHeroNote'
                    value={dealer.publicTheme.heroNote}
                    onChange={(event) => updatePublicTheme({ heroNote: event.target.value.slice(0, 220) })}
                    rows={3}
                    maxLength={220}
                    placeholder='Galerinizin gerçek uzmanlık alanını ve müşteriye verdiği hizmeti kısa yazın.'
                  />
                  <p className='text-xs text-muted-foreground'>
                    {dealer.publicTheme.heroNote.length}/220 karakter. Sahte başarı oranı veya doğrulanmamış metrik yazmayın.
                  </p>
                </div>

                <div className='rounded-xl border border-border bg-muted/30 p-4'>
                  <p className='text-xs font-semibold text-foreground'>Slogan ve açıklama için kısa rehber</p>
                  <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    <div>
                      <p className='flex items-center gap-1.5 text-xs font-medium text-emerald-600'>
                        <CheckCircle2 className='h-3.5 w-3.5' />
                        Şöyle yazın
                      </p>
                      <ul className='mt-2 space-y-1 text-xs text-muted-foreground'>
                        <li>“Şeffaf ekspertiz, net fiyat”</li>
                        <li>“2008’den beri İstanbul’da aile galerisi”</li>
                        <li>“Takas ve kredi desteğiyle ikinci el”</li>
                      </ul>
                    </div>
                    <div>
                      <p className='flex items-center gap-1.5 text-xs font-medium text-red-600'>
                        <XCircle className='h-3.5 w-3.5' />
                        Şunu yazmayın
                      </p>
                      <ul className='mt-2 space-y-1 text-xs text-muted-foreground'>
                        <li>“Türkiye’nin 1 numaralı galerisi”</li>
                        <li>“%100 müşteri memnuniyeti”</li>
                        <li>“Binlerce mutlu müşteri”</li>
                      </ul>
                    </div>
                  </div>
                  <p className='mt-3 text-[11px] leading-relaxed text-muted-foreground'>
                    Doğrulanamayan iddialar ve sahte metrikler müşteride güven kaybı yaratır; gerçek uzmanlık alanınızı yazın.
                  </p>
                </div>
              </div>

              <div className='rounded-2xl border border-border bg-muted/20 p-4'>
                <p className='text-sm font-semibold text-foreground mb-3'>Canlı Önizleme</p>
                <div
                  className='overflow-hidden rounded-2xl border border-border bg-background shadow-sm'
                  style={{ '--preview-accent': dealer.publicTheme.accentColor } as CSSProperties}
                >
                  <div className={`p-5 ${
                    dealer.publicTheme.theme === 'classic'
                      ? 'bg-white text-black'
                      : dealer.publicTheme.theme === 'sport'
                        ? 'bg-black text-white'
                        : 'bg-neutral-950 text-white'
                  }`}>
                    <div className='flex items-center gap-3'>
                      <div className='relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white text-black'>
                        {dealer.logo ? (
                          <Image src={dealer.logo} alt='Herkese açık logo önizleme' fill sizes='64px' className='object-contain p-2' />
                        ) : (
                          <Building2 className='h-7 w-7' />
                        )}
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase tracking-[0.16em]' style={{ color: 'var(--preview-accent)' }}>
                          {dealer.publicTheme.heroTagline || 'Herkese açık galeri sayfası'}
                        </p>
                        <p className='text-lg font-black'>{dealer.name || 'Galeri adı'}</p>
                      </div>
                    </div>
                    <p className='mt-4 text-sm leading-6 opacity-80'>
                      {dealer.publicTheme.heroNote || 'Hero açıklaması boşsa varsayılan gerçek veri metni gösterilir.'}
                    </p>
                    <div className='mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white' style={{ backgroundColor: 'var(--preview-accent)' }}>
                      {dealer.whatsapp ? 'WhatsApp ile Yaz' : 'Araçları İncele'}
                    </div>
                  </div>
                  <div className='grid grid-cols-3 gap-2 p-3 text-xs'>
                    <div className='rounded-xl bg-muted p-2'>
                      <p className='font-semibold text-foreground'>{dealer.activeVehicleCount}</p>
                      <p className='text-muted-foreground'>Yayındaki araç</p>
                    </div>
                    <div className='rounded-xl bg-muted p-2'>
                      <p className='font-semibold text-foreground'>{dealer.city || '-'}</p>
                      <p className='text-muted-foreground'>İl</p>
                    </div>
                    <div className='rounded-xl bg-muted p-2'>
                      <p className='font-semibold text-foreground'>{dealer.phone ? 'Aktif' : 'Eksik'}</p>
                      <p className='text-muted-foreground'>Telefon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className='p-6 border-border/50'>
            <h3 className='font-semibold text-foreground mb-4'>Canlı Yayın Durumu</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              Bu sekme sadece veritabanındaki gerçek bilgilerden oluşturulan durumları gösterir.
            </p>
            <div className='grid gap-3 sm:grid-cols-2'>
              {liveVisibility.map((item) => (
                <div key={item.label} className='rounded-lg border border-border/70 bg-muted/20 p-3'>
                  <p className='text-xs text-muted-foreground'>{item.label}</p>
                  <p className='text-sm font-semibold text-foreground mt-1'>{item.value}</p>
                  <p className='text-xs text-muted-foreground mt-1 break-all'>{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='subscription' className='space-y-6'>
          <Card className='border-border/50 p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>Self-service abonelik</p>
                <h3 className='mt-2 text-xl font-bold text-foreground'>
                  {subscription ? `${subscription.planName} planı` : 'Abonelik yükleniyor'}
                </h3>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
                  Galeri hesabınız kayıt sonrası 14 günlük deneme ile başlar. Deneme biterse mevcut veriler silinmez,
                  ancak yeni araç ekleme ve yeni QR üretimi plan seçilene kadar kilitlenir.
                </p>
              </div>
              <div className='rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm'>
                <p className='text-xs text-muted-foreground'>Durum</p>
                <p className='mt-1 font-semibold text-foreground'>
                  {subscription ? subscriptionStatusLabels[subscription.effectiveStatus] : '-'}
                </p>
                <p className='mt-3 text-xs text-muted-foreground'>Deneme bitişi</p>
                <p className='mt-1 font-semibold text-foreground'>{formatPanelDate(subscription?.trialEndsAt)}</p>
              </div>
            </div>

            {subscriptionMessage && (
              <div className='mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700'>
                {subscriptionMessage}
              </div>
            )}

            {paymentProviderMessage && (
              <div className='mt-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
                {paymentProviderMessage}
              </div>
            )}

            {isSubscriptionLoading ? (
              <div className='mt-6 rounded-2xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground'>
                Abonelik bilgisi yükleniyor...
              </div>
            ) : subscription ? (
              <div className='mt-6 grid gap-4 md:grid-cols-2'>
                {[
                  { label: 'Araç kullanımı', metric: subscription.usage.vehicles, singleUser: false },
                  { label: 'Hesap modeli', metric: subscription.usage.users, singleUser: true },
                ].map((item) => (
                  <div key={item.label} className='rounded-2xl border border-border/70 bg-background p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <p className='text-sm font-semibold text-foreground'>{item.label}</p>
                      <p className='text-sm text-muted-foreground'>{formatUsageLimit(item.metric)}</p>
                    </div>
                    <div className='mt-3 h-2 overflow-hidden rounded-full bg-muted'>
                      <div
                        className='h-full rounded-full bg-foreground transition-all'
                        style={{ width: `${usagePercent(item.metric)}%` }}
                      />
                    </div>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      {item.singleUser
                        ? 'Tekil kullanıcı modeli aktiftir; paketler ek kullanıcı hakkı içermez.'
                        : item.metric.limit === null
                        ? 'Kurumsal limit özel teklif ile belirlenir.'
                        : `${item.metric.remaining} araç hakkı kaldı.`}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className='border-border/50 p-6'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div>
                <h3 className='font-semibold text-foreground'>Plan Seçimi</h3>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Aylık veya yıllık dönem seçin. Kurumsal pakette fiyat gösterilmez; teklif görüşmesi gerekir.
                </p>
              </div>
              <div className='inline-flex rounded-xl border border-border bg-muted/30 p-1'>
                {(['monthly', 'yearly'] as BillingInterval[]).map((interval) => (
                  <button
                    key={interval}
                    type='button'
                    onClick={() => setBillingInterval(interval)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      billingInterval === interval
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {interval === 'monthly' ? 'Aylık' : 'Yıllık'}
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-6 grid gap-4 xl:grid-cols-4'>
              {planList.map((plan) => {
                const isCurrentPlan = subscription?.planCode === plan.code
                const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                const isUpdatingThisPlan = isPlanUpdating === plan.code

                return (
                  <div
                    key={plan.code}
                    className={`flex flex-col rounded-2xl border p-4 ${
                      isCurrentPlan
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-lg font-bold'>{plan.name}</p>
                        <p className={`mt-2 text-sm leading-6 ${isCurrentPlan ? 'text-background/75' : 'text-muted-foreground'}`}>
                          {plan.summary}
                        </p>
                      </div>
                      {isCurrentPlan && (
                        <span className='rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-foreground'>
                          Mevcut
                        </span>
                      )}
                    </div>

                    <div className='mt-5'>
                      <p className='text-2xl font-black'>{formatPlanPrice(price)}</p>
                      <p className={`mt-1 text-xs ${isCurrentPlan ? 'text-background/65' : 'text-muted-foreground'}`}>
                        {plan.quoteOnly ? 'Özel teklif' : billingInterval === 'yearly' ? 'Yıllık dönem' : 'Aylık dönem'}
                      </p>
                    </div>

                    <div className='mt-5 grid gap-2 text-sm'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className={isCurrentPlan ? 'text-background/75' : 'text-muted-foreground'}>Araç limiti</span>
                        <span className='font-semibold'>{plan.vehicleLimit ?? 'Özel'}</span>
                      </div>
                      <div className='flex items-center justify-between gap-2'>
                        <span className={isCurrentPlan ? 'text-background/75' : 'text-muted-foreground'}>Hesap modeli</span>
                        <span className='font-semibold'>Tekil kullanıcı</span>
                      </div>
                    </div>

                    <div className='mt-5 grid gap-2'>
                      {Object.entries(plan.features).slice(0, 6).map(([feature, enabled]) => (
                        <div key={feature} className='flex items-center gap-2 text-sm'>
                          {enabled ? (
                            <CheckCircle2 className='h-4 w-4 shrink-0' />
                          ) : (
                            <Lock className='h-4 w-4 shrink-0 opacity-60' />
                          )}
                          <span className={enabled ? '' : isCurrentPlan ? 'text-background/55' : 'text-muted-foreground'}>
                            {subscriptionFeatureLabels[feature as SubscriptionFeature]}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className='mt-5 space-y-2'>
                      {plan.highlights.slice(0, 3).map((highlight) => (
                        <p key={highlight} className={`text-xs leading-5 ${isCurrentPlan ? 'text-background/70' : 'text-muted-foreground'}`}>
                          {highlight}
                        </p>
                      ))}
                    </div>

                    <Button
                      type='button'
                      variant={isCurrentPlan ? 'secondary' : 'default'}
                      className='mt-auto w-full'
                      disabled={isPlanUpdating !== null || isCurrentPlan}
                      onClick={() => void handlePlanSelect(plan.code)}
                    >
                      {isUpdatingThisPlan ? 'Kaydediliyor...' : isCurrentPlan ? 'Aktif Plan' : plan.cta}
                      {!isCurrentPlan && <ArrowUpRight className='ml-2 h-4 w-4' />}
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className='p-6 text-sm text-muted-foreground'>Ayarlar yükleniyor...</div>}>
      <SettingsPageContent />
    </Suspense>
  )
}
