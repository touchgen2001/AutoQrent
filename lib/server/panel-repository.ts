import type {
  PanelLead,
  PanelLeadSource,
  PanelLeadStatus,
  PanelVehicle,
  PanelVehicleStatus,
  VehicleCreateInput,
} from '@/lib/panel-types'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

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
  vehicleTitle: string
  price: number
  qrCode: string
  scans: number
  lastScanAt: string | null
}

export type PanelQrScanEvent = {
  vehicleId: string
  vehicleTitle: string
  scannedAt: string
  source: string
}

const SUPPORTED_SOURCES: PanelLeadSource[] = ['qr', 'showroom', 'whatsapp', 'telefon', 'form', 'test-surusu']
const SUPPORTED_STATUSES: PanelLeadStatus[] = ['yeni', 'arandi', 'gorusuluyor', 'test-surusu', 'satisa-dondu', 'kayip']
const VEHICLE_FILTER_CHUNK_SIZE = 120

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

function getQrCodeFromVehicleId(vehicleId: string) {
  const compact = vehicleId.replace(/-/g, '').toUpperCase()
  return `QR-${compact.slice(0, 8)}`
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

async function resolveLeadTargetFromVehicle(vehicleIdOrSlug: string) {
  const normalized = vehicleIdOrSlug.trim()
  if (!normalized) return null

  const byId = await supabaseAdminFetch<Array<{ id: string; gallery_id: string }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id',
      id: `eq.${normalized}`,
      limit: 1,
    },
  })
  if (byId[0]) {
    return {
      vehicleId: byId[0].id,
      galleryId: byId[0].gallery_id,
    }
  }

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
  if (!normalized) return null

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
      select: 'id,slug,brand,model,variant,year,price,km,description,fuel,transmission,color,status,photos,created_at',
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

  const mapped: PanelVehicle[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
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
    description: vehicle.description || '',
  }))

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

  const items: PanelQrVehicleSummary[] = vehicles.map((vehicle) => ({
    vehicleId: vehicle.id,
    routeId: vehicle.slug || vehicle.id,
    vehicleTitle: buildVehicleTitle(vehicle),
    price: Number(vehicle.price),
    qrCode: getQrCodeFromVehicleId(vehicle.id),
    scans: scanCounts.get(vehicle.id) || 0,
    lastScanAt: lastScanAtMap.get(vehicle.id) || null,
  }))

  return {
    source: 'supabase' as const,
    items,
  }
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
      vehicleTitle: vehicleTitleMap.get(item.vehicle_id as string) || 'Bilinmeyen Arac',
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
    throw new Error('No gallery found. Please create a gallery record first.')
  }

  const slugBase = slugify(`${input.brand}-${input.model}-${input.year}`)
  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`

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
    throw new Error('Vehicle creation failed.')
  }

  return {
    id: vehicle.id,
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
    description: vehicle.description || '',
  } satisfies PanelVehicle
}

export async function deletePanelVehicle(vehicleId: string, ownerEmail?: string) {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)

  await supabaseAdminFetch<unknown>({
    method: 'DELETE',
    path: '/rest/v1/vehicles',
    query: {
      id: `eq.${vehicleId}`,
      ...(galleryId ? { gallery_id: `eq.${galleryId}` } : {}),
    },
  })
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
    throw new Error('Lead update scope not found.')
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
    throw new Error('Lead not found.')
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
    throw new Error('Lead update failed.')
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
