'use client'

import { useCallback, useMemo, useState, type ComponentType, type CSSProperties, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Facebook,
  Fuel,
  Gauge,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Twitter,
  X,
  Youtube,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand/brand-logo'
import {
  carBrands,
  type VehicleFuelType,
  type VehicleTransmissionType,
} from '@/lib/vehicle-display'
import { StickyContactBar } from '@/components/shared/contact-bar'
import { EmptySearch } from '@/components/shared/empty-state'
import { PublicLanguageSwitcher, usePublicLocale } from '@/components/shared/public-language-switcher'
import { VehicleImageFrame } from '@/components/shared/vehicle-image-frame'
import { IMAGE_PRESETS } from '@/lib/image-presets'
import {
  formatPublicNumber,
  formatPublicPrice,
  type PublicI18nKey,
  type PublicLocale,
} from '@/lib/public-i18n'
import { cn } from '@/lib/utils'
import type { PublicDealer, PublicVehicle } from '@/lib/public-catalog-types'

type ShowroomPageClientProps = {
  dealer: PublicDealer
  vehicles: PublicVehicle[]
}

type IconComponent = ComponentType<{ className?: string }>

type SocialPlatform = 'instagram' | 'facebook' | 'youtube' | 'twitter'

type ShowroomCtaEventType =
  | 'whatsapp_click'
  | 'call_click'
  | 'location_click'
  | 'website_click'
  | 'social_click'
  | 'vehicle_detail_click'
  | 'lead_form_open'
  | 'lead_form_submit'

type ShowroomLeadFormState = {
  vehicleRouteId: string
  name: string
  phone: string
  email: string
  message: string
  website: string
}

const localizedFuelLabels: Record<PublicLocale, Record<VehicleFuelType, string>> = {
  tr: { benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG', elektrik: 'Elektrik', hibrit: 'Hibrit', bilinmiyor: 'Bilinmiyor' },
  en: { benzin: 'Petrol', dizel: 'Diesel', lpg: 'LPG', elektrik: 'Electric', hibrit: 'Hybrid', bilinmiyor: 'Unknown' },
  de: { benzin: 'Benzin', dizel: 'Diesel', lpg: 'LPG', elektrik: 'Elektro', hibrit: 'Hybrid', bilinmiyor: 'Unbekannt' },
  ru: { benzin: 'Бензин', dizel: 'Дизель', lpg: 'LPG', elektrik: 'Электро', hibrit: 'Гибрид', bilinmiyor: 'Неизвестно' },
  ar: { benzin: 'بنزين', dizel: 'ديزل', lpg: 'غاز LPG', elektrik: 'كهرباء', hibrit: 'هجين', bilinmiyor: 'غير معروف' },
}

const localizedTransmissionLabels: Record<PublicLocale, Record<VehicleTransmissionType, string>> = {
  tr: { manuel: 'Manuel', otomatik: 'Otomatik', 'yari-otomatik': 'Yarı Otomatik', bilinmiyor: 'Bilinmiyor' },
  en: { manuel: 'Manual', otomatik: 'Automatic', 'yari-otomatik': 'Semi-automatic', bilinmiyor: 'Unknown' },
  de: { manuel: 'Manuell', otomatik: 'Automatik', 'yari-otomatik': 'Halbautomatik', bilinmiyor: 'Unbekannt' },
  ru: { manuel: 'Механика', otomatik: 'Автомат', 'yari-otomatik': 'Полуавтомат', bilinmiyor: 'Неизвестно' },
  ar: { manuel: 'يدوي', otomatik: 'أوتوماتيك', 'yari-otomatik': 'نصف أوتوماتيك', bilinmiyor: 'غير معروف' },
}

function getDealerInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || 'CG'
}

function getLocationLabel(dealer: PublicDealer, t: (key: PublicI18nKey) => string) {
  return [dealer.district, dealer.city].filter(Boolean).join(', ') || t('locationMissing')
}

function getAddressLabel(dealer: PublicDealer, t: (key: PublicI18nKey) => string) {
  return [dealer.address, dealer.district, dealer.city].filter(Boolean).join(', ') || t('addressMissing')
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function getWebsiteLabel(value: string) {
  const normalized = normalizeExternalUrl(value)
  if (!normalized) return ''

  try {
    return new URL(normalized).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function normalizeSocialValue(value: string | undefined) {
  return value?.trim().replace(/^@+/, '') || ''
}

function buildSocialHref(platform: SocialPlatform, value: string | undefined) {
  const normalized = normalizeSocialValue(value)
  if (!normalized) return ''
  if (/^https?:\/\//i.test(normalized)) return normalized

  if (platform === 'instagram') return `https://instagram.com/${normalized}`
  if (platform === 'facebook') return `https://facebook.com/${normalized}`
  if (platform === 'youtube') return normalized.startsWith('@') ? `https://youtube.com/${normalized}` : `https://youtube.com/@${normalized}`
  return `https://x.com/${normalized}`
}

function buildWhatsAppHref(dealer: PublicDealer, t: (key: PublicI18nKey) => string) {
  const target = dealer.whatsapp.replace(/[^0-9]/g, '')
  if (!target) return ''
  const message = encodeURIComponent(`${t('showroomWhatsappMessage')} (${dealer.name})`)
  return `https://wa.me/${target}?text=${message}`
}

function getVehicleStats(vehicles: PublicVehicle[]) {
  const prices = vehicles.map((vehicle) => vehicle.price).filter((price) => Number.isFinite(price) && price > 0)
  const brandCount = new Set(vehicles.map((vehicle) => vehicle.brand).filter(Boolean)).size
  const featuredCount = vehicles.filter((vehicle) => vehicle.featured).length

  return {
    total: vehicles.length,
    brandCount,
    featuredCount,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
  }
}

function getPriceRangeLabel(
  minPrice: number | null,
  maxPrice: number | null,
  locale: PublicLocale,
  t: (key: PublicI18nKey) => string,
) {
  if (minPrice === null || maxPrice === null) return t('priceOnCards')
  if (minPrice === maxPrice) return formatPublicPrice(minPrice, locale)
  return `${formatPublicPrice(minPrice, locale)} - ${formatPublicPrice(maxPrice, locale)}`
}

function getShowroomRootClass(dealer: PublicDealer) {
  if (dealer.publicTheme.backgroundStyle === 'graphite') return 'bg-neutral-950 text-neutral-50'
  if (dealer.publicTheme.backgroundStyle === 'light') return 'bg-white text-neutral-950'
  return 'bg-[#f6f3ef] text-neutral-950'
}

function getShowroomHeroClass(dealer: PublicDealer) {
  if (dealer.publicTheme.theme === 'classic') return 'bg-white text-neutral-950'
  if (dealer.publicTheme.theme === 'sport') return 'bg-black text-white'
  return 'bg-neutral-950 text-white'
}

function getShowroomHeroOverlayClass(dealer: PublicDealer) {
  if (dealer.publicTheme.theme === 'classic') {
    return 'bg-[radial-gradient(circle_at_18%_20%,rgba(0,0,0,0.08),transparent_28%),linear-gradient(135deg,rgba(0,0,0,0.04),transparent_42%)]'
  }
  return 'bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]'
}

function getShowroomPanelClass(dealer: PublicDealer) {
  if (dealer.publicTheme.theme === 'classic') return 'border-black/10 bg-neutral-50 text-neutral-950'
  return 'border-white/12 bg-white/[0.06] text-white'
}

function DealerLogoMark({ dealer, size = 'lg' }: { dealer: PublicDealer; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'size-14 rounded-2xl text-lg' : 'size-24 rounded-[2rem] text-3xl md:size-28'

  return (
    <div className={cn('relative shrink-0 overflow-hidden border border-white/15 bg-white text-black shadow-2xl', sizeClass)}>
      {dealer.logo ? (
        <Image
          src={dealer.logo}
          alt={dealer.name}
          fill
          sizes={IMAGE_PRESETS.showroomDealerLogo.sizes}
          quality={IMAGE_PRESETS.showroomDealerLogo.quality}
          loading="eager"
          className="object-contain p-3"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white font-black tracking-tight text-black">
          {getDealerInitials(dealer.name)}
        </div>
      )}
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  href,
  external,
  onClick,
}: {
  icon: IconComponent
  label: string
  value: string
  href?: string
  external?: boolean
  onClick?: () => void
}) {
  const content = (
    <div className="flex min-h-24 items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-black/20 hover:shadow-md">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</span>
        <span className="mt-1 block break-words text-sm font-semibold text-neutral-950">{value}</span>
      </span>
    </div>
  )

  if (!href) return content

  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
    >
      {content}
    </Link>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--showroom-accent)]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-neutral-950 md:text-4xl">{title}</h2>
      <p className="mt-3 text-base leading-7 text-neutral-600">{description}</p>
    </div>
  )
}

function FlowCard({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent
  title: string
  description: string
}) {
  return (
    <div className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 text-lg font-black tracking-tight text-neutral-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </div>
  )
}

export function ShowroomPageClient({ dealer, vehicles }: ShowroomPageClientProps) {
  const { locale, setLocale, t, dir } = usePublicLocale()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [leadFormStarted, setLeadFormStarted] = useState(false)
  const [leadForm, setLeadForm] = useState<ShowroomLeadFormState>({
    vehicleRouteId: vehicles[0]?.routeId || '',
    name: '',
    phone: '',
    email: '',
    message: '',
    website: '',
  })
  const [leadStatus, setLeadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isLeadSubmitting, setIsLeadSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    brand: 'all',
    fuelType: 'all',
    transmission: 'all',
    sortBy: 'newest',
  })

  const featuredVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.featured), [vehicles])
  const vehicleStats = useMemo(() => getVehicleStats(vehicles), [vehicles])
  const locationLabel = getLocationLabel(dealer, t)
  const addressLabel = getAddressLabel(dealer, t)
  const phoneHref = dealer.phone ? `tel:${dealer.phone.replace(/\s/g, '')}` : ''
  const whatsappHref = buildWhatsAppHref(dealer, t)
  const websiteHref = dealer.websiteUrl ? normalizeExternalUrl(dealer.websiteUrl) : ''
  const selectedLeadVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.routeId === leadForm.vehicleRouteId) || vehicles[0] || null,
    [leadForm.vehicleRouteId, vehicles],
  )
  const canSubmitLeadForm = Boolean(
    selectedLeadVehicle
    && leadForm.name.trim().length >= 2
    && (leadForm.phone.trim() || leadForm.email.trim()),
  )
  const showroomStyle = {
    '--showroom-accent': dealer.publicTheme.accentColor,
  } as CSSProperties
  const heroCopy = dealer.publicTheme.heroNote || t('showroomHeroCopy')
  const showroomNavItems = [
    { href: '#araclar', label: t('navVehicles') },
    { href: '#talep', label: t('navRequest') },
    { href: '#galeri-bilgileri', label: t('navGalleryInfo') },
    { href: '#iletisim', label: t('navContact') },
  ]
  const showroomHighlights = [
    t('realStockLabel'),
    t('panelManagedLabel'),
    t('mobileReadyLabel'),
    t('languageReadyLabel'),
  ]
  const showroomFlowCards = [
    {
      icon: Car,
      title: t('showroomFlowVehicleTitle'),
      description: t('showroomFlowVehicleCopy'),
    },
    {
      icon: MessageCircle,
      title: t('showroomFlowContactTitle'),
      description: t('showroomFlowContactCopy'),
    },
    {
      icon: CheckCircle2,
      title: t('showroomFlowPanelTitle'),
      description: t('showroomFlowPanelCopy'),
    },
    {
      icon: Globe2,
      title: t('showroomFlowLanguageTitle'),
      description: t('showroomFlowLanguageCopy'),
    },
  ]

  const recordShowroomEvent = useCallback((eventType: ShowroomCtaEventType, target?: string) => {
    if (!dealer.slug) return

    void fetch('/api/public/showroom-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dealerSlug: dealer.slug,
        eventType,
        target,
      }),
      keepalive: true,
    }).catch(() => {
      // Public CTA tracking must never block customer navigation.
    })
  }, [dealer.slug])

  const markLeadFormOpen = useCallback(() => {
    if (leadFormStarted) return
    setLeadFormStarted(true)
    recordShowroomEvent('lead_form_open', 'showroom_lead_form')
  }, [leadFormStarted, recordShowroomEvent])

  const handleShowroomLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    markLeadFormOpen()
    setLeadStatus(null)

    if (!selectedLeadVehicle || !canSubmitLeadForm) {
      setLeadStatus({ type: 'error', message: t('showroomLeadValidation') })
      return
    }

    setIsLeadSubmitting(true)

    try {
      const response = await fetch('/api/vehicle-lead', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: leadForm.name,
          phone: leadForm.phone,
          email: leadForm.email,
          message: leadForm.message,
          website: leadForm.website,
          vehicleId: selectedLeadVehicle.routeId,
          vehicleTitle: selectedLeadVehicle.title,
          galleryWhatsapp: dealer.whatsapp,
          source: 'showroom',
          referrerSlug: dealer.slug,
        }),
      })
      const data = (await response.json()) as { ok?: boolean; message?: string }

      if (!response.ok || !data.ok) {
        setLeadStatus({ type: 'error', message: data.message || t('showroomLeadError') })
        return
      }

      recordShowroomEvent('lead_form_submit', selectedLeadVehicle.routeId)
      setLeadStatus({ type: 'success', message: t('showroomLeadSuccess') })
      setLeadForm((current) => ({
        ...current,
        name: '',
        phone: '',
        email: '',
        message: '',
        website: '',
      }))
    } catch {
      setLeadStatus({ type: 'error', message: t('networkError') })
    } finally {
      setIsLeadSubmitting(false)
    }
  }

  const socialLinks = [
    { label: 'Instagram', href: buildSocialHref('instagram', dealer.socialMedia?.instagram), icon: Instagram },
    { label: 'Facebook', href: buildSocialHref('facebook', dealer.socialMedia?.facebook), icon: Facebook },
    { label: 'YouTube', href: buildSocialHref('youtube', dealer.socialMedia?.youtube), icon: Youtube },
    { label: 'X', href: buildSocialHref('twitter', dealer.socialMedia?.twitter), icon: Twitter },
  ]

  const filteredVehicles = useMemo(() => {
    const result = vehicles.filter((vehicle) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          vehicle.title.toLowerCase().includes(query)
          || vehicle.brand.toLowerCase().includes(query)
          || vehicle.model.toLowerCase().includes(query)
          || vehicle.variant.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      if (filters.brand !== 'all' && vehicle.brand !== filters.brand) return false
      if (filters.fuelType !== 'all' && vehicle.fuelType !== filters.fuelType) return false
      if (filters.transmission !== 'all' && vehicle.transmission !== filters.transmission) return false

      return true
    })

    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'views':
        result.sort((a, b) => b.views - a.views)
        break
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [vehicles, searchQuery, filters])

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({
      brand: 'all',
      fuelType: 'all',
      transmission: 'all',
      sortBy: 'newest',
    })
  }

  const hasActiveFilters = Boolean(
    searchQuery
    || filters.brand !== 'all'
    || filters.fuelType !== 'all'
    || filters.transmission !== 'all',
  )

  return (
    <div
      className={cn('min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0', getShowroomRootClass(dealer))}
      dir={dir}
      style={showroomStyle}
    >
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <BrandLogo subtitle={t('showroomSubtitle')} className="shrink-0" />
          <nav className="hidden items-center gap-1 rounded-full border border-black/10 bg-neutral-50 p-1 md:flex">
            {showroomNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-black hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <PublicLanguageSwitcher
              locale={locale}
              onLocaleChange={setLocale}
              label={t('language')}
              className="h-9 px-2 md:h-10 md:px-3"
            />
            {phoneHref ? (
              <Button asChild className="hidden bg-black text-white hover:bg-neutral-800 md:inline-flex">
                <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'header_call')}>
                  <Phone className="mr-2 size-4" />
                  {t('call')}
                </Link>
              </Button>
            ) : null}
            {whatsappHref ? (
              <Button asChild variant="outline" className="hidden border-black/15 bg-white md:inline-flex">
                <Link
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordShowroomEvent('whatsapp_click', 'header_whatsapp')}
                >
                  <MessageCircle className="mr-2 size-4" />
                  {t('whatsapp')}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <section className={cn('relative overflow-hidden', getShowroomHeroClass(dealer))}>
        <div className={cn('absolute inset-0', getShowroomHeroOverlayClass(dealer))} />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div className="flex flex-col justify-between gap-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <DealerLogoMark dealer={dealer} />
              <div className="min-w-0">
                <Badge className="border-white/20 bg-white/10 text-current hover:bg-white/10">
                  <ShieldCheck className="size-3" />
                  {t('publicShowroomBadge')}
                </Badge>
                <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">{dealer.name}</h1>
                <p className="mt-3 flex items-center gap-2 text-base text-white/72">
                  <MapPin className="size-4" />
                  {locationLabel}
                </p>
              </div>
            </div>

            <p className="max-w-2xl text-lg leading-8 opacity-75">
              {heroCopy}
            </p>

            <div className="flex flex-wrap gap-3">
              {phoneHref ? (
                <Button asChild size="lg" className="bg-white text-black hover:bg-white/90">
                  <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'hero_call')}>
                    <Phone className="mr-2 size-4" />
                    {t('callGallery')}
                  </Link>
                </Button>
              ) : null}
              {whatsappHref ? (
                <Button asChild size="lg" className="text-white hover:opacity-90" style={{ backgroundColor: 'var(--showroom-accent)' }}>
                  <Link
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordShowroomEvent('whatsapp_click', 'hero_whatsapp')}
                  >
                    <MessageCircle className="mr-2 size-4" />
                    {t('whatsappWrite')}
                  </Link>
                </Button>
              ) : null}
              {dealer.googleMapsUrl ? (
                <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-black">
                  <Link
                    href={dealer.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordShowroomEvent('location_click', 'hero_location')}
                  >
                    <Navigation className="mr-2 size-4" />
                    {t('route')}
                  </Link>
                </Button>
              ) : null}
              {vehicles.length > 0 ? (
                <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-black">
                  <Link href="#talep" onClick={markLeadFormOpen}>
                    <ArrowRight className="mr-2 size-4" />
                    {t('leaveRequest')}
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {showroomHighlights.map((highlight) => (
                <div key={highlight} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80">
                  <CheckCircle2 className="size-4 text-[var(--showroom-accent)]" />
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          <div className={cn('rounded-[2rem] border p-5 shadow-2xl backdrop-blur', getShowroomPanelClass(dealer))}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 text-black">
                <p className="text-sm font-semibold text-neutral-500">{t('activeVehicles')}</p>
                <p className="mt-3 text-4xl font-black">{formatPublicNumber(vehicleStats.total, locale)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm font-semibold text-white/60">{t('brandCount')}</p>
                <p className="mt-3 text-4xl font-black">{formatPublicNumber(vehicleStats.brandCount, locale)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm font-semibold text-white/60">{t('featuredVehicles')}</p>
                <p className="mt-3 text-4xl font-black">{formatPublicNumber(vehicleStats.featuredCount, locale)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm font-semibold text-white/60">{t('priceRange')}</p>
                <p className="mt-3 text-lg font-black leading-tight">{getPriceRangeLabel(vehicleStats.minPrice, vehicleStats.maxPrice, locale, t)}</p>
              </div>
            </div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 text-white" />
                <p className="text-sm leading-6 text-white/72">
                  {t('activeStockCopy')}
                </p>
              </div>
            </div>

            <form
              id="talep"
              className="mt-4 rounded-3xl border border-white/10 bg-white p-5 text-neutral-950 shadow-xl"
              onSubmit={handleShowroomLeadSubmit}
              onFocus={markLeadFormOpen}
              noValidate
            >
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--showroom-accent)' }}>
                {t('showroomLeadEyebrow')}
              </p>
              <h2 className="mt-2 text-xl font-black">{t('showroomLeadTitle')}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{t('showroomLeadCopy')}</p>

              <input
                type="text"
                name="website"
                value={leadForm.website}
                onChange={(event) => setLeadForm((current) => ({ ...current, website: event.target.value }))}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="mt-4 grid gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600">{t('showroomLeadVehicle')}</label>
                  <Select
                    value={leadForm.vehicleRouteId}
                    onValueChange={(value) => setLeadForm((current) => ({ ...current, vehicleRouteId: value }))}
                    disabled={vehicles.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-black/10 bg-neutral-50">
                      <SelectValue placeholder={t('showroomLeadVehiclePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.routeId || vehicle.id} value={vehicle.routeId || vehicle.id}>
                          {vehicle.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  value={leadForm.name}
                  onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t('namePlaceholder')}
                  className="h-11 rounded-2xl border-black/10 bg-neutral-50"
                  autoComplete="name"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={leadForm.phone}
                    onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={t('phonePlaceholder')}
                    className="h-11 rounded-2xl border-black/10 bg-neutral-50"
                    autoComplete="tel"
                  />
                  <Input
                    value={leadForm.email}
                    onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t('emailPlaceholder')}
                    className="h-11 rounded-2xl border-black/10 bg-neutral-50"
                    autoComplete="email"
                  />
                </div>
                <Input
                  value={leadForm.message}
                  onChange={(event) => setLeadForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder={t('messagePlaceholder')}
                  className="h-11 rounded-2xl border-black/10 bg-neutral-50"
                />
              </div>

              {vehicles.length === 0 ? (
                <p className="mt-3 text-sm text-amber-700">{t('showroomLeadNoVehicles')}</p>
              ) : null}
              {leadStatus ? (
                <p className={cn('mt-3 text-sm font-semibold', leadStatus.type === 'success' ? 'text-emerald-700' : 'text-red-700')}>
                  {leadStatus.message}
                </p>
              ) : null}

              <Button
                type="submit"
                className="mt-4 w-full rounded-2xl text-white hover:opacity-90"
                style={{ backgroundColor: 'var(--showroom-accent)' }}
                disabled={isLeadSubmitting || !canSubmitLeadForm}
              >
                {isLeadSubmitting ? t('sending') : t('showroomLeadSubmit')}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <SectionHeading
              eyebrow={t('showroomFlowEyebrow')}
              title={t('showroomFlowTitle')}
              description={t('showroomFlowDescription')}
            />
            <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-neutral-500">{t('showroomQuickActions')}</p>
                  <p className="mt-2 text-xl font-black text-neutral-950">{dealer.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {phoneHref ? (
                    <Button asChild className="bg-black text-white hover:bg-neutral-800">
                      <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'flow_call')}>
                        <Phone className="mr-2 size-4" />
                        {t('call')}
                      </Link>
                    </Button>
                  ) : null}
                  {whatsappHref ? (
                    <Button asChild variant="outline" className="border-black/15 bg-white">
                      <Link
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordShowroomEvent('whatsapp_click', 'flow_whatsapp')}
                      >
                        <MessageCircle className="mr-2 size-4" />
                        {t('whatsapp')}
                      </Link>
                    </Button>
                  ) : null}
                  {vehicles.length > 0 ? (
                    <Button asChild variant="outline" className="border-black/15 bg-white">
                      <Link href="#talep" onClick={markLeadFormOpen}>
                        {t('leaveRequest')}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showroomFlowCards.map((card) => (
              <FlowCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>
        </section>

        <section id="galeri-bilgileri" className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <SectionHeading
            eyebrow={t('galleryProfileEyebrow')}
            title={t('galleryProfileTitle')}
            description={t('galleryProfileDescription')}
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={Phone}
              label={t('call')}
              value={dealer.phone || t('phoneMissing')}
              href={phoneHref || undefined}
              onClick={() => recordShowroomEvent('call_click', 'profile_phone')}
            />
            <InfoCard icon={Clock} label={t('weekday')} value={dealer.workingHours.weekdays} />
            <InfoCard
              icon={MapPin}
              label={t('navContact')}
              value={locationLabel}
              href={dealer.googleMapsUrl || undefined}
              external
              onClick={() => recordShowroomEvent('location_click', 'profile_location')}
            />
            <InfoCard
              icon={Globe2}
              label={t('website')}
              value={websiteHref ? getWebsiteLabel(dealer.websiteUrl) : t('websiteMissing')}
              href={websiteHref || undefined}
              external
              onClick={() => recordShowroomEvent('website_click', 'profile_website')}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="overflow-hidden border-black/10 bg-white p-0 shadow-sm">
              <div className="border-b border-black/10 bg-neutral-950 p-6 text-white">
                <div className="flex items-center gap-4">
                  <DealerLogoMark dealer={dealer} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-white/60">{t('galleryIdentity')}</p>
                    <h3 className="mt-1 text-2xl font-black">{dealer.name}</h3>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-6 text-sm text-neutral-700">
                <div className="flex gap-3">
                  <Building2 className="mt-0.5 size-5 shrink-0 text-neutral-950" />
                  <div>
                    <p className="font-bold text-neutral-950">{t('publicGalleryWebsite')}</p>
                    <p className="mt-1 leading-6">{t('publicGalleryWebsiteCopy')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Car className="mt-0.5 size-5 shrink-0 text-neutral-950" />
                  <div>
                    <p className="font-bold text-neutral-950">{t('vehicleInfo')}</p>
                    <p className="mt-1 leading-6">{t('vehicleInfoCopy')}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card id="iletisim" className="border-black/10 bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-black text-neutral-950">{t('navContact')}</h3>
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    <p className="flex items-center gap-2"><Phone className="size-4 text-neutral-950" />{dealer.phone || t('phoneMissing')}</p>
                    <p className="flex items-center gap-2"><MessageCircle className="size-4 text-neutral-950" />{dealer.whatsapp ? `+${dealer.whatsapp}` : t('whatsappMissing')}</p>
                    <p className="flex items-center gap-2"><Mail className="size-4 text-neutral-950" />{dealer.email || t('emailMissing')}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-950">{t('workingHours')}</h3>
                  <div className="mt-4 space-y-2 text-sm text-neutral-700">
                    <p className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-3 py-2"><span>{t('weekday')}</span><strong>{dealer.workingHours.weekdays}</strong></p>
                    <p className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-3 py-2"><span>{t('saturday')}</span><strong>{dealer.workingHours.saturday}</strong></p>
                    <p className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-3 py-2"><span>{t('sunday')}</span><strong>{dealer.workingHours.sunday}</strong></p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-neutral-700">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-950" />
                  {addressLabel}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dealer.googleMapsUrl ? (
                    <Button asChild variant="outline" className="border-black/15 bg-white">
                      <Link
                        href={dealer.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordShowroomEvent('location_click', 'contact_map')}
                      >
                        {t('openMap')}
                        <ExternalLink className="ml-2 size-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {websiteHref ? (
                    <Button asChild variant="outline" className="border-black/15 bg-white">
                      <Link
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordShowroomEvent('website_click', 'contact_website')}
                      >
                        {t('website')}
                        <ExternalLink className="ml-2 size-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {socialLinks.map((social) => social.href ? (
                    <Button key={social.label} asChild variant="outline" size="icon" className="border-black/15 bg-white" aria-label={social.label}>
                      <Link
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordShowroomEvent('social_click', social.label.toLowerCase())}
                      >
                        <social.icon className="size-4" />
                      </Link>
                    </Button>
                  ) : null)}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {featuredVehicles.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-5 flex items-center gap-2">
              <Star className="size-5 fill-[var(--showroom-accent)] text-[var(--showroom-accent)]" />
              <h2 className="text-2xl font-black tracking-tight text-neutral-950">{t('featuredVehicles')}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredVehicles.slice(0, 4).map((vehicle, index) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  dealerSlug={dealer.slug}
                  dealerName={dealer.name}
                  dealerWhatsapp={dealer.whatsapp}
                  locale={locale}
                  t={t}
                  imageLoading={index === 0 ? 'eager' : 'lazy'}
                  preloadImage={index === 0}
                  onVehicleClick={(clickedVehicle) => recordShowroomEvent('vehicle_detail_click', clickedVehicle.routeId || clickedVehicle.id)}
                  onVehicleWhatsappClick={(clickedVehicle) => recordShowroomEvent('whatsapp_click', `featured_vehicle_${clickedVehicle.routeId || clickedVehicle.id}`)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section id="araclar" className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow={t('showroomVehiclesEyebrow')}
              title={t('showroomVehiclesTitle')}
              description={t('showroomVehiclesDescription')}
            />
            <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-neutral-700 shadow-sm">
              {formatPublicNumber(filteredVehicles.length, locale)} {t('vehiclesShowing')}
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  placeholder={t('searchVehicle')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 rounded-2xl border-black/10 bg-white pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn('size-12 rounded-2xl border-black/10 bg-white', showFilters && 'bg-black text-white hover:bg-black hover:text-white')}
                aria-label={t('openFilters')}
              >
                <SlidersHorizontal className="size-4" />
              </Button>
              {hasActiveFilters ? (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="size-12 rounded-2xl" aria-label={t('clearFilters')}>
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>

            {showFilters ? (
              <div className="grid gap-3 rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <Select value={filters.brand} onValueChange={(value) => setFilters((current) => ({ ...current, brand: value }))}>
                  <SelectTrigger className="rounded-2xl border-black/10 bg-neutral-50">
                    <SelectValue placeholder={t('brand')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allBrands')}</SelectItem>
                    {carBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.fuelType} onValueChange={(value) => setFilters((current) => ({ ...current, fuelType: value }))}>
                  <SelectTrigger className="rounded-2xl border-black/10 bg-neutral-50">
                    <SelectValue placeholder={t('fuel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allFuels')}</SelectItem>
                    <SelectItem value="benzin">Benzin</SelectItem>
                    <SelectItem value="dizel">Dizel</SelectItem>
                    <SelectItem value="lpg">LPG</SelectItem>
                    <SelectItem value="hibrit">Hibrit</SelectItem>
                    <SelectItem value="elektrik">Elektrik</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.transmission} onValueChange={(value) => setFilters((current) => ({ ...current, transmission: value }))}>
                  <SelectTrigger className="rounded-2xl border-black/10 bg-neutral-50">
                    <SelectValue placeholder={t('transmission')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allTransmissions')}</SelectItem>
                    <SelectItem value="otomatik">Otomatik</SelectItem>
                    <SelectItem value="manuel">Manuel</SelectItem>
                    <SelectItem value="yari-otomatik">Yarı Otomatik</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.sortBy} onValueChange={(value) => setFilters((current) => ({ ...current, sortBy: value }))}>
                  <SelectTrigger className="rounded-2xl border-black/10 bg-neutral-50">
                    <SelectValue placeholder={t('sort')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('newest')}</SelectItem>
                    <SelectItem value="price-asc">{t('priceAsc')}</SelectItem>
                    <SelectItem value="price-desc">{t('priceDesc')}</SelectItem>
                    <SelectItem value="views">{t('mostViewed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {filteredVehicles.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVehicles.map((vehicle, index) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  dealerSlug={dealer.slug}
                  dealerName={dealer.name}
                  dealerWhatsapp={dealer.whatsapp}
                  locale={locale}
                  t={t}
                  imageLoading={featuredVehicles.length === 0 && index === 0 ? 'eager' : 'lazy'}
                  preloadImage={featuredVehicles.length === 0 && index === 0}
                  onVehicleClick={(clickedVehicle) => recordShowroomEvent('vehicle_detail_click', clickedVehicle.routeId || clickedVehicle.id)}
                  onVehicleWhatsappClick={(clickedVehicle) => recordShowroomEvent('whatsapp_click', `vehicle_${clickedVehicle.routeId || clickedVehicle.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
              {vehicles.length === 0 ? (
                <div className="mx-auto max-w-2xl text-center">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                    <Car className="size-6" />
                  </span>
                  <h3 className="mt-5 text-2xl font-black tracking-tight text-neutral-950">{t('showroomNoVehiclesTitle')}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{t('showroomNoVehiclesCopy')}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {phoneHref ? (
                      <Button asChild className="bg-black text-white hover:bg-neutral-800">
                        <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'empty_call')}>
                          <Phone className="mr-2 size-4" />
                          {t('callGallery')}
                        </Link>
                      </Button>
                    ) : null}
                    {whatsappHref ? (
                      <Button asChild variant="outline" className="border-black/15 bg-white">
                        <Link
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordShowroomEvent('whatsapp_click', 'empty_whatsapp')}
                        >
                          <MessageCircle className="mr-2 size-4" />
                          {t('whatsappWrite')}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <EmptySearch />
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLogo subtitle={t('poweredBy')} />
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              {dealer.name}{dealer.address ? ` - ${dealer.address}` : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-neutral-600 md:items-end">
            {dealer.phone ? <span>{dealer.phone}</span> : null}
            {dealer.email ? <span>{dealer.email}</span> : null}
            {websiteHref ? <Link href={websiteHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-neutral-950 hover:underline">{getWebsiteLabel(dealer.websiteUrl)}</Link> : null}
          </div>
        </div>
      </footer>

      {dealer.phone || dealer.whatsapp || dealer.googleMapsUrl ? (
        <StickyContactBar
          phone={dealer.phone}
          whatsapp={dealer.whatsapp}
          mapsUrl={dealer.googleMapsUrl || undefined}
          callLabel={t('call')}
          whatsappLabel={t('whatsapp')}
          locationLabel={t('openLocation')}
          whatsappMessage={`${t('showroomWhatsappMessage')} (${dealer.name})`}
          onCallClick={() => recordShowroomEvent('call_click', 'mobile_sticky_call')}
          onWhatsappClick={() => recordShowroomEvent('whatsapp_click', 'mobile_sticky_whatsapp')}
          onMapClick={() => recordShowroomEvent('location_click', 'mobile_sticky_location')}
        />
      ) : null}
    </div>
  )
}

function VehicleCard({
  vehicle,
  dealerSlug,
  dealerName,
  dealerWhatsapp,
  locale,
  t,
  imageLoading = 'lazy',
  preloadImage = false,
  onVehicleClick,
  onVehicleWhatsappClick,
}: {
  vehicle: PublicVehicle
  dealerSlug: string
  dealerName: string
  dealerWhatsapp: string
  locale: PublicLocale
  t: (key: PublicI18nKey) => string
  imageLoading?: 'lazy' | 'eager'
  preloadImage?: boolean
  onVehicleClick?: (vehicle: PublicVehicle) => void
  onVehicleWhatsappClick?: (vehicle: PublicVehicle) => void
}) {
  const description = vehicle.description.trim()
  const colorLabel = vehicle.color && vehicle.color !== '-' ? vehicle.color : t('colorMissing')
  const whatsappDigits = dealerWhatsapp.replace(/[^0-9]/g, '')
  const vehicleWhatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`${t('whatsappVehicleMessage')} ${vehicle.title}. (${dealerName})`)}`
    : ''

  return (
    <Card className="group overflow-hidden border-black/10 bg-white p-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
        <VehicleImageFrame
          src={vehicle.images[0]}
          alt={vehicle.title}
          sizes={IMAGE_PRESETS.vehicleCard.sizes}
          quality={IMAGE_PRESETS.vehicleCard.quality}
          loading={imageLoading}
          preload={preloadImage}
          imageClassName="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {vehicle.featured ? (
            <Badge className="bg-[var(--showroom-accent)] text-white shadow-lg hover:bg-[var(--showroom-accent)]">
              <Star className="size-3 fill-current" />
              {t('featured')}
            </Badge>
          ) : null}
          <Badge className="border-white/30 bg-black/70 text-white backdrop-blur hover:bg-black/70">
            {t('live')}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-neutral-950 transition group-hover:text-[var(--showroom-accent)]">
            {vehicle.title}
          </h3>
          <p className="mt-2 text-2xl font-black text-neutral-950">
            {formatPublicPrice(vehicle.price, locale)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-neutral-600">
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-50 px-2 py-2">
            <Calendar className="size-4 text-neutral-950" />
            <span>{vehicle.year}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-50 px-2 py-2">
            <Gauge className="size-4 text-neutral-950" />
            <span>{formatPublicNumber(vehicle.mileage, locale)} km</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-50 px-2 py-2">
            <Fuel className="size-4 text-neutral-950" />
            <span>{localizedFuelLabels[locale][vehicle.fuelType]}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-50 px-2 py-2">
            <Settings2 className="size-4 text-neutral-950" />
            <span>{localizedTransmissionLabels[locale][vehicle.transmission]}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">
          <p><strong className="text-neutral-950">{t('color')}:</strong> {colorLabel}</p>
          {description ? <p className="mt-1 line-clamp-2">{description}</p> : <p className="mt-1">{t('descriptionMissing')}</p>}
        </div>

        <div className={cn('grid gap-2', vehicleWhatsappHref && 'sm:grid-cols-[1fr_auto]')}>
          <Button asChild className="rounded-2xl bg-black text-white hover:bg-neutral-800">
            <Link
              href={`/arac/${vehicle.routeId || vehicle.id}?ref=${dealerSlug}&src=showroom`}
              onClick={() => onVehicleClick?.(vehicle)}
            >
              {t('vehicleDetails')}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          {vehicleWhatsappHref ? (
            <Button asChild variant="outline" className="rounded-2xl border-black/15 bg-white px-4">
              <Link
                href={vehicleWhatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onVehicleWhatsappClick?.(vehicle)}
              >
                <MessageCircle className="mr-2 size-4" />
                {t('quickWhatsapp')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
