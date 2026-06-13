import { NextResponse } from 'next/server'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { getAdminFinanceSnapshot } from '@/lib/server/admin-finance-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    requireAdminSessionOrThrow(request)

    const snapshot = await getAdminFinanceSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
