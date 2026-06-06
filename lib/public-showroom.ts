import type { PublicDealer, PublicVehicle, PublicVehicleStatus } from '@/lib/public-catalog-types'
import {
  DEMO_GALLERY_ID,
  DEMO_PUBLIC_DEALER,
  DEMO_PUBLIC_VEHICLE,
  getDemoShowroomHref,
  getDemoVehicleHref,
  isDemoShowroomSlug,
} from '@/lib/demo-public-experience'
import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import { normalizeFuelType, normalizeTransmission } from '@/lib/vehicle-display'
import {
  DEFAULT_PUBLIC_SHOWROOM_THEME,
  normalizePublicShowroomTheme,
} from '@/lib/public-showroom-theme'
import {
  containsPlaceholderText,
  hasPlaceholderEmailDomain,
  hasPlaceholderHostname,
} from '@/lib/server/panel-input-guard'
import { hasSupabaseAdmin, requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type GalleryRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  google_maps_url: string | null
  weekday_hours: string | null
  saturday_hours: string | null
  sunday_hours: string | null
  website_url: string | null
  instagram_handle: string | null
  facebook_page: string | null
  youtube_channel: string | null
  twitter_handle: string | null
  public_theme?: string | null
  public_accent_color?: string | null
  public_background_style?: string | null
  public_hero_tagline?: string | null
  public_showroom_note?: string | null
}

type VehicleRow = {
  id: string
  gallery_id: string
  slug: string
  brand: string
  model: string
  variant: string | null
  year: number
  price: number
  km: number
  fuel: string
  transmission: string
  color: string | null
  description: string | null
  status: string
  views: number
  highlighted: boolean | null
  photos: string[] | null
  created_at: string
  updated_at: string
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase()
}

export function formatDealerNameFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizePhoneDigits(rawPhone: string | null) {
  if (!rawPhone) return ''
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return `9${digits}`
  return `90${digits}`
}

function mapStatus(status: string): PublicVehicleStatus {
  if (status === 'sold') return 'satildi'
  if (status === 'reserved') return 'rezerve'
  if (status === 'active') return 'yayinda'
  return 'taslak'
}

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function sanitizePlainField(value: string | null | undefined) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return ''
  if (containsPlaceholderText(trimmed)) return ''
  return trimmed
}

function sanitizeUrlField(value: string | null | undefined) {
  const trimmed = sanitizePlainField(value)
  if (!trimmed) return ''
  if (hasPlaceholderHostname(trimmed)) return ''
  return trimmed
}

function sanitizeEmailField(value: string | null | undefined) {
  const trimmed = sanitizePlainField(value)
  if (!trimmed) return ''
  if (hasPlaceholderEmailDomain(trimmed)) return ''
  return trimmed
}

const BASE_GALLERY_SELECT = [
  'id',
  'name',
  'slug',
  'phone',
  'email',
  'logo_url',
  'address',
  'city',
  'district',
  'latitude',
  'longitude',
  'google_maps_url',
  'weekday_hours',
  'saturday_hours',
  'sunday_hours',
  'website_url',
  'instagram_handle',
  'facebook_page',
  'youtube_channel',
  'twitter_handle',
].join(',')

const THEME_GALLERY_SELECT = [
  BASE_GALLERY_SELECT,
  'public_theme',
  'public_accent_color',
  'public_background_style',
  'public_hero_tagline',
  'public_showroom_note',
].join(',')

function mapGalleryRow(row: GalleryRow): PublicDealer {
  const phone = sanitizePlainField(row.phone)
  const whatsapp = normalizePhoneDigits(phone)
  const address = sanitizePlainField(row.address)
  const city = sanitizePlainField(row.city)
  const district = sanitizePlainField(row.district)
  const googleMapsUrl = sanitizeUrlField(row.google_maps_url)
  const publicTheme = normalizePublicShowroomTheme({
    theme: row.public_theme || DEFAULT_PUBLIC_SHOWROOM_THEME.theme,
    accentColor: row.public_accent_color || DEFAULT_PUBLIC_SHOWROOM_THEME.accentColor,
    backgroundStyle: row.public_background_style || DEFAULT_PUBLIC_SHOWROOM_THEME.backgroundStyle,
    heroTagline: sanitizePlainField(row.public_hero_tagline),
    heroNote: sanitizePlainField(row.public_showroom_note),
  })

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: sanitizeUrlField(row.logo_url) || null,
    phone,
    whatsapp,
    email: sanitizeEmailField(row.email),
    websiteUrl: sanitizeUrlField(row.website_url),
    address,
    city,
    district,
    googleMapsUrl:
      googleMapsUrl
      || (row.latitude !== null && row.longitude !== null
        ? buildGoogleMapsUrl(row.latitude, row.longitude)
        : null),
    workingHours: {
      weekdays: sanitizePlainField(row.weekday_hours) || 'Galeri ile iletişime geçin',
      saturday: sanitizePlainField(row.saturday_hours) || 'Galeri ile iletişime geçin',
      sunday: sanitizePlainField(row.sunday_hours) || 'Galeri ile iletişime geçin',
    },
    socialMedia: {
      instagram: sanitizePlainField(row.instagram_handle) || undefined,
      facebook: sanitizePlainField(row.facebook_page) || undefined,
      youtube: sanitizePlainField(row.youtube_channel) || undefined,
      twitter: sanitizePlainField(row.twitter_handle) || undefined,
    },
    publicTheme,
  }
}

async function fetchPublicGalleryRows(slug: string) {
  try {
    return await supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: THEME_GALLERY_SELECT,
        slug: `eq.${slug}`,
        limit: 1,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (
      !message.includes('public_theme')
      && !message.includes('public_accent_color')
      && !message.includes('public_background_style')
      && !message.includes('public_hero_tagline')
      && !message.includes('public_showroom_note')
    ) {
      throw error
    }

    return supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: BASE_GALLERY_SELECT,
        slug: `eq.${slug}`,
        limit: 1,
      },
    })
  }
}

function buildVehicleTitle(row: VehicleRow) {
  return `${row.year} ${row.brand} ${row.model}${row.variant ? ` ${row.variant}` : ''}`.trim()
}

function mapVehicleRow(row: VehicleRow): PublicVehicle {
  return {
    id: row.id,
    routeId: row.slug || row.id,
    title: buildVehicleTitle(row),
    brand: row.brand,
    model: row.model,
    variant: row.variant || '',
    year: Number(row.year),
    price: Number(row.price),
    mileage: Number(row.km),
    fuelType: normalizeFuelType(row.fuel),
    transmission: normalizeTransmission(row.transmission),
    bodyType: '-',
    color: row.color || '-',
    engineSize: '-',
    horsePower: '-',
    features: [],
    description: row.description || '',
    images: row.photos?.filter(Boolean) || [],
    status: mapStatus(row.status),
    views: Number(row.views || 0),
    qrScans: 0,
    whatsappClicks: 0,
    phoneClicks: 0,
    featured: Boolean(row.highlighted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPublicDealerBySlug(slug: string): Promise<PublicDealer | null> {
  const normalized = normalizeSlug(slug)
  if (isDemoShowroomSlug(normalized)) return DEMO_PUBLIC_DEALER

  requireSupabaseAdminConfig()

  if (!hasSecurePublicRouteToken(normalized)) return null

  const rows = await fetchPublicGalleryRows(normalized)

  const row = rows[0]
  return row ? mapGalleryRow(row) : null
}

export async function listPublicShowroomVehicles(dealershipId: string): Promise<PublicVehicle[]> {
  if (dealershipId === DEMO_GALLERY_ID) return [DEMO_PUBLIC_VEHICLE]

  requireSupabaseAdminConfig()

  const rows = await supabaseAdminFetch<VehicleRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id,slug,brand,model,variant,year,price,km,fuel,transmission,color,description,status,views,highlighted,photos,created_at,updated_at',
      gallery_id: `eq.${dealershipId}`,
      status: 'eq.active',
      order: 'created_at.desc',
      limit: 300,
    },
  })

  return rows.map(mapVehicleRow)
}

export async function getPublicShowroomData(slug: string): Promise<{ dealer: PublicDealer; vehicles: PublicVehicle[] } | null> {
  const dealer = await getPublicDealerBySlug(slug)
  if (!dealer) return null

  const vehicles = await listPublicShowroomVehicles(dealer.id)

  return {
    dealer,
    vehicles,
  }
}

export type PublicDemoExample = {
  dealerName: string
  showroomHref: string
  vehicleHref: string | null
  vehicleTitle: string | null
  vehicleCount: number
  location: string
}

async function fetchRecentGalleryRows(limit: number) {
  try {
    return await supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: THEME_GALLERY_SELECT,
        order: 'created_at.desc',
        limit,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (
      !message.includes('public_theme')
      && !message.includes('public_accent_color')
      && !message.includes('public_background_style')
      && !message.includes('public_hero_tagline')
      && !message.includes('public_showroom_note')
    ) {
      throw error
    }

    return supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: BASE_GALLERY_SELECT,
        order: 'created_at.desc',
        limit,
      },
    })
  }
}

export async function listPublicDemoExamples(limit = 2): Promise<PublicDemoExample[]> {
  const examples: PublicDemoExample[] = [
    {
      dealerName: DEMO_PUBLIC_DEALER.name,
      showroomHref: getDemoShowroomHref(),
      vehicleHref: getDemoVehicleHref('showroom'),
      vehicleTitle: DEMO_PUBLIC_VEHICLE.title,
      vehicleCount: 1,
      location: [DEMO_PUBLIC_DEALER.district, DEMO_PUBLIC_DEALER.city].filter(Boolean).join(' / '),
    },
  ]

  if (examples.length >= limit) return examples.slice(0, limit)
  if (!hasSupabaseAdmin()) return examples.slice(0, limit)

  requireSupabaseAdminConfig()

  const rows = await fetchRecentGalleryRows(Math.max(limit * 4, 8)).catch(() => [])

  for (const row of rows) {
    if (examples.length >= limit) break
    if (!hasSecurePublicRouteToken(row.slug)) continue
    if (isDemoShowroomSlug(row.slug)) continue

    const dealer = mapGalleryRow(row)
    const vehicles = await listPublicShowroomVehicles(dealer.id)
    const firstVehicle = vehicles[0] || null
    const location = [dealer.district, dealer.city].filter(Boolean).join(' / ')

    examples.push({
      dealerName: dealer.name,
      showroomHref: `/showroom/${dealer.slug}`,
      vehicleHref: firstVehicle ? `/arac/${firstVehicle.routeId}?src=showroom&ref=${dealer.slug}` : null,
      vehicleTitle: firstVehicle?.title || null,
      vehicleCount: vehicles.length,
      location: location || 'Konum bilgisi girilmemiş',
    })
  }

  return examples
}
