import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { createPublicVehicleReservation } from '@/lib/server/panel-operations-repository'

export const runtime = 'nodejs'

const schema = z.object({
  vehicleRouteId: z.string().trim().refine(hasSecurePublicRouteToken, 'Araç kimliği geçersiz.'),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  customerEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  note: z.string().trim().max(1000).optional(),
  website: z.string().trim().max(120).optional(),
})

export async function POST(request: Request) {
  const blocked = trustedMutationOriginResponse(request)
  if (blocked) return blocked

  try {
    const ip = getClientIp(request)
    const rate = await checkRateLimit({ key: `public-reservation:${ip}`, limit: 5, windowMs: 10 * 60 * 1000 })
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, message: 'Çok fazla rezervasyon denemesi yapıldı.' }, { status: 429 })
    }
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || 'Rezervasyon bilgisi geçersiz.' }, { status: 400 })
    }
    if (parsed.data.website) return NextResponse.json({ ok: true, message: 'Rezervasyon talebiniz alındı.' })

    const item = await createPublicVehicleReservation(parsed.data)
    await insertAuditLog({
      action: 'reservation_create',
      entityType: 'reservation',
      entityId: item.id,
      source: 'public_reservation_api',
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: { galleryId: item.galleryId, vehicleId: item.vehicleId },
    })
    return NextResponse.json({ ok: true, message: 'Rezervasyon talebiniz galeriye iletildi.' })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Rezervasyon talebi oluşturulamadı.',
    }, { status: 400 })
  }
}

