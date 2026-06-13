import { NextResponse } from 'next/server'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { getAdminOperationsSnapshot } from '@/lib/server/admin-operations-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    requireAdminSessionOrThrow(request)
    const result = await getAdminOperationsSnapshot()
    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
