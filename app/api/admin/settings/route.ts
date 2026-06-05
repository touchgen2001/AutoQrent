import { NextResponse } from 'next/server'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { getAdminSettingsSnapshot } from '@/lib/server/admin-settings-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    requireAdminSessionOrThrow(request)

    const snapshot = getAdminSettingsSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
