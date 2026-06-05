import { NextResponse } from 'next/server'
import { z } from 'zod'

import { ADMIN_ACCESS_STATUSES, ADMIN_ACCOUNT_ROLES } from '@/lib/admin-user-types'
import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { updateAdminUserAuthorization } from '@/lib/server/admin-users-repository'

const authorizationSchema = z.object({
  role: z.enum(ADMIN_ACCOUNT_ROLES),
  accessStatus: z.enum(ADMIN_ACCESS_STATUSES),
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
    const parsed = authorizationSchema.safeParse(payload)

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
    const result = await updateAdminUserAuthorization({
      userId,
      role: parsed.data.role,
      accessStatus: parsed.data.accessStatus,
      reason: parsed.data.reason,
      dryRun: parsed.data.dryRun,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
