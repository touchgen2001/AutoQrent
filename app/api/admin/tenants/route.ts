import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import {
  ADMIN_TENANT_PACKAGES,
  createAdminManagedTenant,
  listAdminManagedTenants,
} from '@/lib/server/admin-tenants-repository'

const tenantCreateSchema = z.object({
  galleryName: z.string().trim().min(2).max(120),
  owner: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email(),
  package: z.enum(ADMIN_TENANT_PACKAGES),
})

export async function GET(request: Request) {
  try {
    requireAdminSessionOrThrow(request)

    const url = new URL(request.url)
    const result = await listAdminManagedTenants({
      search: url.searchParams.get('q') || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const payload = await request.json().catch(() => null)
    const parsed = tenantCreateSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const result = await createAdminManagedTenant({
      ...parsed.data,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
