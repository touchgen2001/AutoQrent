import { NextResponse } from 'next/server'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import { listAdminManagedUsers } from '@/lib/server/admin-users-repository'

function parseMaxUsers(value: string | null) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return undefined
  return Math.min(Math.max(parsed, 1), 5000)
}

export async function GET(request: Request) {
  try {
    requireAdminSessionOrThrow(request)

    const url = new URL(request.url)
    const result = await listAdminManagedUsers({
      search: url.searchParams.get('q') || undefined,
      maxUsers: parseMaxUsers(url.searchParams.get('maxUsers')),
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
