import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { recordAdminNotificationRequest } from '@/lib/server/admin-users-repository'

const notificationSchema = z.object({
  scope: z.enum(['single', 'bulk']),
  userId: z.string().trim().min(1).optional(),
  channel: z.enum(['panel', 'email', 'sms', 'whatsapp']).default('panel'),
  targetSegment: z.enum(['ALL_TENANTS', 'ACTIVE_TENANTS', 'TRIAL_TENANTS', 'SUSPENDED_TENANTS']).optional(),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(1000),
  dryRun: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const payload = await request.json().catch(() => null)
    const parsed = notificationSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const result = await recordAdminNotificationRequest({
      scope: parsed.data.scope,
      userId: parsed.data.userId,
      channel: parsed.data.channel,
      targetSegment: parsed.data.targetSegment,
      title: parsed.data.title,
      message: parsed.data.message,
      dryRun: parsed.data.dryRun,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
