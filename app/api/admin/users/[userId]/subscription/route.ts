import { NextResponse } from 'next/server'
import { z } from 'zod'

import { ADMIN_SUBSCRIPTION_PLANS, ADMIN_SUBSCRIPTION_STATUSES } from '@/lib/admin-user-types'
import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { updateAdminUserSubscription } from '@/lib/server/admin-users-repository'

const subscriptionSchema = z.object({
  plan: z.enum(ADMIN_SUBSCRIPTION_PLANS),
  status: z.enum(ADMIN_SUBSCRIPTION_STATUSES),
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
    const parsed = subscriptionSchema.safeParse(payload)

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
    const result = await updateAdminUserSubscription({
      userId,
      plan: parsed.data.plan,
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
