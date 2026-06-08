import type {
  PanelLead,
  PanelLeadSource,
  PanelLeadStatus,
  PanelVehicle,
  PanelVehicleStatus,
  VehicleCreateInput,
} from '@/lib/panel-types'
import { absoluteUrl } from '@/lib/seo'
import { buildSecurePublicSlug, hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { deleteVehicleImageObjectsForGallery } from '@/lib/server/storage-images'
import {
  markUploadedAssetsAttached,
  markUploadedAssetsDeleted,
} from '@/lib/server/uploaded-assets'

type VehicleRow = {
  id: string
  slug: string
  brand: string
  model: string
  variant: string | null
  year: number
  price: number
  km: number
  description: string | null
  fuel: string
  transmission: string
  color: string | null
  status: string
  photos: string[] | null
  created_at: string
  price_dropped_at: string | null
}

type LeadRow = {
  id: string
  vehicle_id: string | null
  customer_name: string
  customer_phone: string
  customer_email: string | null
  source: string
  status: string
  notes: string[] | null
  follow_up_at: string | null
  created_at: string
  updated_at: string
}

type QrScanRow = {
  vehicle_id: string | null
  scanned_at: string
  source?: string | null
}

export type PanelQrVehicleSummary = {
  vehicleId: string
  routeId: string
  publicUrl: string
  vehicleTitle: string
  brand: string
  model: string
  variant: string
  year: number
  mileage: number
  fuel: string
  transmission: string
  price: number
  qrCode: string
  scans: number
  lastScanAt: string | null
  image: string | null
  createdAt: string
  priceDroppedAt: string | null
}

export type PanelQrScanEvent = {
  vehicleId: string
  vehicleTitle: string
  scannedAt: string
  source: string
}

export type PanelGalleryShowroomSummary = {
  galleryId: string
  name: string
  slug: string
  logo: string | null
  phone: string | null
  city: string | null
  district: string | null
  heroTagline: string | null
  showroomPath: string
  publicShowroomUrl: string
  vehicleCount: number
  activeVehicleCount: number
}

const SUPPORTED_SOURCES: PanelLeadSource[] = ['qr', 'showroom', 'whatsapp', 'telefon', 'form', 'test-surusu']
const SUPPORTED_STATUSES: PanelLeadStatus[] = ['yeni', 'arandi', 'gorusuluyor', 'test-surusu', 'satisa-dondu', 'kayip']
const VEHICLE_FILTER_CHUNK_SIZE = 120

function toVehicleStatus(status: string): PanelVehicleStatus {
  if (status === 'reserved') return 'reserved'
  if (status === 'sold') return 'sold'
  return 'active'
}

function toLeadSource(source: string): PanelLeadSource {
  return SUPPORTED_SOURCES.includes(source as PanelLeadSource) ? (source as PanelLeadSource) : 'form'
}

function toLeadStatus(status: string): PanelLeadStatus {
  return SUPPORTED_STATUSES.includes(status as PanelLeadStatus) ? (status as PanelLeadStatus) : 'yeni'
}

function buildVehicleTitle(row: {
  year: number
  brand: string
  model: string
  variant: string | null
}) {
  const variantPart = row.variant ? ` ${row.variant}` : ''
  return `${row.year} ${row.brand} ${row.model}${variantPart}`.trim()
}

function buildVehicleFeatureRows(vehicleId: string, input: VehicleCreateInput) {
  const rawFeatures: Array<{ feature_key: string; feature_value?: string | null }> = [
    { feature_key: 'body_type', feature_value: input.bodyType },
    { feature_key: 'engine_size', feature_value: input.engineSize },
    { feature_key: 'horsepower', feature_value: input.horsePower },
    { feature_key: 'plate_number', feature_value: input.plateNumber },
    { feature_key: 'has_damage', feature_value: input.hasDamage === 'yes' ? 'true' : input.hasDamage === 'no' ? 'false' : null },
    { feature_key: 'damage_details', feature_value: input.damageDetails },
    { feature_key: 'previous_owners', feature_value: input.previousOwners },
    { feature_key: 'service_history', feature_value: input.serviceHistory },
    { feature_key: 'warranty', feature_value: input.warrantyStatus === 'yes' ? 'true' : input.warrantyStatus === 'no' ? 'false' : null },
  ]

  return rawFeatures
    .map((feature) => ({
      vehicle_id: vehicleId,
      feature_key: feature.feature_key,
      feature_value: feature.feature_value?.trim() || '',
    }))
    .filter((feature) => feature.feature_value)
}

function buildSecureVehicleSlug(input: VehicleCreateInput) {
  return buildSecurePublicSlug(`${input.brand}-${input.model}-${input.year}`, 'arac')
}

function getQrCodeFromRouteId(routeId: string) {
  const compact = routeId.replace(/[^a-z0-9]/gi, '').toUpperCase()
  return `QR-${compact.slice(-10) || compact.slice(0, 10)}`
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

async function getGalleryIdByOwnerEmail(ownerEmail: string) {
  const rows = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id',
      owner_email: `eq.${ownerEmail}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  return rows[0]?.id || null
}

async function resolveGalleryId(ownerEmail?: string) {
  if (!ownerEmail) return null
  return getGalleryIdByOwnerEmail(ownerEmail)
}

async function ensureGallerySecureSlug(input: {
  galleryId: string
  galleryName: string
  slug: string | null | undefined
}) {
  const currentSlug = input.slug?.trim().toLowerCase() || ''
  if (hasSecurePublicRouteToken(currentSlug)) return currentSlug

  const nextSlug = buildSecurePublicSlug(input.galleryName || 'galeri', 'galeri')

  await supabaseAdminFetch<unknown>({
    method: 'PATCH',
    path: '/rest/v1/galleries',
    query: {
      id: `eq.${input.galleryId}`,
    },
    body: {
      slug: nextSlug,
    },
    prefer: 'return=minimal',
  })

  return nextSlug
}

async function resolveLeadTargetFromVehicle(vehicleIdOrSlug: string) {
  const normalized = vehicleIdOrSlug.trim()
  if (!hasSecurePublicRouteToken(normalized)) return null

  const bySlug = await supabaseAdminFetch<Array<{ id: string; gallery_id: string }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id',
      slug: `eq.${normalized}`,
      limit: 1,
    },
  })

  if (!bySlug[0]) return null
  return {
    vehicleId: bySlug[0].id,
    galleryId: bySlug[0].gallery_id,
  }
}

async function resolveLeadTargetFromGallerySlug(gallerySlug: string) {
  const normalized = gallerySlug.trim().toLowerCase()
  if (!hasSecurePublicRouteToken(normalized)) return null

  const rows = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id',
      slug: `eq.${normalized}`,
      limit: 1,
    },
  })

  if (!rows[0]) return null
  return {
    vehicleId: null as string | null,
    galleryId: rows[0].id,
  }
}

async function fetchVehicleRows(limit: number, galleryId?: string | null) {
  return supabaseAdminFetch<VehicleRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,slug,brand,model,variant,year,price,km,description,fuel,transmission,color,status,photos,created_at,price_dropped_at',
      ...(galleryId ? { gallery_id: `eq.${galleryId}` } : {}),
      order: 'created_at.desc',
      limit,
    },
  })
}

async function fetchLeadVehicleCounts(limit: number, galleryId?: string | null) {
  return supabaseAdminFetch<Array<{ vehicle_id: string | null }>>({
    path: '/rest/v1/leads',
    query: {
      select: 'vehicle_id',
      ...(galleryId ? { gallery_id: `eq.${galleryId}` } : {}),
      limit,
    },
  })
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function fetchQrScanRowsByVehicleIds(
  vehicleIds: string[],
  input?: {
    perChunkLimit?: number
    overallLimit?: number
  },
) {
  if (vehicleIds.length === 0) return [] as QrScanRow[]

  const perChunkLimit = Math.max(1, Math.min(input?.perChunkLimit || 10000, 200000))
  const overallLimit = input?.overallLimit
  const allRows: QrScanRow[] = []

  for (const idChunk of chunkArray(vehicleIds, VEHICLE_FILTER_CHUNK_SIZE)) {
    const chunkRows = await supabaseAdminFetch<QrScanRow[]>({
      path: '/rest/v1/qr_scans',
      query: {
        select: 'vehicle_id,scanned_at,source',
        vehicle_id: `in.(${idChunk.join(',')})`,
        order: 'scanned_at.desc',
        limit: perChunkLimit,
      },
    })

    allRows.push(...chunkRows)

    if (overallLimit && allRows.length >= overallLimit) {
      return allRows.slice(0, overallLimit)
    }
  }

  return allRows
}

export async function listPanelVehicles(ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    return {
      source: 'supabase' as const,
      items: [],
    }
  }

  const vehicles = await fetchVehicleRows(500, galleryId)
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)

  const [scanRows, leadRows] = await Promise.all([
    fetchQrScanRowsByVehicleIds(vehicleIds, {
      perChunkLimit: 50000,
      overallLimit: 500000,
    }).catch(() => []),
    fetchLeadVehicleCounts(100000, galleryId).catch(() => []),
  ])

  const scanCounts = new Map<string, number>()
  for (const item of scanRows) {
    if (!item.vehicle_id) continue
    scanCounts.set(item.vehicle_id, (scanCounts.get(item.vehicle_id) || 0) + 1)
  }

  const leadCounts = new Map<string, number>()
  for (const item of leadRows) {
    if (!item.vehicle_id) continue
    leadCounts.set(item.vehicle_id, (leadCounts.get(item.vehicle_id) || 0) + 1)
  }

  const mapped: PanelVehicle[] = vehicles.map((vehicle) => {
    const routeId = vehicle.slug || vehicle.id

    return {
      id: vehicle.id,
      routeId,
      publicUrl: absoluteUrl(`/arac/${routeId}?src=qr`),
      brand: vehicle.brand,
      model: vehicle.model,
      variant: vehicle.variant || '',
      year: Number(vehicle.year),
      price: Number(vehicle.price),
      mileage: Number(vehicle.km),
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      color: vehicle.color || '',
      status: toVehicleStatus(vehicle.status),
      scans: scanCounts.get(vehicle.id) || 0,
      leads: leadCounts.get(vehicle.id) || 0,
      image: vehicle.photos?.[0] || null,
      photos: vehicle.photos?.filter(Boolean) || [],
      description: vehicle.description || '',
      createdAt: vehicle.created_at,
      priceDroppedAt: vehicle.price_dropped_at ?? null,
    }
  })

  return {
    source: 'supabase' as const,
    items: mapped,
  }
}

export async function listPanelQrVehicleSummaries(ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    return {
      source: 'supabase' as const,
      items: [],
    }
  }

  const vehicles = await fetchVehicleRows(1000, galleryId)
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  const scanRows = await fetchQrScanRowsByVehicleIds(vehicleIds, {
    perChunkLimit: 100000,
    overallLimit: 700000,
  }).catch(() => [])

  const scanCounts = new Map<string, number>()
  const lastScanAtMap = new Map<string, string>()

  for (const row of scanRows) {
    if (!row.vehicle_id) continue

    scanCounts.set(row.vehicle_id, (scanCounts.get(row.vehicle_id) || 0) + 1)

    const currentLast = lastScanAtMap.get(row.vehicle_id)
    if (!currentLast || toTimestamp(row.scanned_at) > toTimestamp(currentLast)) {
      lastScanAtMap.set(row.vehicle_id, row.scanned_at)
    }
  }

  const items: PanelQrVehicleSummary[] = vehicles.map((vehicle) => {
    const routeId = vehicle.slug || vehicle.id

    return {
      vehicleId: vehicle.id,
      routeId,
      publicUrl: absoluteUrl(`/arac/${routeId}?src=qr`),
      vehicleTitle: buildVehicleTitle(vehicle),
      brand: vehicle.brand,
      model: vehicle.model,
      variant: vehicle.variant || '',
      year: Number(vehicle.year),
      mileage: Number(vehicle.km),
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      price: Number(vehicle.price),
      qrCode: getQrCodeFromRouteId(routeId),
      scans: scanCounts.get(vehicle.id) || 0,
      lastScanAt: lastScanAtMap.get(vehicle.id) || null,
      image: vehicle.photos?.[0] || null,
      createdAt: vehicle.created_at,
      priceDroppedAt: vehicle.price_dropped_at ?? null,
    }
  })

  return {
    source: 'supabase' as const,
    items,
  }
}

export async function getPanelGalleryShowroomSummary(ownerEmail?: string) {
  requireSupabaseAdminConfig()

  if (!ownerEmail) return null

  const galleries = await supabaseAdminFetch<Array<{
    id: string
    name: string
    slug: string | null
    logo_url: string | null
    phone: string | null
    city: string | null
    district: string | null
    public_hero_tagline: string | null
  }>>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,logo_url,phone,city,district,public_hero_tagline',
      owner_email: `eq.${ownerEmail}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  const gallery = galleries[0]
  if (!gallery) return null

  const slug = await ensureGallerySecureSlug({
    galleryId: gallery.id,
    galleryName: gallery.name,
    slug: gallery.slug,
  })

  const vehicles = await supabaseAdminFetch<Array<{ id: string; status: string }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,status',
      gallery_id: `eq.${gallery.id}`,
      limit: 10000,
    },
  }).catch(() => [])

  const showroomPath = `/showroom/${slug}`

  return {
    galleryId: gallery.id,
    name: gallery.name,
    slug,
    logo: gallery.logo_url || null,
    phone: gallery.phone || null,
    city: gallery.city || null,
    district: gallery.district || null,
    heroTagline: gallery.public_hero_tagline || null,
    showroomPath,
    publicShowroomUrl: absoluteUrl(showroomPath),
    vehicleCount: vehicles.length,
    activeVehicleCount: vehicles.filter((vehicle) => vehicle.status === 'active').length,
  } satisfies PanelGalleryShowroomSummary
}

export async function listRecentPanelQrScans(limit = 30, ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    return {
      source: 'supabase' as const,
      items: [],
    }
  }

  const vehicles = await fetchVehicleRows(1000, galleryId)
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  const scanRows = await fetchQrScanRowsByVehicleIds(vehicleIds, {
    perChunkLimit: Math.max(limit * 4, 200),
    overallLimit: Math.max(limit * 20, 1000),
  }).catch(() => [])

  const vehicleTitleMap = new Map<string, string>()
  for (const vehicle of vehicles) {
    vehicleTitleMap.set(vehicle.id, buildVehicleTitle(vehicle))
  }

  const allowedVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id))

  const items: PanelQrScanEvent[] = scanRows
    .filter((item) => Boolean(item.vehicle_id) && allowedVehicleIds.has(item.vehicle_id as string))
    .map((item) => ({
      vehicleId: item.vehicle_id as string,
      vehicleTitle: vehicleTitleMap.get(item.vehicle_id as string) || 'Bilinmeyen Araç',
      scannedAt: item.scanned_at,
      source: item.source || 'unknown',
    }))
    .sort((left, right) => toTimestamp(right.scannedAt) - toTimestamp(left.scannedAt))
    .slice(0, limit)

  return {
    source: 'supabase' as const,
    items,
  }
}

export async function createPanelVehicle(input: VehicleCreateInput, ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    throw new Error('Galeri bulunamadı. Önce galeri kaydı oluşturun.')
  }

  const slug = buildSecureVehicleSlug(input)

  const rows = await supabaseAdminFetch<VehicleRow[]>({
    method: 'POST',
    path: '/rest/v1/vehicles',
    prefer: 'return=representation',
    body: [
      {
        gallery_id: galleryId,
        slug,
        brand: input.brand,
        model: input.model,
        variant: input.variant || '',
        year: input.year,
        price: input.price,
        km: input.mileage,
        fuel: input.fuel,
        transmission: input.transmission,
        color: input.color || '',
        description: input.description || '',
        status: 'active',
        photos: input.photos || [],
      },
    ],
  })

  const vehicle = rows[0]
  if (!vehicle) {
    throw new Error('Araç oluşturulamadı.')
  }

  await markUploadedAssetsAttached({
    galleryId,
    vehicleId: vehicle.id,
    publicUrls: vehicle.photos || [],
  })

  const vehicleFeatures = buildVehicleFeatureRows(vehicle.id, input)
  if (vehicleFeatures.length > 0) {
    await supabaseAdminFetch<unknown>({
      method: 'POST',
      path: '/rest/v1/vehicle_features',
      prefer: 'return=minimal',
      body: vehicleFeatures,
    })
  }

  const routeId = vehicle.slug || vehicle.id

  return {
    id: vehicle.id,
    routeId,
    publicUrl: absoluteUrl(`/arac/${routeId}?src=qr`),
    brand: vehicle.brand,
    model: vehicle.model,
    variant: vehicle.variant || '',
    year: Number(vehicle.year),
    price: Number(vehicle.price),
    mileage: Number(vehicle.km),
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    color: vehicle.color || '',
    status: toVehicleStatus(vehicle.status),
    scans: 0,
    leads: 0,
    image: vehicle.photos?.[0] || null,
    photos: vehicle.photos?.filter(Boolean) || [],
    description: vehicle.description || '',
    createdAt: vehicle.created_at,
    priceDroppedAt: vehicle.price_dropped_at ?? null,
  } satisfies PanelVehicle
}

export async function deletePanelVehicle(vehicleId: string, ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    throw new Error('Galeri bulunamadı.')
  }

  const rows = await supabaseAdminFetch<VehicleRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,slug,brand,model,variant,year,price,km,description,fuel,transmission,color,status,photos,created_at,price_dropped_at',
      id: `eq.${vehicleId}`,
      gallery_id: `eq.${galleryId}`,
      limit: 1,
    },
  })

  const vehicle = rows[0]
  if (!vehicle) {
    throw new Error('Araç bulunamadı.')
  }

  const imageDeleteResult = await deleteVehicleImageObjectsForGallery({
    galleryId,
    publicUrls: vehicle.photos || [],
    allowOwnedLegacyPanelPaths: true,
  })
  const metadataDeleteResult = await markUploadedAssetsDeleted({
    galleryId,
    publicUrls: vehicle.photos || [],
    allowOwnedLegacyPanelPaths: true,
  })

  await supabaseAdminFetch<unknown>({
    method: 'DELETE',
    path: '/rest/v1/vehicles',
    query: {
      id: `eq.${vehicleId}`,
      gallery_id: `eq.${galleryId}`,
    },
  })

  return {
    deletedImages: imageDeleteResult.deleted,
    deletedAssetRows: metadataDeleteResult.updated,
  }
}

export async function listPanelLeads(ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    return {
      source: 'supabase' as const,
      items: [],
    }
  }

  const [leadRows, vehicleRows] = await Promise.all([
    supabaseAdminFetch<LeadRow[]>({
      path: '/rest/v1/leads',
      query: {
        select: 'id,vehicle_id,customer_name,customer_phone,customer_email,source,status,notes,follow_up_at,created_at,updated_at',
        gallery_id: `eq.${galleryId}`,
        order: 'created_at.desc',
        limit: 5000,
      },
    }),
    supabaseAdminFetch<Array<{ id: string; brand: string; model: string; variant: string | null; year: number }>>({
      path: '/rest/v1/vehicles',
      query: {
        select: 'id,brand,model,variant,year',
        gallery_id: `eq.${galleryId}`,
        limit: 2000,
      },
    }).catch(() => []),
  ])

  const vehicleMap = new Map<string, string>()
  for (const vehicle of vehicleRows) {
    vehicleMap.set(vehicle.id, buildVehicleTitle(vehicle))
  }

  const mapped: PanelLead[] = leadRows.map((lead) => ({
    id: lead.id,
    vehicleId: lead.vehicle_id || undefined,
    vehicleTitle: lead.vehicle_id ? vehicleMap.get(lead.vehicle_id) || undefined : undefined,
    customerName: lead.customer_name,
    customerPhone: lead.customer_phone,
    customerEmail: lead.customer_email || undefined,
    source: toLeadSource(lead.source),
    status: toLeadStatus(lead.status),
    notes: lead.notes || [],
    followUpDate: lead.follow_up_at ? lead.follow_up_at.slice(0, 10) : undefined,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  }))

  return {
    source: 'supabase' as const,
    items: mapped,
  }
}

export async function updatePanelLead(
  leadId: string,
  changes: {
    status?: PanelLeadStatus
    addNote?: string
    followUpDate?: string | null
  },
  ownerEmail?: string,
) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) {
    throw new Error('Lead güncelleme kapsamı bulunamadı.')
  }

  const rows = await supabaseAdminFetch<LeadRow[]>({
    path: '/rest/v1/leads',
    query: {
      select: 'id,notes,status,updated_at',
      id: `eq.${leadId}`,
      gallery_id: `eq.${galleryId}`,
      limit: 1,
    },
  })

  const existing = rows[0]
  if (!existing) {
    throw new Error('Lead bulunamadı.')
  }

  const nextNotes = changes.addNote ? [...(existing.notes || []), changes.addNote] : existing.notes || []
  const payload: Record<string, unknown> = {
    notes: nextNotes,
  }

  if (changes.status) {
    payload.status = changes.status
  }

  if (changes.followUpDate !== undefined) {
    payload.follow_up_at = changes.followUpDate ? `${changes.followUpDate}T00:00:00.000Z` : null
  }

  const updatedRows = await supabaseAdminFetch<LeadRow[]>({
    method: 'PATCH',
    path: '/rest/v1/leads',
    query: {
      id: `eq.${leadId}`,
      gallery_id: `eq.${galleryId}`,
      select: 'id,vehicle_id,customer_name,customer_phone,customer_email,source,status,notes,follow_up_at,created_at,updated_at',
    },
    body: payload,
    prefer: 'return=representation',
  })

  const lead = updatedRows[0]
  if (!lead) {
    throw new Error('Lead güncellenemedi.')
  }

  let vehicleTitle: string | undefined
  if (lead.vehicle_id) {
    const vehicleRows = await supabaseAdminFetch<Array<{ brand: string; model: string; variant: string | null; year: number }>>({
      path: '/rest/v1/vehicles',
      query: {
        select: 'brand,model,variant,year',
        id: `eq.${lead.vehicle_id}`,
        limit: 1,
      },
    }).catch(() => [])

    const vehicle = vehicleRows[0]
    if (vehicle) {
      vehicleTitle = buildVehicleTitle(vehicle)
    }
  }

  return {
    id: lead.id,
    vehicleId: lead.vehicle_id || undefined,
    vehicleTitle,
    customerName: lead.customer_name,
    customerPhone: lead.customer_phone,
    customerEmail: lead.customer_email || undefined,
    source: toLeadSource(lead.source),
    status: toLeadStatus(lead.status),
    notes: lead.notes || [],
    followUpDate: lead.follow_up_at ? lead.follow_up_at.slice(0, 10) : undefined,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  } satisfies PanelLead
}

export async function insertContactLead(input: {
  leadExternalId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  subject: string
  message: string
  extraNotes?: string[]
  vehicleId?: string
  gallerySlug?: string
  source?: PanelLeadSource
}) {
  requireSupabaseAdminConfig()

  const notes = [
    `Konu: ${input.subject}`,
    `Mesaj: ${input.message.slice(0, 2000)}`,
    ...(input.extraNotes || []),
  ]

  const leadTarget = input.vehicleId
    ? await resolveLeadTargetFromVehicle(input.vehicleId)
    : input.gallerySlug
      ? await resolveLeadTargetFromGallerySlug(input.gallerySlug)
      : null

  if (!leadTarget?.galleryId) {
    return {
      stored: false,
      galleryId: null as string | null,
      vehicleId: null as string | null,
    }
  }

  await supabaseAdminFetch<unknown>({
    method: 'POST',
    path: '/rest/v1/leads',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [
      {
        external_id: input.leadExternalId,
        gallery_id: leadTarget.galleryId,
        vehicle_id: leadTarget.vehicleId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone || '',
        customer_email: input.customerEmail || null,
        source: input.source || 'form',
        status: 'yeni',
        notes,
      },
    ],
  })

  return {
    stored: true,
    galleryId: leadTarget.galleryId,
    vehicleId: leadTarget.vehicleId,
  }
}
