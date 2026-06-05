import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { checkRateLimit, estimateBotRisk, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'

export const runtime = 'nodejs'

const payloadSchema = z.object({
  eventType: z.enum(['impression', 'click']),
  variant: z.enum(['A', 'B']),
  surface: z.enum(['header', 'hero', 'cta_section', 'mobile_sticky', 'pricing']),
  sessionId: z.string().trim().min(3).max(120),
  action: z.enum(['primary', 'secondary', 'call', 'whatsapp', 'demo', 'plan_start']).optional(),
  href: z.string().trim().max(300).optional(),
  label: z.string().trim().max(120).optional(),
})

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  try {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    const rateLimit = checkRateLimit({
      key: `landing-cta:${ip}`,
      limit: 100,
      windowMs: 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: 'Çok fazla CTA event isteği gönderildi.' },
        {
          status: 429,
          headers: {
            'retry-after': String(rateLimit.retryAfterSeconds),
          },
        },
      )
    }

    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz CTA event payload.',
        },
        { status: 400 },
      )
    }

    const botRisk = estimateBotRisk(request, [
      parsed.data.eventType,
      parsed.data.surface,
      parsed.data.variant,
      parsed.data.action || '',
      parsed.data.href || '',
      parsed.data.label || '',
    ])

    if (botRisk.blocked) {
      return NextResponse.json(
        {
          ok: false,
          message: 'CTA event isteği güvenlik nedeniyle engellendi.',
        },
        { status: 403 },
      )
    }

    const action = parsed.data.eventType === 'click' ? 'landing_cta_click' : 'landing_cta_impression'
    const entityId = `landing:${parsed.data.surface}:${parsed.data.variant}`

    const inserted = await insertAuditLog({
      action,
      entityType: 'marketing',
      entityId,
      source: 'landing_ab',
      ip,
      userAgent,
      metadata: {
        eventType: parsed.data.eventType,
        variant: parsed.data.variant,
        surface: parsed.data.surface,
        sessionId: parsed.data.sessionId,
        action: parsed.data.action || null,
        href: parsed.data.href || null,
        label: parsed.data.label || null,
      },
    })

    if (!inserted.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: inserted.error || 'CTA event kaydedilemedi.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, stored: inserted.stored })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'CTA event kaydı sırasında beklenmeyen bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
