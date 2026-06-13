import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { requestAdminUserPasswordReset } from '@/lib/server/admin-users-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const passwordResetSchema = z.object({
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
    const payload = await request.json().catch(() => ({}))
    const parsed = passwordResetSchema.safeParse(payload)

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
    const result = await requestAdminUserPasswordReset({
      userId,
      dryRun: parsed.data.dryRun,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
