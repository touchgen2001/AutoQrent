import { NextResponse } from 'next/server'
import { z } from 'zod'

import { softDeleteAdminAccount, updateAdminAccount } from '@/lib/server/admin-accounts-repository'
import { adminRouteErrorResponse, requireAdminRoleOrThrow } from '@/lib/server/admin-route-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateAdminAccountSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'FROZEN', 'DISABLED']).optional(),
  resetPassword: z.boolean().optional(),
  revokeSessions: z.boolean().optional(),
})

type RouteContext = {
  params: Promise<{
    accountId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = requireAdminRoleOrThrow(request, ['SUPER_ADMIN'])
    const payload = await request.json().catch(() => null)
    const parsed = updateAdminAccountSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const { accountId } = await context.params
    const result = await updateAdminAccount({
      accountId,
      ...parsed.data,
      adminUsername: session.username,
      currentSessionAccountId: session.accountId,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = requireAdminRoleOrThrow(request, ['SUPER_ADMIN'])
    const { accountId } = await context.params
    const result = await softDeleteAdminAccount({
      accountId,
      adminUsername: session.username,
      currentSessionAccountId: session.accountId,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
