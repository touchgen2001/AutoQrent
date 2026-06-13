import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import {
  panelAuthErrorResponse,
  requirePanelPermissionOrThrow,
  requirePanelSessionOrThrow,
} from '@/lib/server/panel-auth-guard'
import { listPanelReviews, updatePanelReview } from '@/lib/server/panel-operations-repository'

export const runtime = 'nodejs'

const updateSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.enum(['pending', 'published', 'rejected']),
})

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    return NextResponse.json({ ok: true, items: await listPanelReviews(session.galleryId) })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Yorumlar alınamadı.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'reviews.manage')
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, message: 'Yorum güncellemesi geçersiz.' }, { status: 400 })
    const item = await updatePanelReview({
      galleryId: session.galleryId,
      reviewId: parsed.data.reviewId,
      status: parsed.data.status,
      moderatedByEmail: session.email,
    })
    await insertAuditLog({
      action: 'review_moderate',
      entityType: 'review',
      entityId: item.id,
      actorEmail: session.email,
      actorRole: session.role,
      source: 'panel_api',
      metadata: { galleryId: session.galleryId, status: item.status },
    })
    return NextResponse.json({ ok: true, item, items: await listPanelReviews(session.galleryId) })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Yorum güncellenemedi.' }, { status: 500 })
  }
}

