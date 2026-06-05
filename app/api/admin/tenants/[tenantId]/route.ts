import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminRouteErrorResponse, requireAdminSessionOrThrow } from '@/lib/server/admin-route-guard'
import {
  ADMIN_TENANT_PACKAGES,
  ADMIN_TENANT_PAYMENT_STATUSES,
  ADMIN_TENANT_STATUSES,
  updateAdminManagedTenant,
} from '@/lib/server/admin-tenants-repository'

const tenantUpdateSchema = z.object({
  galleryName: z.string().trim().min(2).max(120).optional(),
  owner: z.string().trim().min(2).max(120).optional(),
  ownerEmail: z.string().trim().email().optional(),
  package: z.enum(ADMIN_TENANT_PACKAGES).optional(),
  status: z.enum(ADMIN_TENANT_STATUSES).optional(),
  paymentStatus: z.enum(ADMIN_TENANT_PAYMENT_STATUSES).optional(),
  vehicleCount: z.number().int().min(0).optional(),
  reason: z.string().trim().min(12).max(500).optional(),
})

type RouteContext = {
  params: Promise<{
    tenantId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = requireAdminSessionOrThrow(request)
    const payload = await request.json().catch(() => null)
    const parsed = tenantUpdateSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payload',
        },
        { status: 400 },
      )
    }

    const { tenantId } = await context.params
    const { reason, ...patch } = parsed.data
    const requiresReason = Boolean(patch.status || patch.paymentStatus || patch.ownerEmail)

    if (requiresReason && !reason) {
      return NextResponse.json(
        {
          ok: false,
          error: 'reason_required',
          message: 'Kritik tenant değişiklikleri için işlem sebebi zorunludur.',
        },
        { status: 400 },
      )
    }

    const result = await updateAdminManagedTenant({
      tenantId,
      patch,
      reason,
      adminUsername: session.username,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminRouteErrorResponse(error)
  }
}
