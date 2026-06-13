import { NextResponse } from 'next/server'

import { cleanupStaleUploadedAssets } from '@/lib/server/uploaded-assets'
import { requireSupabaseAdminConfig } from '@/lib/server/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseBoundedInteger(value: string | null, fallback: number, max: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), max)
}

function authorizeCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        message: 'CRON_SECRET yapılandırılmamış.',
      },
      { status: 500 },
    )
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Yetkisiz cron çağrısı.',
      },
      { status: 401 },
    )
  }

  return null
}

export async function GET(request: Request) {
  try {
    const unauthorized = authorizeCronRequest(request)
    if (unauthorized) return unauthorized

    requireSupabaseAdminConfig()

    const url = new URL(request.url)
    const olderThanHours = parseBoundedInteger(url.searchParams.get('olderThanHours'), 24, 168)
    const limit = parseBoundedInteger(url.searchParams.get('limit'), 100, 100)
    const result = await cleanupStaleUploadedAssets({
      olderThanHours,
      limit,
    })

    return NextResponse.json({
      job: 'cleanup-uploaded-assets',
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: 'cleanup-uploaded-assets',
        message: error instanceof Error ? error.message : 'Upload temizliği çalıştırılamadı.',
      },
      { status: 500 },
    )
  }
}
