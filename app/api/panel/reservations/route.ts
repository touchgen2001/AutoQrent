import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/request-guards'
import {
  panelAuthErrorResponse,
  requirePanelPermissionOrThrow,
  requirePanelSessionOrThrow,
} from '@/lib/server/panel-auth-guard'
import {
  listPanelReservations,
  updatePanelReservation,
} from '@/lib/server/panel-operations-repository'

export const runtime = 'nodejs'

const updateSchema = z.object({
  reservationId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'declined', 'cancelled', 'completed']).optional(),
  paymentStatus: z.enum(['unpaid', 'pending', 'paid', 'refunded']).optional(),
  depositAmount: z.coerce.number().min(0).max(100_000_000).optional(),
}).refine((value) => value.status || value.paymentStatus || value.depositAmount !== undefined, {
  message: 'Güncellenecek rezervasyon alanı gönderin.',
})

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const items = await listPanelReservations(session.galleryId)
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Rezervasyonlar alınamadı.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'reservations.manage')
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || 'Geçersiz rezervasyon.' }, { status: 400 })
    }

    const item = await updatePanelReservation({
      galleryId: session.galleryId,
      handledByEmail: session.email,
      ...parsed.data,
    })

    await insertAuditLog({
      action: 'reservation_update',
      entityType: 'reservation',
      entityId: item.id,
      actorEmail: session.email,
      actorRole: session.role,
      source: 'panel_api',
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: { galleryId: session.galleryId, status: item.status, paymentStatus: item.paymentStatus },
    })

    return NextResponse.json({ ok: true, item, items: await listPanelReservations(session.galleryId) })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Rezervasyon güncellenemedi.' }, { status: 500 })
  }
}

