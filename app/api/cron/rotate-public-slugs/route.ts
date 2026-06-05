import { NextResponse } from 'next/server'

import { insertAuditLog } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/request-guards'
import { rotateExistingPublicRouteSlugs } from '@/lib/server/public-slug-rotation'
import { requireSupabaseAdminConfig } from '@/lib/server/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorizeRotationRequest(request: Request) {
  const rotateEnabled = process.env.MAINTENANCE_SLUG_ROTATE_ENABLED === 'YES'
  const rotateSecret = process.env.MAINTENANCE_SLUG_ROTATE_SECRET
  if (!rotateEnabled || !rotateSecret) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Public slug rotate endpoint devre dışı.',
      },
      { status: 404 },
    )
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${rotateSecret}`) {
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
    const unauthorized = authorizeRotationRequest(request)
    if (unauthorized) return unauthorized

    requireSupabaseAdminConfig()

    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dryRun') === '1'
    const result = await rotateExistingPublicRouteSlugs({ dryRun })

    if (!dryRun) {
      await insertAuditLog({
        action: 'public_slug_rotation',
        entityType: 'system',
        entityId: `rotate-public-slugs:${Date.now()}`,
        actorRole: 'maintenance',
        source: 'rotate_public_slugs_endpoint',
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          dryRun,
          oldPublicLinksInvalidated: result.oldPublicLinksInvalidated,
          rotated: result.rotated,
          verification: result.verification,
        },
      }).catch(() => null)
    }

    return NextResponse.json({
      job: 'rotate-public-slugs',
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: 'rotate-public-slugs',
        message: error instanceof Error ? error.message : 'Public slug rotasyonu çalıştırılamadı.',
      },
      { status: 500 },
    )
  }
}
