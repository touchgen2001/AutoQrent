import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isDemoVehicleRouteId } from '@/lib/demo-public-experience'
import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming } from '@/lib/security/ops-monitor'
import { hasSecurePublicRouteToken, MAX_PUBLIC_ROUTE_SLUG_LENGTH } from '@/lib/security/public-route-token'
import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { requireSupabaseAdminConfig } from '@/lib/server/supabase-admin'
import { resolveVehicleForPriceAlert, saveVehiclePriceAlert } from '@/lib/server/price-alert-repository'

export const runtime = 'nodejs'

const ROUTE = '/api/public/price-alerts/subscribe'

const bodySchema = z.object({
  vehicleRouteId: z
    .string()
    .trim()
    .min(8, 'Geçersiz araç linki.')
    .max(MAX_PUBLIC_ROUTE_SLUG_LENGTH, 'Geçersiz araç linki.')
    .refine(hasSecurePublicRouteToken, 'Geçersiz araç linki.'),
  endpoint: z.string().trim().url('Geçersiz abonelik.').max(2000),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(500),
    auth: z.string().trim().min(1).max(500),
  }),
  userAgent: z.string().trim().max(400).optional(),
})

export async function POST(request: Request) {
  const startedAt = Date.now()
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const limits = getSecurityLimits()
  try {
    const ip = getClientIp(request)
    const rate = checkRateLimit({
      key: `price-alert:${ip}`,
      limit: limits.vehicleEvents.limit,
      windowMs: limits.vehicleEvents.windowMs,
    })
    if (!rate.allowed) {
      const response = NextResponse.json(
        { ok: false, message: 'Çok fazla istek gönderdiniz.' },
        { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } },
      )
      recordApiTiming({ route: ROUTE, method: 'POST', status: 429, durationMs: Date.now() - startedAt, area: 'qr' })
      return response
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      const response = NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? 'Geçersiz abonelik verisi.' },
        { status: 400 },
      )
      recordApiTiming({ route: ROUTE, method: 'POST', status: 400, durationMs: Date.now() - startedAt, area: 'qr' })
      return response
    }

    // Demo vehicle: accept the opt-in but persist nothing (no real vehicle row).
    if (isDemoVehicleRouteId(parsed.data.vehicleRouteId)) {
      recordApiTiming({ route: ROUTE, method: 'POST', status: 200, durationMs: Date.now() - startedAt, area: 'qr' })
      return NextResponse.json({ ok: true, demo: true })
    }

    requireSupabaseAdminConfig()
    const vehicle = await resolveVehicleForPriceAlert(parsed.data.vehicleRouteId)
    if (!vehicle) {
      const response = NextResponse.json({ ok: false, message: 'Araç bulunamadı.' }, { status: 404 })
      recordApiTiming({ route: ROUTE, method: 'POST', status: 404, durationMs: Date.now() - startedAt, area: 'qr' })
      return response
    }

    await saveVehiclePriceAlert({
      vehicleId: vehicle.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      baselinePrice: vehicle.price,
      userAgent: parsed.data.userAgent,
    })

    recordApiTiming({ route: ROUTE, method: 'POST', status: 200, durationMs: Date.now() - startedAt, area: 'qr' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    recordApiError({
      route: ROUTE,
      method: 'POST',
      status: 500,
      message: error instanceof Error ? error.message : 'unknown_error',
      area: 'qr',
    })
    return NextResponse.json({ ok: false, message: 'Abonelik kaydedilemedi.' }, { status: 500 })
  }
}
