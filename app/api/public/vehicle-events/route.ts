import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import { isDemoVehicleRouteId } from '@/lib/demo-public-experience'
import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordOperationalEvent } from '@/lib/security/ops-monitor'
import { hasSecurePublicRouteToken, MAX_PUBLIC_ROUTE_SLUG_LENGTH } from '@/lib/security/public-route-token'
import { checkRateLimit, getClientIp, hashForStorage, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export const runtime = 'nodejs'

const bodySchema = z.object({
  vehicleRouteId: z
    .string()
    .trim()
    .min(8, 'Geçersiz araç linki.')
    .max(MAX_PUBLIC_ROUTE_SLUG_LENGTH, 'Geçersiz araç linki.')
    .refine(hasSecurePublicRouteToken, 'Geçersiz araç linki.'),
  source: z.enum(['qr', 'showroom', 'direct']).default('direct'),
  eventType: z
    .enum(['view', 'whatsapp_click', 'call_click', 'location_click', 'share_click', 'form_open', 'favorite'])
    .default('view'),
})

async function resolveVehicleEventId(vehicleRouteId: string) {
  if (!hasSecurePublicRouteToken(vehicleRouteId)) return null

  const rows = await supabaseAdminFetch<Array<{ id: string; gallery_id: string | null; slug: string }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id,slug',
      slug: `eq.${vehicleRouteId.trim()}`,
      status: 'eq.active',
      deleted_at: 'is.null',
      limit: 1,
    },
  })

  return rows[0] || null
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const limits = getSecurityLimits()
  try {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const rate = await checkRateLimit({
      key: `vehicle-events:${ip}`,
      limit: limits.vehicleEvents.limit,
      windowMs: limits.vehicleEvents.windowMs,
    })

    if (!rate.allowed) {
      const response = NextResponse.json(
        {
          ok: false,
          message: 'Çok fazla istek gönderdiniz.',
        },
        {
          status: 429,
          headers: {
            'retry-after': String(rate.retryAfterSeconds),
          },
        },
      )
      recordApiTiming({
        route: '/api/public/vehicle-events',
        method: 'POST',
        status: 429,
        durationMs: Date.now() - startedAt,
        area: 'qr',
      })
      return response
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      const response = NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz olay verisi.',
        },
        { status: 400 },
      )
      recordApiTiming({
        route: '/api/public/vehicle-events',
        method: 'POST',
        status: 400,
        durationMs: Date.now() - startedAt,
        area: 'qr',
      })
      return response
    }

    if (isDemoVehicleRouteId(parsed.data.vehicleRouteId)) {
      const response = NextResponse.json({
        ok: true,
        demo: true,
      })
      recordApiTiming({
        route: '/api/public/vehicle-events',
        method: 'POST',
        status: 200,
        durationMs: Date.now() - startedAt,
        area: 'qr',
      })
      return response
    }

    requireSupabaseAdminConfig()

    const vehicle = await resolveVehicleEventId(parsed.data.vehicleRouteId)
    const source = parsed.data.source
    const eventType = parsed.data.eventType
    const ipHash = hashForStorage(ip)
    const uaHash = hashForStorage(userAgent)

    if (!vehicle) {
      const response = NextResponse.json(
        {
          ok: false,
          message: 'Araç bulunamadı.',
        },
        { status: 404 },
      )
      recordApiTiming({
        route: '/api/public/vehicle-events',
        method: 'POST',
        status: 404,
        durationMs: Date.now() - startedAt,
        area: 'qr',
      })
      return response
    }

    if (eventType === 'view') {
      await supabaseAdminFetch<unknown>({
        method: 'POST',
        path: '/rest/v1/vehicle_views',
        prefer: 'return=minimal',
        body: [
          {
            vehicle_id: vehicle.id,
          },
        ],
      })
    }

    if (eventType === 'view' && source === 'qr') {
      await supabaseAdminFetch<unknown>({
        method: 'POST',
        path: '/rest/v1/qr_scans',
        prefer: 'return=minimal',
        body: [
          {
            vehicle_id: vehicle.id,
            source,
            ip_hash: ipHash,
            ua_hash: uaHash,
          },
        ],
      })
    }

    if (eventType !== 'view') {
      await insertAuditLog({
        action: 'public_vehicle_cta_click',
        entityType: 'vehicle',
        entityId: vehicle.id,
        source: 'public_vehicle_event_api',
        ip,
        userAgent,
        metadata: {
          eventType,
          source,
          vehicleRouteId: vehicle.slug,
          galleryId: vehicle.gallery_id,
        },
      })
    }

    const response = NextResponse.json({
      ok: true,
    })
    recordApiTiming({
      route: '/api/public/vehicle-events',
      method: 'POST',
      status: 200,
      durationMs: Date.now() - startedAt,
      area: 'qr',
    })
    return response
  } catch (error) {
    const response = NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Olay kaydı başarısız.',
      },
      { status: 500 },
    )
    recordApiError({
      route: '/api/public/vehicle-events',
      method: 'POST',
      status: 500,
      message: error instanceof Error ? error.message : 'unknown_error',
      area: 'qr',
    })
    recordOperationalEvent({
      area: 'qr',
      route: '/api/public/vehicle-events',
      method: 'POST',
      status: 500,
      ok: false,
      message: error instanceof Error ? error.message : 'unknown_error',
      durationMs: Date.now() - startedAt,
    })
    recordApiTiming({
      route: '/api/public/vehicle-events',
      method: 'POST',
      status: 500,
      durationMs: Date.now() - startedAt,
      area: 'qr',
    })
    return response
  }
}
