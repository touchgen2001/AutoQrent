import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

const rangeSchema = z.enum(['7days', '30days', '90days', 'year'])

const DAY_MAP: Record<z.infer<typeof rangeSchema>, number> = {
  '7days': 7,
  '30days': 30,
  '90days': 90,
  'year': 365,
}

type QrRow = {
  vehicle_id: string | null
  scanned_at: string
  source: string | null
  ip_hash: string | null
}

type LeadRow = {
  vehicle_id: string | null
  created_at: string
}

type VehicleRow = {
  id: string
  brand: string
  model: string
  variant: string | null
  photos: string[] | null
}

type GalleryIdRow = {
  id: string
}

const VEHICLE_FILTER_CHUNK_SIZE = 120

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

function buildVehicleTitle(vehicle: VehicleRow) {
  return `${vehicle.brand} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`.trim()
}

function toNumber(value: number) {
  return Number(value.toFixed(1))
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function fetchScopedQrRows(input: {
  startIso: string
  vehicleIds: string[]
}) {
  if (input.vehicleIds.length === 0) return [] as QrRow[]

  const allRows: QrRow[] = []

  for (const idChunk of chunkArray(input.vehicleIds, VEHICLE_FILTER_CHUNK_SIZE)) {
    const chunkRows = await supabaseAdminFetch<QrRow[]>({
      path: '/rest/v1/qr_scans',
      query: {
        select: 'vehicle_id,scanned_at,source,ip_hash',
        scanned_at: `gte.${input.startIso}`,
        vehicle_id: `in.(${idChunk.join(',')})`,
        order: 'scanned_at.desc',
        limit: 200000,
      },
    })

    allRows.push(...chunkRows)
  }

  return allRows
}

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()

    const url = new URL(request.url)
    const rawRange = url.searchParams.get('range') ?? '7days'
    const parsed = rangeSchema.safeParse(rawRange)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz tarih aralığı.',
        },
        { status: 400 },
      )
    }

    const range = parsed.data
    const days = DAY_MAP[range]
    const now = Date.now()
    const start = new Date(now - days * 24 * 60 * 60 * 1000)

    const galleryRows = await supabaseAdminFetch<GalleryIdRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: 'id',
        owner_email: `eq.${session.email}`,
        order: 'created_at.asc',
        limit: 1,
      },
    })

    const galleryId = galleryRows[0]?.id || null
    if (!galleryId) {
      return NextResponse.json({
        ok: true,
        range,
        source: 'supabase',
        metrics: {
          totalScans: 0,
          uniqueVisitors: 0,
          totalLeads: 0,
          totalVehicles: 0,
        },
        dailyStats: [],
        hourlyStats: [],
        vehiclePerformance: [],
      })
    }

    const [leadRows, vehicles] = await Promise.all([
      supabaseAdminFetch<LeadRow[]>({
        path: '/rest/v1/leads',
        query: {
          select: 'vehicle_id,created_at',
          gallery_id: `eq.${galleryId}`,
          created_at: `gte.${start.toISOString()}`,
          order: 'created_at.desc',
          limit: 200000,
        },
      }),
      supabaseAdminFetch<VehicleRow[]>({
        path: '/rest/v1/vehicles',
        query: {
          select: 'id,brand,model,variant,photos',
          gallery_id: `eq.${galleryId}`,
          status: 'eq.active',
          limit: 5000,
        },
      }),
    ])

    const vehicleIds = vehicles.map((vehicle) => vehicle.id)
    const scopedQrRows = await fetchScopedQrRows({
      startIso: start.toISOString(),
      vehicleIds,
    })

    const dailyMap = new Map<string, { scans: number; leads: number }>()
    const hourlyMap = new Map<number, number>()
    const scanCounts = new Map<string, number>()
    const leadCounts = new Map<string, number>()
    const uniqueVisitorSet = new Set<string>()

    for (let index = 0; index < days; index += 1) {
      const date = new Date(now - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      dailyMap.set(date, { scans: 0, leads: 0 })
    }

    for (let hour = 0; hour < 24; hour += 1) {
      hourlyMap.set(hour, 0)
    }

    for (const row of scopedQrRows) {
      const key = dateKey(row.scanned_at)
      const daily = dailyMap.get(key)
      if (daily) daily.scans += 1

      const hour = new Date(row.scanned_at).getHours()
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)

      if (row.vehicle_id) {
        scanCounts.set(row.vehicle_id, (scanCounts.get(row.vehicle_id) || 0) + 1)
      }

      if (row.ip_hash) {
        uniqueVisitorSet.add(row.ip_hash)
      }
    }

    for (const row of leadRows) {
      const key = dateKey(row.created_at)
      const daily = dailyMap.get(key)
      if (daily) daily.leads += 1

      if (row.vehicle_id) {
        leadCounts.set(row.vehicle_id, (leadCounts.get(row.vehicle_id) || 0) + 1)
      }
    }

    const dailyStats = Array.from(dailyMap.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([date, metrics]) => ({
        date,
        scans: metrics.scans,
        leads: metrics.leads,
      }))

    const hourlyStats = Array.from(hourlyMap.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([hour, scans]) => ({ hour, scans }))

    const vehiclePerformance = vehicles
      .map((vehicle) => {
        const scans = scanCounts.get(vehicle.id) || 0
        const leads = leadCounts.get(vehicle.id) || 0

        return {
          vehicleId: vehicle.id,
          vehicleTitle: buildVehicleTitle(vehicle),
          image: vehicle.photos?.[0] || null,
          scans,
          leads,
          conversionRate: scans > 0 ? toNumber((leads / scans) * 100) : 0,
        }
      })
      .filter((item) => item.scans > 0 || item.leads > 0)
      .sort((left, right) => {
        if (right.scans !== left.scans) return right.scans - left.scans
        return right.leads - left.leads
      })
      .slice(0, 25)

    return NextResponse.json({
      ok: true,
      range,
      source: 'supabase',
      metrics: {
        totalScans: scopedQrRows.length,
        uniqueVisitors: uniqueVisitorSet.size,
        totalLeads: leadRows.length,
        totalVehicles: vehicles.length,
      },
      dailyStats,
      hourlyStats,
      vehiclePerformance,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Analitik verisi alinamadi.',
      },
      { status: 500 },
    )
  }
}
