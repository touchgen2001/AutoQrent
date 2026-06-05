import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { getAdminAuditSnapshot } from '@/lib/server/admin-audit-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const auditQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  action: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(120).optional(),
  source: z.string().trim().max(120).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export async function GET(request: Request) {
  try {
    requireAdminSessionOrThrow(request)

    const url = new URL(request.url)
    const parsed = auditQuerySchema.safeParse({
      search: url.searchParams.get('search') || undefined,
      action: url.searchParams.get('action') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      source: url.searchParams.get('source') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      offset: url.searchParams.get('offset') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_query',
          message: parsed.error.issues[0]?.message || 'Geçersiz denetim filtresi.',
        },
        { status: 400 },
      )
    }

    const snapshot = await getAdminAuditSnapshot(parsed.data)
    return NextResponse.json(snapshot)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
