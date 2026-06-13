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
  ArrowUpRight,
  Building2,
  Calendar,
  Car,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Facebook,
  Fuel,
  Gauge,
  GitCompare,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Twitter,
  X,
  Youtube,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand/brand-logo'
import { galleryInitialsWithFallback } from '@/lib/gallery-monogram'
import {
  carBrands,
  type VehicleFuelType,
  type VehicleTransmissionType,
} from '@/lib/vehicle-display'
import { StickyContactBar } from '@/components/shared/contact-bar'
import { EmptySearch } from '@/components/shared/empty-state'
import { PublicLanguageSwitcher, usePublicLocale } from '@/components/shared/public-language-switcher'
import { VehicleImageFrame } from '@/components/shared/vehicle-image-frame'
import { FavoriteButton } from '@/components/shared/favorite-button'
import { FavoritesTray } from '@/components/shared/favorites-tray'
import { FavoritesCompareButton } from '@/components/shared/favorites-compare-button'
import { IMAGE_PRESETS } from '@/lib/image-presets'
import {
  formatPublicNumber,
  formatPublicPrice,
  type PublicI18nKey,
  type PublicLocale,
} from '@/lib/public-i18n'
import { cn } from '@/lib/utils'
import type { PublicDealer, PublicVehicle } from '@/lib/public-catalog-types'
import type { PublicShowroomTheme } from '@/lib/public-showroom-theme'
import { GalleryReviews } from '@/components/showroom/gallery-reviews'

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
  | 'share_click'

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

// ---------------------------------------------------------------------------
// Theme system — a cohesive token palette so each preset (premium / classic /
// sport) reads as a bespoke dealership website, and every surface + text color
// adapts (no invisible headings on dark backgrounds, no flat one-size styling).
// ---------------------------------------------------------------------------

type ShowroomPalette = {
  isDark: boolean
  root: string
  header: string
  navIdle: string
  // hero
  hero: string
  heroGlow: string
  heroText: string
  heroEyebrow: string
  heroMuted: string
  heroChip: string
  heroPrimaryBtn: string
  heroGhostBtn: string
  statCard: string
  statLabel: string
  statValue: string
  // body
  sectionEyebrow: string
  sectionTitle: string
  sectionBody: string
  surface: string
  surfaceHover: string
  surfaceMuted: string
  surfaceMutedText: string
  surfaceStrongText: string
  iconBadge: string
  divider: string
  pill: string
  footer: string
  footerMuted: string
}

function getShowroomPalette(dealer: PublicDealer): ShowroomPalette {
  const theme: PublicShowroomTheme = dealer.publicTheme.theme
  const background = dealer.publicTheme.backgroundStyle
  const isDark = theme === 'premium'

  if (isDark) {
    const root =
      background === 'light'
        ? 'bg-[#0a0a0b] text-neutral-100'
        : background === 'graphite'
          ? 'bg-[#0b0d0f] text-neutral-100'
          : 'bg-[#0c0a09] text-neutral-100'

    return {
      isDark: true,
      root,
      header: 'border-white/10 bg-black/40 supports-[backdrop-filter]:bg-black/25 backdrop-blur-xl',
      navIdle: 'text-white/65 hover:bg-white/10 hover:text-white',
      hero: 'text-white',
      heroGlow:
        'bg-[radial-gradient(62%_60%_at_12%_-10%,color-mix(in_oklab,var(--showroom-accent)_42%,transparent),transparent_60%),radial-gradient(50%_50%_at_100%_-10%,rgba(255,255,255,0.08),transparent_55%)]',
      heroText: 'text-white',
      heroEyebrow: 'text-white/60',
      heroMuted: 'text-white/65',
      heroChip: 'border-white/12 bg-white/[0.05] text-white/85',
      heroPrimaryBtn: 'bg-white text-neutral-950 hover:bg-white/90',
      heroGhostBtn: 'border-white/20 bg-white/[0.06] text-white hover:bg-white hover:text-neutral-950',
      statCard: 'border-white/10 bg-white/[0.04]',
      statLabel: 'text-white/55',
      statValue: 'text-white',
      sectionEyebrow: 'text-[var(--showroom-accent)]',
      sectionTitle: 'text-white',
      sectionBody: 'text-white/60',
      surface: 'border-white/10 bg-white/[0.035]',
      surfaceHover: 'hover:border-white/25 hover:bg-white/[0.06]',
      surfaceMuted: 'border-white/10 bg-white/[0.05]',
      surfaceMutedText: 'text-white/70',
      surfaceStrongText: 'text-white',
      iconBadge: 'bg-white/10 text-white',
      divider: 'border-white/10',
      pill: 'border-white/12 bg-white/[0.05] text-white/80',
      footer: 'border-white/10 bg-black/30',
      footerMuted: 'text-white/55',
    }
  }

  // Light presets (classic / sport)
  const root =
    background === 'graphite'
      ? 'bg-[#ecedf0] text-neutral-900'
      : background === 'light'
        ? 'bg-white text-neutral-900'
        : 'bg-[#f6f3ef] text-neutral-900'

  return {
    isDark: false,
    root,
    header: 'border-black/10 bg-white/85 supports-[backdrop-filter]:bg-white/70 backdrop-blur-xl',
    navIdle: 'text-neutral-600 hover:bg-neutral-900 hover:text-white',
    hero: theme === 'sport' ? 'text-white' : 'text-neutral-900',
    heroGlow:
      theme === 'sport'
        ? 'bg-[radial-gradient(60%_60%_at_85%_-10%,color-mix(in_oklab,var(--showroom-accent)_45%,transparent),transparent_58%),linear-gradient(120deg,rgba(255,255,255,0.05),transparent_45%)]'
        : 'bg-[radial-gradient(55%_55%_at_12%_-10%,color-mix(in_oklab,var(--showroom-accent)_14%,transparent),transparent_60%)]',
    heroText: theme === 'sport' ? 'text-white' : 'text-neutral-900',
    heroEyebrow: theme === 'sport' ? 'text-white/65' : 'text-neutral-500',
    heroMuted: theme === 'sport' ? 'text-white/70' : 'text-neutral-600',
    heroChip:
      theme === 'sport'
        ? 'border-white/15 bg-white/[0.06] text-white/85'
        : 'border-black/10 bg-white text-neutral-700',
    heroPrimaryBtn:
      theme === 'sport'
        ? 'bg-white text-neutral-950 hover:bg-white/90'
        : 'bg-neutral-950 text-white hover:bg-neutral-800',
    heroGhostBtn:
      theme === 'sport'
        ? 'border-white/25 bg-white/[0.06] text-white hover:bg-white hover:text-neutral-950'
        : 'border-black/15 bg-white text-neutral-900 hover:bg-neutral-950 hover:text-white',
    statCard:
      theme === 'sport'
        ? 'border-white/12 bg-white/[0.05]'
        : 'border-black/10 bg-white shadow-sm',
    statLabel: theme === 'sport' ? 'text-white/55' : 'text-neutral-500',
    statValue: theme === 'sport' ? 'text-white' : 'text-neutral-950',
    sectionEyebrow: 'text-[var(--showroom-accent)]',
    sectionTitle: 'text-neutral-950',
    sectionBody: 'text-neutral-600',
    surface: 'border-black/10 bg-white shadow-sm',
    surfaceHover: 'hover:border-black/20 hover:shadow-md',
    surfaceMuted: 'border-black/10 bg-neutral-50',
    surfaceMutedText: 'text-neutral-600',
    surfaceStrongText: 'text-neutral-950',
    iconBadge: 'bg-neutral-950 text-white',
    divider: 'border-black/10',
    pill: 'border-black/10 bg-white text-neutral-700 shadow-sm',
    footer: 'border-black/10 bg-white',
    footerMuted: 'text-neutral-600',
  }
}

// The hero is a contained dramatic slab on light presets, and the immersive top
// of the page on the dark premium preset.
function getHeroShell(dealer: PublicDealer) {
  const theme = dealer.publicTheme.theme
  if (theme === 'premium') return 'relative overflow-hidden'
  if (theme === 'sport') {
    return 'relative overflow-hidden bg-neutral-950'
  }
  // classic
  return 'relative overflow-hidden'
}

function getDealerInitials(name: string) {
  // Shared with the social/OG share card so the header mark and the share-card
  // monogram always match (lib/gallery-monogram.ts).
  return galleryInitialsWithFallback(name)
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

function DealerLogoMark({
  dealer,
  size = 'lg',
  palette,
}: {
  dealer: PublicDealer
  size?: 'sm' | 'lg'
  palette: ShowroomPalette
}) {
  const sizeClass = size === 'sm' ? 'size-14 rounded-2xl text-lg' : 'size-20 rounded-[1.75rem] text-2xl md:size-24'
  const frame = palette.isDark
    ? 'border-white/15 bg-white'
    : 'border-black/10 bg-white'

  return (
    <div className={cn('relative shrink-0 overflow-hidden border text-black shadow-xl', frame, sizeClass)}>
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
  palette,
}: {
  icon: IconComponent
  label: string
  value: string
  href?: string
  external?: boolean
  onClick?: () => void
  palette: ShowroomPalette
}) {
  const content = (
    <div className={cn('flex min-h-24 items-start gap-3 rounded-2xl border p-4 transition', palette.surface, href && palette.surfaceHover)}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', palette.iconBadge)}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className={cn('block text-xs font-semibold uppercase tracking-[0.18em]', palette.surfaceMutedText)}>{label}</span>
        <span className={cn('mt-1 block break-words text-sm font-semibold', palette.surfaceStrongText)}>{value}</span>
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

function SectionHeading({
  eyebrow,
  title,
  description,
  palette,
  align = 'start',
}: {
  eyebrow: string
  title: string
  description: string
  palette: ShowroomPalette
  align?: 'start' | 'center'
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      <p className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em]', palette.sectionEyebrow, align === 'center' && 'justify-center')}>
        <span className="inline-block h-px w-6 bg-[var(--showroom-accent)]" />
        {eyebrow}
      </p>
      <h2 className={cn('mt-4 text-3xl font-black tracking-tight md:text-[2.6rem] md:leading-[1.05]', palette.sectionTitle)}>{title}</h2>
      <p className={cn('mt-4 text-base leading-7', palette.sectionBody)}>{description}</p>
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

  const palette = useMemo(() => getShowroomPalette(dealer), [dealer])
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
  const heroEyebrow = dealer.publicTheme.heroTagline || t('showroomSubtitle')
  const showroomNavItems = [
    { href: '#nasil-calisir', label: t('navHowItWorks') },
    { href: '#araclar', label: t('navVehicles') },
    { href: '#galeri-bilgileri', label: t('navGalleryInfo') },
    { href: '#talep', label: t('navRequest') },
    { href: '#iletisim', label: t('navContact') },
  ]
  const heroHighlights = [
    { icon: ShieldCheck, label: t('realStockLabel') },
    { icon: Sparkles, label: t('panelManagedLabel') },
    { icon: Phone, label: t('mobileReadyLabel') },
    { icon: Globe2, label: t('languageReadyLabel') },
  ]
  // QR→vehicle→gallery→panel conversion narrative: reassures the QR visitor the
  // page is real (no fake data) and guides them toward inspect → contact → request.
  const showroomFlowCards = [
    { icon: Car, title: t('showroomFlowVehicleTitle'), description: t('showroomFlowVehicleCopy') },
    { icon: MessageCircle, title: t('showroomFlowContactTitle'), description: t('showroomFlowContactCopy') },
    { icon: Building2, title: t('showroomFlowPanelTitle'), description: t('showroomFlowPanelCopy') },
    { icon: Globe2, title: t('showroomFlowLanguageTitle'), description: t('showroomFlowLanguageCopy') },
  ]
  const showroomTrustCards = [
    {
      icon: GitCompare,
      title: 'Araç karşılaştırma',
      description: 'Müşteri beğendiği araçları favoriye alıp Favorilerim ekranında fiyat, yıl, kilometre, yakıt ve vites bilgisini yan yana görebilir.',
    },
    {
      icon: ShieldCheck,
      title: 'Güven veren vitrin',
      description: 'Yayınlanan stok, galeri iletişim bilgileri, çalışma saatleri ve konum bilgisi tek sayfada düzenli görünür.',
    },
    {
      icon: ClipboardCheck,
      title: 'Hızlı talep akışı',
      description: 'Telefon, WhatsApp ve form aksiyonları doğrudan panele müşteri talebi olarak düşer; satış ekibi takibi kaçırmaz.',
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

  // One-tap WhatsApp share: opens the recipient picker (no number) with a ready
  // localized message + the clean showroom URL (tracking params stripped) so the
  // gallery can forward its vitrin to a customer instantly.
  const handleWhatsAppShare = useCallback(() => {
    if (typeof window === 'undefined') return
    recordShowroomEvent('share_click', 'showroom_whatsapp_share')
    const shareUrl = `${window.location.origin}${window.location.pathname}`
    const message = `${t('shareShowroomText')}\n${dealer.name}\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }, [dealer.name, t, recordShowroomEvent])

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
  const activeSocialLinks = socialLinks.filter((social) => social.href)

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

  const heroStats = [
    { label: t('activeVehicles'), value: formatPublicNumber(vehicleStats.total, locale) },
    { label: t('brandCount'), value: formatPublicNumber(vehicleStats.brandCount, locale) },
    { label: t('featuredVehicles'), value: formatPublicNumber(vehicleStats.featuredCount, locale) },
    { label: t('priceRange'), value: getPriceRangeLabel(vehicleStats.minPrice, vehicleStats.maxPrice, locale, t) },
  ]

  return (
    <div
      className={cn('min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0', palette.root)}
      dir={dir}
      style={showroomStyle}
    >
      <header className={cn('sticky top-0 z-40 border-b', palette.header)}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="#top" className="flex min-w-0 items-center gap-3">
            <DealerLogoMark dealer={dealer} size="sm" palette={palette} />
            <span className="min-w-0">
              <span className={cn('block truncate text-base font-black leading-tight tracking-tight', palette.heroText)}>{dealer.name}</span>
              <span className={cn('mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.16em]', palette.isDark ? 'text-white/50' : 'text-neutral-500')}>
                {t('showroomSubtitle')}
              </span>
            </span>
          </Link>
          <nav className={cn('hidden items-center gap-1 rounded-full border p-1 md:flex', palette.isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-neutral-50')}>
            {showroomNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', palette.navIdle)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <FavoritesCompareButton locale={locale} />
            <PublicLanguageSwitcher
              locale={locale}
              onLocaleChange={setLocale}
              label={t('language')}
              className="h-9 px-2 md:h-10 md:px-3"
            />
            {whatsappHref ? (
              <Button asChild className={cn('hidden md:inline-flex', palette.heroPrimaryBtn)}>
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

      <section id="top" className={cn(getHeroShell(dealer), palette.hero)}>
        <div className={cn('pointer-events-none absolute inset-0', palette.heroGlow)} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.08fr_0.92fr] md:py-20">
          <div className="flex flex-col justify-center gap-7">
            <div>
              <p className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em]', palette.heroEyebrow)}>
                <span className="inline-block h-px w-7 bg-[var(--showroom-accent)]" />
                {heroEyebrow}
              </p>
              <h1 className={cn('mt-5 text-5xl font-black leading-[0.98] tracking-tight md:text-7xl', palette.heroText)}>
                {dealer.name}
              </h1>
              <p className={cn('mt-4 flex items-center gap-2 text-base font-medium', palette.heroMuted)}>
                <MapPin className="size-4 text-[var(--showroom-accent)]" />
                {locationLabel}
              </p>
            </div>

            <p className={cn('max-w-xl text-lg leading-8', palette.heroMuted)}>
              {heroCopy}
            </p>

            <div className="flex flex-wrap gap-3">
              {phoneHref ? (
                <Button asChild size="lg" className={cn('h-12 rounded-2xl px-6', palette.heroPrimaryBtn)}>
                  <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'hero_call')}>
                    <Phone className="mr-2 size-4" />
                    {t('callGallery')}
                  </Link>
                </Button>
              ) : null}
              {whatsappHref ? (
                <Button asChild size="lg" variant="outline" className={cn('h-12 rounded-2xl px-6', palette.heroGhostBtn)}>
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
                <Button asChild size="lg" variant="outline" className={cn('h-12 rounded-2xl px-6', palette.heroGhostBtn)}>
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
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={handleWhatsAppShare}
                className={cn('h-12 rounded-2xl px-6', palette.heroGhostBtn)}
              >
                <Share2 className="mr-2 size-4" />
                {t('shareWhatsapp')}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {heroStats.map((stat) => (
                <div key={stat.label} className={cn('rounded-2xl border p-3.5', palette.statCard)}>
                  <p className={cn('text-[0.7rem] font-semibold uppercase tracking-[0.12em]', palette.statLabel)}>{stat.label}</p>
                  <p className={cn('mt-1.5 text-lg font-black leading-tight', palette.statValue)}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {heroHighlights.map((highlight) => (
                <span key={highlight.label} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', palette.heroChip)}>
                  <highlight.icon className="size-3.5 text-[var(--showroom-accent)]" />
                  {highlight.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <form
              id="talep"
              className="w-full rounded-[2rem] border border-black/10 bg-white p-6 text-neutral-950 shadow-2xl"
              onSubmit={handleShowroomLeadSubmit}
              onFocus={markLeadFormOpen}
              noValidate
            >
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--showroom-accent)' }}>
                <span className="inline-block h-px w-6 bg-[var(--showroom-accent)]" />
                {t('showroomLeadEyebrow')}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">{t('showroomLeadTitle')}</h2>
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

              <div className="mt-5 grid gap-3">
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
                className="mt-5 h-12 w-full rounded-2xl text-white hover:opacity-90"
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
        <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className={cn('overflow-hidden rounded-[2rem] border p-6 md:p-8', palette.surface)}>
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className={cn('text-xs font-black uppercase tracking-[0.24em]', palette.sectionEyebrow)}>
                  Vitrin deneyimi
                </p>
                <h2 className={cn('mt-3 text-3xl font-black tracking-tight md:text-4xl', palette.sectionTitle)}>
                  Müşteri kararını hızlandıran galeri sayfası
                </h2>
                <p className={cn('mt-4 text-sm leading-7 md:text-base', palette.sectionBody)}>
                  Araçları sadece listelemek yerine karşılaştırma, hızlı iletişim ve güven bilgileriyle satın alma kararını kolaylaştıran bir vitrin sunar.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {showroomTrustCards.map((card) => (
                  <div key={card.title} className={cn('rounded-3xl border p-4', palette.surfaceMuted)}>
                    <span className={cn('flex size-10 items-center justify-center rounded-2xl', palette.iconBadge)}>
                      <card.icon className="size-5" />
                    </span>
                    <h3 className={cn('mt-3 text-sm font-black', palette.surfaceStrongText)}>{card.title}</h3>
                    <p className={cn('mt-2 text-xs leading-5', palette.surfaceMutedText)}>{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="nasil-calisir" className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow={t('showroomFlowEyebrow')}
              title={t('showroomFlowTitle')}
              description={t('showroomFlowDescription')}
              palette={palette}
            />
            <div className="flex shrink-0 flex-col gap-3">
              <span className={cn('text-xs font-black uppercase tracking-[0.24em]', palette.surfaceMutedText)}>
                {t('showroomQuickActions')}
              </span>
              <div className="flex flex-wrap gap-2">
                {phoneHref ? (
                  <Button asChild className={cn('rounded-2xl', palette.heroPrimaryBtn)}>
                    <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'flow_call')}>
                      <Phone className="mr-2 size-4" />
                      {t('callGallery')}
                    </Link>
                  </Button>
                ) : null}
                {whatsappHref ? (
                  <Button asChild variant="outline" className={cn('rounded-2xl', palette.heroGhostBtn)}>
                    <Link
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordShowroomEvent('whatsapp_click', 'flow_whatsapp')}
                    >
                      <MessageCircle className="mr-2 size-4" />
                      {t('whatsappWrite')}
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" className={cn('rounded-2xl', palette.heroGhostBtn)}>
                  <Link href="#talep" onClick={markLeadFormOpen}>
                    {t('navRequest')}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showroomFlowCards.map((card) => (
              <div
                key={card.title}
                className={cn('flex h-full flex-col gap-3 rounded-3xl border p-5 transition', palette.surface, palette.surfaceHover)}
              >
                <span className={cn('flex size-11 items-center justify-center rounded-2xl', palette.iconBadge)}>
                  <card.icon className="size-5" />
                </span>
                <h3 className={cn('text-base font-black leading-6', palette.surfaceStrongText)}>{card.title}</h3>
                <p className={cn('text-sm leading-6', palette.surfaceMutedText)}>{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {featuredVehicles.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow={t('showroomLeadEyebrow')}
                title={t('featuredVehicles')}
                description={t('showroomVehiclesDescription')}
                palette={palette}
              />
              <Link href="#araclar" className={cn('inline-flex items-center gap-1.5 text-sm font-bold text-[var(--showroom-accent)] hover:underline')}>
                {t('navVehicles')}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredVehicles.slice(0, 4).map((vehicle, index) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  dealerSlug={dealer.slug}
                  dealerName={dealer.name}
                  dealerWhatsapp={dealer.whatsapp}
                  locale={locale}
                  t={t}
                  palette={palette}
                  imageLoading={index === 0 ? 'eager' : 'lazy'}
                  preloadImage={index === 0}
                  onVehicleClick={(clickedVehicle) => recordShowroomEvent('vehicle_detail_click', clickedVehicle.routeId || clickedVehicle.id)}
                  onVehicleWhatsappClick={(clickedVehicle) => recordShowroomEvent('whatsapp_click', `featured_vehicle_${clickedVehicle.routeId || clickedVehicle.id}`)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section id="araclar" className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow={t('showroomVehiclesEyebrow')}
              title={t('showroomVehiclesTitle')}
              description={t('showroomVehiclesDescription')}
              palette={palette}
            />
            <span className={cn('inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-bold', palette.pill)}>
              {formatPublicNumber(filteredVehicles.length, locale)} {t('vehiclesShowing')}
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className={cn('absolute left-3 top-1/2 size-4 -translate-y-1/2', palette.isDark ? 'text-white/50' : 'text-neutral-500')} />
                <Input
                  placeholder={t('searchVehicle')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={cn('h-12 rounded-2xl pl-10', palette.isDark ? 'border-white/12 bg-white/[0.05] text-white placeholder:text-white/40' : 'border-black/10 bg-white')}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn('size-12 rounded-2xl', palette.isDark ? 'border-white/12 bg-white/[0.05] text-white hover:bg-white/10' : 'border-black/10 bg-white', showFilters && (palette.isDark ? 'bg-white text-neutral-950 hover:bg-white' : 'bg-black text-white hover:bg-black hover:text-white'))}
                aria-label={t('openFilters')}
              >
                <SlidersHorizontal className="size-4" />
              </Button>
              {hasActiveFilters ? (
                <Button variant="ghost" size="icon" onClick={clearFilters} className={cn('size-12 rounded-2xl', palette.isDark && 'text-white hover:bg-white/10')} aria-label={t('clearFilters')}>
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>

            {showFilters ? (
              <div className={cn('grid gap-3 rounded-3xl border p-4 sm:grid-cols-2 lg:grid-cols-4', palette.surface)}>
                <Select value={filters.brand} onValueChange={(value) => setFilters((current) => ({ ...current, brand: value }))}>
                  <SelectTrigger className={cn('rounded-2xl', palette.isDark ? 'border-white/12 bg-white/[0.05] text-white' : 'border-black/10 bg-neutral-50')}>
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
                  <SelectTrigger className={cn('rounded-2xl', palette.isDark ? 'border-white/12 bg-white/[0.05] text-white' : 'border-black/10 bg-neutral-50')}>
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
                  <SelectTrigger className={cn('rounded-2xl', palette.isDark ? 'border-white/12 bg-white/[0.05] text-white' : 'border-black/10 bg-neutral-50')}>
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
                  <SelectTrigger className={cn('rounded-2xl', palette.isDark ? 'border-white/12 bg-white/[0.05] text-white' : 'border-black/10 bg-neutral-50')}>
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
                  palette={palette}
                  imageLoading={featuredVehicles.length === 0 && index === 0 ? 'eager' : 'lazy'}
                  preloadImage={featuredVehicles.length === 0 && index === 0}
                  onVehicleClick={(clickedVehicle) => recordShowroomEvent('vehicle_detail_click', clickedVehicle.routeId || clickedVehicle.id)}
                  onVehicleWhatsappClick={(clickedVehicle) => recordShowroomEvent('whatsapp_click', `vehicle_${clickedVehicle.routeId || clickedVehicle.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className={cn('mt-8 rounded-3xl border p-8', palette.surface)}>
              {vehicles.length === 0 ? (
                <div className="mx-auto max-w-2xl text-center">
                  <span className={cn('mx-auto flex size-14 items-center justify-center rounded-2xl', palette.iconBadge)}>
                    <Car className="size-6" />
                  </span>
                  <h3 className={cn('mt-5 text-2xl font-black tracking-tight', palette.sectionTitle)}>{t('showroomNoVehiclesTitle')}</h3>
                  <p className={cn('mt-3 text-sm leading-6', palette.sectionBody)}>{t('showroomNoVehiclesCopy')}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {phoneHref ? (
                      <Button asChild className={palette.heroPrimaryBtn}>
                        <Link href={phoneHref} onClick={() => recordShowroomEvent('call_click', 'empty_call')}>
                          <Phone className="mr-2 size-4" />
                          {t('callGallery')}
                        </Link>
                      </Button>
                    ) : null}
                    {whatsappHref ? (
                      <Button asChild variant="outline" className={palette.heroGhostBtn}>
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

        <section id="galeri-bilgileri" className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <SectionHeading
            eyebrow={t('galleryProfileEyebrow')}
            title={t('galleryProfileTitle')}
            description={t('galleryProfileDescription')}
            palette={palette}
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={Phone}
              label={t('call')}
              value={dealer.phone || t('phoneMissing')}
              href={phoneHref || undefined}
              onClick={() => recordShowroomEvent('call_click', 'profile_phone')}
              palette={palette}
            />
            <InfoCard icon={Clock} label={t('weekday')} value={dealer.workingHours.weekdays} palette={palette} />
            <InfoCard
              icon={MapPin}
              label={t('navContact')}
              value={locationLabel}
              href={dealer.googleMapsUrl || undefined}
              external
              onClick={() => recordShowroomEvent('location_click', 'profile_location')}
              palette={palette}
            />
            <InfoCard
              icon={Globe2}
              label={t('website')}
              value={websiteHref ? getWebsiteLabel(dealer.websiteUrl) : t('websiteMissing')}
              href={websiteHref || undefined}
              external
              onClick={() => recordShowroomEvent('website_click', 'profile_website')}
              palette={palette}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className={cn('overflow-hidden border p-0', palette.surface)}>
              <div className="relative overflow-hidden border-b border-white/10 bg-neutral-950 p-6 text-white">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_-10%,color-mix(in_oklab,var(--showroom-accent)_45%,transparent),transparent_60%)]" />
                <div className="relative flex items-center gap-4">
                  <DealerLogoMark dealer={dealer} size="sm" palette={palette} />
                  <div>
                    <p className="text-sm font-semibold text-white/60">{t('galleryIdentity')}</p>
                    <h3 className="mt-1 text-2xl font-black">{dealer.name}</h3>
                  </div>
                </div>
              </div>
              <div className={cn('grid gap-4 p-6 text-sm', palette.surfaceMutedText)}>
                <div className="flex gap-3">
                  <Building2 className="mt-0.5 size-5 shrink-0 text-[var(--showroom-accent)]" />
                  <div>
                    <p className={cn('font-bold', palette.surfaceStrongText)}>{t('publicGalleryWebsite')}</p>
                    <p className="mt-1 leading-6">{t('publicGalleryWebsiteCopy')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Car className="mt-0.5 size-5 shrink-0 text-[var(--showroom-accent)]" />
                  <div>
                    <p className={cn('font-bold', palette.surfaceStrongText)}>{t('vehicleInfo')}</p>
                    <p className="mt-1 leading-6">{t('vehicleInfoCopy')}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card id="iletisim" className={cn('border p-6', palette.surface)}>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className={cn('text-lg font-black', palette.surfaceStrongText)}>{t('navContact')}</h3>
                  <div className={cn('mt-4 space-y-3 text-sm', palette.surfaceMutedText)}>
                    <p className="flex items-center gap-2"><Phone className="size-4 text-[var(--showroom-accent)]" />{dealer.phone || t('phoneMissing')}</p>
                    <p className="flex items-center gap-2"><MessageCircle className="size-4 text-[var(--showroom-accent)]" />{dealer.whatsapp ? `+${dealer.whatsapp}` : t('whatsappMissing')}</p>
                    <p className="flex items-center gap-2"><Mail className="size-4 text-[var(--showroom-accent)]" />{dealer.email || t('emailMissing')}</p>
                  </div>
                </div>
                <div>
                  <h3 className={cn('text-lg font-black', palette.surfaceStrongText)}>{t('workingHours')}</h3>
                  <div className={cn('mt-4 space-y-2 text-sm', palette.surfaceMutedText)}>
                    <p className={cn('flex items-center justify-between gap-4 rounded-xl border px-3 py-2', palette.surfaceMuted)}><span>{t('weekday')}</span><strong className={palette.surfaceStrongText}>{dealer.workingHours.weekdays}</strong></p>
                    <p className={cn('flex items-center justify-between gap-4 rounded-xl border px-3 py-2', palette.surfaceMuted)}><span>{t('saturday')}</span><strong className={palette.surfaceStrongText}>{dealer.workingHours.saturday}</strong></p>
                    <p className={cn('flex items-center justify-between gap-4 rounded-xl border px-3 py-2', palette.surfaceMuted)}><span>{t('sunday')}</span><strong className={palette.surfaceStrongText}>{dealer.workingHours.sunday}</strong></p>
                  </div>
                </div>
              </div>

              <div className={cn('mt-6 rounded-2xl border p-4', palette.surfaceMuted)}>
                <p className={cn('flex items-start gap-2 text-sm leading-6', palette.surfaceMutedText)}>
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--showroom-accent)]" />
                  {addressLabel}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dealer.googleMapsUrl ? (
                    <Button asChild variant="outline" className={palette.heroGhostBtn}>
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
                    <Button asChild variant="outline" className={palette.heroGhostBtn}>
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
                  {activeSocialLinks.map((social) => (
                    <Button key={social.label} asChild variant="outline" size="icon" className={palette.heroGhostBtn} aria-label={social.label}>
                      <Link
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordShowroomEvent('social_click', social.label.toLowerCase())}
                      >
                        <social.icon className="size-4" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <GalleryReviews gallerySlug={dealer.slug} />

      <footer className={cn('border-t', palette.footer)}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <DealerLogoMark dealer={dealer} size="sm" palette={palette} />
            <div>
              <p className={cn('text-base font-black tracking-tight', palette.surfaceStrongText)}>{dealer.name}</p>
              <p className={cn('mt-1 max-w-xl text-sm leading-6', palette.footerMuted)}>
                {dealer.address ? dealer.address : addressLabel}
              </p>
            </div>
          </div>
          <div className={cn('flex flex-col gap-2 text-sm md:items-end', palette.footerMuted)}>
            {dealer.phone ? <span>{dealer.phone}</span> : null}
            {dealer.email ? <span>{dealer.email}</span> : null}
            {websiteHref ? <Link href={websiteHref} target="_blank" rel="noopener noreferrer" className={cn('font-semibold hover:underline', palette.surfaceStrongText)}>{getWebsiteLabel(dealer.websiteUrl)}</Link> : null}
          </div>
        </div>
        <div className={cn('border-t', palette.divider)}>
          <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5">
            <BrandLogo subtitle={t('poweredBy')} tone={palette.isDark ? 'dark' : 'light'} />
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

      <FavoritesTray locale={locale} />
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
  palette,
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
  palette: ShowroomPalette
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

  const specChip = palette.isDark ? 'border-white/10 bg-white/[0.05] text-white/75' : 'border-black/5 bg-neutral-50 text-neutral-600'

  return (
    <Card className={cn('group flex flex-col overflow-hidden border p-0 transition duration-300 hover:-translate-y-1', palette.surface, palette.surfaceHover)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900/5">
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
            <Badge className="border-0 bg-[var(--showroom-accent)] text-white shadow-lg hover:bg-[var(--showroom-accent)]">
              <Star className="size-3 fill-current" />
              {t('featured')}
            </Badge>
          ) : null}
          <Badge className="border-white/30 bg-black/70 text-white backdrop-blur hover:bg-black/70">
            {t('live')}
          </Badge>
        </div>
        <FavoriteButton
          locale={locale}
          variant="overlay"
          trackRouteId={vehicle.routeId}
          trackSource="showroom"
          className="absolute right-3 top-3"
          record={{
            id: vehicle.routeId || vehicle.id,
            title: vehicle.title,
            href: `/arac/${vehicle.routeId || vehicle.id}?ref=${dealerSlug}&src=showroom`,
            image: vehicle.images[0] ?? null,
            priceLabel: formatPublicPrice(vehicle.price, locale),
            yearLabel: String(vehicle.year),
            mileageLabel: `${formatPublicNumber(vehicle.mileage, locale)} km`,
            fuelLabel: localizedFuelLabels[locale][vehicle.fuelType],
            transmissionLabel: localizedTransmissionLabels[locale][vehicle.transmission],
            bodyType: vehicle.bodyType,
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h3 className={cn('line-clamp-2 min-h-12 text-base font-black leading-6 transition group-hover:text-[var(--showroom-accent)]', palette.surfaceStrongText)}>
            {vehicle.title}
          </h3>
          <p className={cn('mt-2 text-2xl font-black', palette.surfaceStrongText)}>
            {formatPublicPrice(vehicle.price, locale)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={cn('flex items-center gap-1.5 rounded-xl border px-2 py-2', specChip)}>
            <Calendar className="size-4 text-[var(--showroom-accent)]" />
            <span>{vehicle.year}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-xl border px-2 py-2', specChip)}>
            <Gauge className="size-4 text-[var(--showroom-accent)]" />
            <span>{formatPublicNumber(vehicle.mileage, locale)} km</span>
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-xl border px-2 py-2', specChip)}>
            <Fuel className="size-4 text-[var(--showroom-accent)]" />
            <span>{localizedFuelLabels[locale][vehicle.fuelType]}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-xl border px-2 py-2', specChip)}>
            <Settings2 className="size-4 text-[var(--showroom-accent)]" />
            <span>{localizedTransmissionLabels[locale][vehicle.transmission]}</span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-3 text-sm leading-6', palette.surfaceMuted, palette.surfaceMutedText)}>
          <p><strong className={palette.surfaceStrongText}>{t('color')}:</strong> {colorLabel}</p>
          {description ? <p className="mt-1 line-clamp-2">{description}</p> : <p className="mt-1">{t('descriptionMissing')}</p>}
        </div>

        <div className={cn('mt-auto grid gap-2', vehicleWhatsappHref && 'sm:grid-cols-[1fr_auto]')}>
          <Button asChild className={cn('rounded-2xl', palette.heroPrimaryBtn)}>
            <Link
              href={`/arac/${vehicle.routeId || vehicle.id}?ref=${dealerSlug}&src=showroom`}
              onClick={() => onVehicleClick?.(vehicle)}
            >
              {t('vehicleDetails')}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          {vehicleWhatsappHref ? (
            <Button asChild variant="outline" className={cn('rounded-2xl px-4', palette.heroGhostBtn)}>
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
