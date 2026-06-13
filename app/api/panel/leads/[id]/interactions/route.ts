import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/request-guards'
import {
  panelAuthErrorResponse,
  requirePanelPermissionOrThrow,
  requirePanelSessionOrThrow,
} from '@/lib/server/panel-auth-guard'
import { createLeadInteraction, listLeadInteractions } from '@/lib/server/panel-operations-repository'

export const runtime = 'nodejs'

const paramsSchema = z.object({ id: z.string().uuid() })
const createSchema = z.object({
  channel: z.enum(['whatsapp', 'phone', 'email', 'note']),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  templateKey: z.string().trim().max(80).optional(),
  messagePreview: z.string().trim().max(500).optional(),
})

export async function GET(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const params = paramsSchema.safeParse(await context.params)
    if (!params.success) return NextResponse.json({ ok: false, message: 'Geçersiz müşteri talebi.' }, { status: 400 })
    const items = await listLeadInteractions({ galleryId: session.galleryId, leadId: params.data.id })
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Etkileşim geçmişi alınamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'whatsapp.manage')
    const params = paramsSchema.safeParse(await context.params)
    const body = createSchema.safeParse(await request.json())
    if (!params.success || !body.success) {
      return NextResponse.json({ ok: false, message: 'Etkileşim bilgisi geçersiz.' }, { status: 400 })
    }

    const item = await createLeadInteraction({
      galleryId: session.galleryId,
      leadId: params.data.id,
      actorEmail: session.email,
      ...body.data,
    })

    await insertAuditLog({
      action: 'lead_whatsapp_open',
      entityType: 'lead',
      entityId: params.data.id,
      actorEmail: session.email,
      actorRole: session.role,
      source: 'panel_api',
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        galleryId: session.galleryId,
        channel: body.data.channel,
        templateKey: body.data.templateKey || null,
      },
    })

    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Etkileşim kaydedilemedi.' }, { status: 500 })
  }
}

