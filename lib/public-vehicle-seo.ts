import type { PublicVehicleDetail } from '@/lib/public-catalog-types'
import { DEMO_PUBLIC_VEHICLE_DETAIL, isDemoVehicleRouteId } from '@/lib/demo-public-experience'
import { vehicleImageUrl } from '@/lib/public-vehicle-jsonld'
import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { getVehicleFavoriteCount } from '@/lib/server/favorite-stats'

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
  photos: string[] | null
}

type GalleryRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  district: string | null
  weekday_hours: string | null
  saturday_hours: string | null
  sunday_hours: string | null
}

type VehicleFeatureRow = {
  feature_key: string
  feature_value: string
}

function normalizePhoneNumber(rawPhone: string | null | undefined) {
  if (!rawPhone) return ''

  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return `9${digits}`
  return `90${digits}`
}

function toTitleCase(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeFeatureKey(key: string) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
}

function parseBooleanFeature(value: string | undefined): boolean | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()

  if (['1', 'true', 'evet', 'var', 'yes', 'mevcut'].includes(normalized)) return true
  if (['0', 'false', 'hayir', 'yok', 'no', 'mevcut_degildir'].includes(normalized)) return false

  return null
}

function parseServiceHistoryFeature(value: string | undefined): boolean | 'partial' | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (['partial', 'kismi', 'kısmi', 'kismi_kayitli', 'kısmi_kayıtlı'].includes(normalized)) return 'partial'
  return parseBooleanFeature(value)
}

function parseIntFeature(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value.replace(/[^0-9-]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function getFeatureValue(map: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = map.get(key)
    if (value) return value
  }
  return undefined
}

function buildAddressText(galleryRow: GalleryRow | null) {
  if (!galleryRow) return 'Adres bilgisi eklenmedi'
  const parts = [
    galleryRow.address?.trim() || '',
    galleryRow.district?.trim() || '',
    galleryRow.city?.trim() || '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Adres bilgisi eklenmedi'
}

function buildWorkingHoursText(galleryRow: GalleryRow | null) {
  if (!galleryRow) return 'Galeri ile iletişime geçin'
  const weekday = galleryRow.weekday_hours?.trim() || ''
  const saturday = galleryRow.saturday_hours?.trim() || ''
  const sunday = galleryRow.sunday_hours?.trim() || ''

  const pieces = [
    weekday ? `Hafta ici ${weekday}` : '',
    saturday ? `Cumartesi ${saturday}` : '',
    sunday ? `Pazar ${sunday}` : '',
  ].filter(Boolean)

  return pieces.length > 0 ? pieces.join(', ') : 'Galeri ile iletişime geçin'
}

function buildStructuredStatus(featureMap: Map<string, string>) {
  const hasDamage = parseBooleanFeature(
    getFeatureValue(featureMap, ['has_damage', 'damage_status', 'hasar', 'hasar_kaydi']),
  )
  const serviceHistory = parseServiceHistoryFeature(
    getFeatureValue(featureMap, ['service_history', 'bakim_kaydi', 'bakimli']),
  )
  const warranty = parseBooleanFeature(
    getFeatureValue(featureMap, ['warranty', 'garanti']),
  )
  const previousOwners = parseIntFeature(
    getFeatureValue(featureMap, ['previous_owners', 'owner_count', 'sahip_sayisi']),
  )

  return {
    hasDamage,
    serviceHistory,
    warranty,
    previousOwners,
  }
}

function normalizeOptionalImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return null
  return vehicleImageUrl(trimmed)
}

const TECHNICAL_FEATURE_KEYS = new Set([
  'body_type',
  'kasa_tipi',
  'engine_size',
  'motor_hacmi',
  'horsepower',
  'motor_gucu',
  'hp',
  'plate_number',
  'plaka',
  'has_damage',
  'damage_status',
  'hasar',
  'hasar_kaydi',
  'damage_details',
  'previous_owners',
  'owner_count',
  'sahip_sayisi',
  'service_history',
  'bakim_kaydi',
  'bakimli',
  'warranty',
  'garanti',
])

function mapToVehicleDetail(
  row: VehicleRow,
  galleryRow: GalleryRow | null,
  featureRows: VehicleFeatureRow[],
  routeId: string,
): PublicVehicleDetail {
  const featureMap = new Map<string, string>()
  for (const feature of featureRows) {
    featureMap.set(normalizeFeatureKey(feature.feature_key), feature.feature_value)
  }

  const bodyType = getFeatureValue(featureMap, ['body_type', 'kasa_tipi']) || '-'
  const engineSize = getFeatureValue(featureMap, ['engine_size', 'motor_hacmi']) || '-'
  const horsePowerRaw = getFeatureValue(featureMap, ['horsepower', 'motor_gucu', 'hp'])
  const horsePower = horsePowerRaw ? `${horsePowerRaw.replace(/\s*hp$/i, '')} HP` : '-'

  const features = featureRows
    .filter((item) => !TECHNICAL_FEATURE_KEYS.has(normalizeFeatureKey(item.feature_key)))
    .map((item) => item.feature_value?.trim())
    .filter((item): item is string => Boolean(item))

  const phone = galleryRow?.phone?.trim() || ''
  const whatsapp = normalizePhoneNumber(galleryRow?.phone)
  const address = buildAddressText(galleryRow)
  const workingHours = buildWorkingHoursText(galleryRow)

  return {
    routeId,
    stockId: routeId,
    brand: row.brand,
    model: row.model,
    variant: row.variant || '',
    year: Number(row.year),
    price: Number(row.price),
    mileage: Number(row.km),
    fuel: toTitleCase(row.fuel || '-'),
    transmission: toTitleCase(row.transmission || '-'),
    color: row.color || '-',
    engineSize,
    horsePower,
    bodyType,
    description: (row.description || '').trim() || `${row.year} ${row.brand} ${row.model} için araç detayı.`,
    features,
    images: row.photos?.filter(Boolean) || [],
    gallery: {
      name: galleryRow?.name || 'Galeri',
      slug: galleryRow?.slug || '',
      logo: normalizeOptionalImageUrl(galleryRow?.logo_url),
      phone,
      whatsapp,
      email: galleryRow?.email?.trim() || '',
      address,
      city: galleryRow?.city?.trim() || '',
      district: galleryRow?.district?.trim() || '',
      workingHours,
    },
    status: buildStructuredStatus(featureMap),
  }
}

async function findVehicleByRouteId(routeId: string) {
  requireSupabaseAdminConfig()

  const normalized = routeId.trim()
  if (!hasSecurePublicRouteToken(normalized)) return null

  const rows = await supabaseAdminFetch<VehicleRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id,slug,brand,model,variant,year,price,km,fuel,transmission,color,description,photos',
      status: 'eq.active',
      slug: `eq.${normalized}`,
      limit: 1,
    },
  })

  return rows[0] || null
}

export async function getPublicVehicleDetail(routeId: string): Promise<PublicVehicleDetail | null> {
  if (isDemoVehicleRouteId(routeId)) return DEMO_PUBLIC_VEHICLE_DETAIL

  const vehicle = await findVehicleByRouteId(routeId)
  if (!vehicle) return null

  const [galleryRows, featureRows, favoriteCount] = await Promise.all([
    supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: 'id,name,slug,logo_url,phone,email,address,city,district,weekday_hours,saturday_hours,sunday_hours',
        id: `eq.${vehicle.gallery_id}`,
        limit: 1,
      },
    }).catch(() => []),
    supabaseAdminFetch<VehicleFeatureRow[]>({
      path: '/rest/v1/vehicle_features',
      query: {
        select: 'feature_key,feature_value',
        vehicle_id: `eq.${vehicle.id}`,
        limit: 200,
      },
    }).catch(() => []),
    getVehicleFavoriteCount(vehicle.id).catch(() => 0),
  ])

  return {
    ...mapToVehicleDetail(vehicle, galleryRows[0] || null, featureRows, vehicle.slug || vehicle.id),
    favoriteCount,
  }
}
