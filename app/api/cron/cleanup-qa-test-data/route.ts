import { NextResponse } from 'next/server'

import { cleanupQaTestData } from '@/lib/server/qa-test-data-cleanup'
import { requireSupabaseAdminConfig } from '@/lib/server/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorizeQaCleanupRequest(request: Request) {
  const cleanupSecret = process.env.MAINTENANCE_QA_CLEANUP_SECRET
  if (!cleanupSecret) {
    return NextResponse.json(
      {
        ok: false,
        message: 'QA cleanup endpoint devre dışı.',
      },
      { status: 404 },
    )
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${cleanupSecret}`) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Yetkisiz bakım çağrısı.',
      },
      { status: 401 },
    )
  }

  return null
}

export async function POST(request: Request) {
  try {
    const unauthorized = authorizeQaCleanupRequest(request)
    if (unauthorized) return unauthorized

    requireSupabaseAdminConfig()

    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dryRun') === '1'
    const result = await cleanupQaTestData({ dryRun })

    return NextResponse.json({
      job: 'cleanup-qa-test-data',
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: 'cleanup-qa-test-data',
        message: error instanceof Error ? error.message : 'QA test verisi temizlenemedi.',
      },
      { status: 500 },
    )
  }
}
