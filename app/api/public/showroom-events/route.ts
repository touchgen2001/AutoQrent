import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import { isDemoShowroomSlug } from '@/lib/demo-public-experience'
import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordOperationalEvent } from '@/lib/security/ops-monitor'
import { hasSecurePublicRouteToken, MAX_PUBLIC_ROUTE_SLUG_LENGTH } from '@/lib/security/public-route-token'
import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export const runtime = 'nodejs'

const SHOWROOM_EVENTS_ROUTE = '/api/public/showroom-events'

const bodySchema = z.object({
  dealerSlug: z
    .string()
    .trim()
    .min(8, 'Geçersiz galeri linki.')
    .max(MAX_PUBLIC_ROUTE_SLUG_LENGTH, 'Geçersiz galeri linki.')
    .refine(hasSecurePublicRouteToken, 'Geçersiz galeri linki.'),
  eventType: z.enum([
    'whatsapp_click',
    'call_click',
    'location_click',
    'website_click',
    'social_click',
    'vehicle_detail_click',
    'lead_form_open',
    'lead_form_submit',
    'share_click',
  ]),
  target: z.string().trim().max(160, 'Geçersiz hedef bilgisi.').optional(),
})

async function resolvePublicGallery(dealerSlug: string) {
  if (!hasSecurePublicRouteToken(dealerSlug)) return null

  const rows = await supabaseAdminFetch<Array<{ id: string; slug: string; name: string | null }>>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,slug,name',
      slug: `eq.${dealerSlug.trim().toLowerCase()}`,
      limit: 1,
    },
  })

  return rows[0] || null
}

function timing(status: number, startedAt: number) {
  recordApiTiming({
    route: SHOWROOM_EVENTS_ROUTE,
    method: 'POST',
    status,
    durationMs: Date.now() - startedAt,
    area: 'qr',
  })
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
      key: `showroom-events:${ip}`,
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
      timing(429, startedAt)
      return response
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      const response = NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz showroom olay verisi.',
        },
        { status: 400 },
      )
      timing(400, startedAt)
      return response
    }

    if (isDemoShowroomSlug(parsed.data.dealerSlug)) {
      const response = NextResponse.json({
        ok: true,
        demo: true,
      })
      timing(200, startedAt)
      return response
    }

    requireSupabaseAdminConfig()

    const gallery = await resolvePublicGallery(parsed.data.dealerSlug)
    if (!gallery) {
      const response = NextResponse.json(
        {
          ok: false,
          message: 'Galeri bulunamadı.',
        },
        { status: 404 },
      )
      timing(404, startedAt)
      return response
    }

    await insertAuditLog({
      action: 'public_showroom_cta_click',
      entityType: 'marketing',
      entityId: gallery.id,
      source: 'public_showroom_event_api',
      ip,
      userAgent,
      metadata: {
        eventType: parsed.data.eventType,
        target: parsed.data.target || null,
        dealerSlug: gallery.slug,
        galleryId: gallery.id,
      },
    })

    const response = NextResponse.json({ ok: true })
    timing(200, startedAt)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'showroom_event_error'
    const response = NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    )
    recordApiError({
      route: SHOWROOM_EVENTS_ROUTE,
      method: 'POST',
      status: 500,
      message,
      area: 'qr',
    })
    recordOperationalEvent({
      area: 'qr',
      route: SHOWROOM_EVENTS_ROUTE,
      method: 'POST',
      status: 500,
      ok: false,
      message,
      durationMs: Date.now() - startedAt,
    })
    timing(500, startedAt)
    return response
  }
}
