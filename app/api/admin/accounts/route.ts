import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminAccount, getAdminAccountsSnapshot } from '@/lib/server/admin-accounts-repository'
import { adminRouteErrorResponse, requireAdminRoleOrThrow, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const adminAccountSchema = z.object({
  username: z.string().trim().min(3).max(64),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN']),
  status: z.enum(['ACTIVE', 'FROZEN', 'DISABLED']).optional(),
})

export async function GET(request: Request) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const snapshot = await getAdminAccountsSnapshot(session)
    return NextResponse.json(snapshot)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = requireAdminRoleOrThrow(request, ['SUPER_ADMIN'])
    const payload = await request.json().catch(() => null)
    const parsed = adminAccountSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const result = await createAdminAccount({
      ...parsed.data,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
