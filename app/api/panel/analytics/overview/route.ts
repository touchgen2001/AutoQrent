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

type AnalyticsOverview = {
  metrics: {
    totalScans: number
    uniqueVisitors: number
    totalLeads: number
    totalVehicles: number
  }
  dailyStats: Array<{ date: string; scans: number; leads: number }>
  hourlyStats: Array<{ hour: number; scans: number }>
  vehiclePerformance: Array<{
    vehicleId: string
    vehicleTitle: string
    image: string | null
    scans: number
    leads: number
    conversionRate: number
  }>
}

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()

    const url = new URL(request.url)
    const parsed = rangeSchema.safeParse(url.searchParams.get('range') ?? '7days')
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
    // Database-side aggregation keeps raw scan/lead rows out of the serverless
    // function and returns a bounded response regardless of gallery traffic.
    const days = DAY_MAP[range]
    const startAt = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    startAt.setUTCHours(0, 0, 0, 0)

    const overview = await supabaseAdminFetch<AnalyticsOverview>({
      method: 'POST',
      path: '/rest/v1/rpc/get_gallery_analytics_overview',
      body: {
        p_gallery_id: session.galleryId,
        p_start_at: startAt.toISOString(),
      },
    })

    return NextResponse.json({
      ok: true,
      range,
      source: 'supabase-rpc',
      ...overview,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Analitik verisi alınamadı.',
      },
      { status: 500 },
    )
  }
}
