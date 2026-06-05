import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { recordAdminModerationAction } from '@/lib/server/admin-operations-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const moderationActionSchema = z.object({
  reportId: z.string().trim().min(3).max(120),
  status: z.enum(['WARNED', 'SUSPENDED', 'CONTENT_REMOVED', 'DISMISSED']),
  targetGallery: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(3).max(500),
  dryRun: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const payload = await request.json().catch(() => null)
    const parsed = moderationActionSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const result = await recordAdminModerationAction({
      reportId: parsed.data.reportId,
      status: parsed.data.status,
      targetGallery: parsed.data.targetGallery,
      reason: parsed.data.reason,
      dryRun: parsed.data.dryRun,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
