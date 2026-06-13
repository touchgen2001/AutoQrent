import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { updateAdminUserStatus } from '@/lib/server/admin-users-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const userStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'FROZEN', 'BANNED']),
  reason: z.string().trim().min(12).max(500),
  dryRun: z.boolean().optional(),
})

type RouteContext = {
  params: Promise<{
    userId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const payload = await request.json().catch(() => null)
    const parsed = userStatusSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const { userId } = await context.params
    const result = await updateAdminUserStatus({
      userId,
      status: parsed.data.status,
      reason: parsed.data.reason,
      dryRun: parsed.data.dryRun,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
