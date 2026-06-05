import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { checkRateLimit, estimateBotRisk, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'

export const runtime = 'nodejs'

const auditPayloadSchema = z.object({
  action: z.enum(['vehicle_create', 'vehicle_delete', 'vehicle_update', 'lead_status_change', 'lead_note_add']),
  entityType: z.enum(['vehicle', 'lead', 'system']),
  entityId: z.string().trim().min(1).max(120),
  actorEmail: z.string().trim().email().optional(),
  actorRole: z.string().trim().max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  try {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    const rateLimit = checkRateLimit({
      key: `audit:${ip}`,
      limit: 30,
      windowMs: 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: 'Çok fazla audit isteği gönderildi.' },
        {
          status: 429,
          headers: {
            'retry-after': String(rateLimit.retryAfterSeconds),
          },
        },
      )
    }

    const body = await request.json()
    const parsed = auditPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz audit payload.',
        },
        { status: 400 },
      )
    }

    const botRisk = estimateBotRisk(request, [
      parsed.data.action,
      parsed.data.entityType,
      parsed.data.entityId,
      JSON.stringify(parsed.data.metadata || {}),
    ])

    if (botRisk.blocked) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Denetim isteği güvenlik nedeniyle engellendi.',
        },
        { status: 403 },
      )
    }

    const inserted = await insertAuditLog({
      action: parsed.data.action,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      actorEmail: parsed.data.actorEmail,
      actorRole: parsed.data.actorRole,
      metadata: parsed.data.metadata,
      source: 'panel_api',
      ip,
      userAgent,
    })

    if (!inserted.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: inserted.error || 'Denetim kaydı oluşturulamadı.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      stored: inserted.stored,
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Denetim kaydı sırasında beklenmeyen bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
