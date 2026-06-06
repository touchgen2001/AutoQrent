import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/request-guards'
import { containsPlaceholderText } from '@/lib/server/panel-input-guard'
import { updatePanelLead } from '@/lib/server/panel-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { assertFeatureAccess } from '@/lib/server/subscription-repository'
import { subscriptionGateErrorResponse } from '@/lib/server/subscription-response'

export const runtime = 'nodejs'

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

const updateLeadSchema = z
  .object({
    status: z.enum(['yeni', 'arandi', 'gorusuluyor', 'test-surusu', 'satisa-dondu', 'kayip']).optional(),
    addNote: z.string().trim().min(1).max(1200).optional(),
    followUpDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine((value) => Boolean(value.status || value.addNote || value.followUpDate !== undefined), {
    message: 'En az bir güncelleme alanı gönderilmelidir.',
  })

export async function PATCH(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const resolved = await context.params
    const parsedParams = paramsSchema.safeParse(resolved)
    if (!parsedParams.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Geçersiz müşteri talebi kimliği.',
        },
        { status: 400 },
      )
    }

    const body = await request.json()
    const parsedBody = updateLeadSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsedBody.error.issues[0]?.message ?? 'Geçersiz müşteri talebi güncelleme verisi.',
        },
        { status: 400 },
      )
    }

    if (parsedBody.data.addNote && containsPlaceholderText(parsedBody.data.addNote)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Müşteri talebi not alanında örnek/sahte içerik kullanılamaz.',
        },
        { status: 400 },
      )
    }

    await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'leads.advanced',
    })

    const updated = await updatePanelLead(parsedParams.data.id, parsedBody.data, session.email)
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    if (parsedBody.data.status) {
      await insertAuditLog({
        action: 'lead_status_change',
        entityType: 'lead',
        entityId: parsedParams.data.id,
        actorRole: 'owner',
        source: 'panel_api',
        ip,
        userAgent,
        metadata: {
          galleryId: session.galleryId,
          to: parsedBody.data.status,
        },
      })
    }

    if (parsedBody.data.addNote) {
      await insertAuditLog({
        action: 'lead_note_add',
        entityType: 'lead',
        entityId: parsedParams.data.id,
        actorRole: 'owner',
        source: 'panel_api',
        ip,
        userAgent,
        metadata: {
          galleryId: session.galleryId,
          noteLength: parsedBody.data.addNote.length,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      item: updated,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    const subscriptionErrorResponse = subscriptionGateErrorResponse(error)
    if (subscriptionErrorResponse) return subscriptionErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Müşteri talebi güncellenemedi. Lütfen tekrar deneyin.',
      },
      { status: 500 },
    )
  }
}
