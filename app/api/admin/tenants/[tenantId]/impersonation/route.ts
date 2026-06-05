import { NextResponse } from 'next/server'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { createAdminTenantImpersonationPreview } from '@/lib/server/admin-tenants-repository'

type RouteContext = {
  params: Promise<{
    tenantId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const { tenantId } = await context.params
    const result = await createAdminTenantImpersonationPreview({
      tenantId,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
