import { NextResponse } from 'next/server'
import { z } from 'zod'

import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { deletePushSubscription, resolveGalleryIdByOwner, savePushSubscription } from '@/lib/server/push-repository'

// Registers / removes a dealer's Web Push subscription so new-lead alerts reach
// them even when the panel tab is closed. Panel-session gated; the gallery is
// resolved from the session owner (a dealer can only subscribe their own gallery).
export const runtime = 'nodejs'

const subscribeSchema = z.object({
  endpoint: z.string().trim().url().max(2048),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(512),
    auth: z.string().trim().min(1).max(512),
  }),
  userAgent: z.string().trim().max(400).optional(),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().url().max(2048),
})

export async function POST(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const body = await request.json().catch(() => null)
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? 'Geçersiz bildirim aboneliği.' },
        { status: 400 },
      )
    }

    const galleryId = await resolveGalleryIdByOwner(session.email)
    if (!galleryId) {
      return NextResponse.json({ ok: false, message: 'Galeri bulunamadı.' }, { status: 404 })
    }

    await savePushSubscription({
      galleryId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: parsed.data.userAgent,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return NextResponse.json({ ok: false, message: 'Bildirim aboneliği kaydedilemedi.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requirePanelSessionOrThrow(request)

    const body = await request.json().catch(() => null)
    const parsed = unsubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 })
    }

    await deletePushSubscription(parsed.data.endpoint)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return NextResponse.json({ ok: false, message: 'Bildirim aboneliği silinemedi.' }, { status: 500 })
  }
}
