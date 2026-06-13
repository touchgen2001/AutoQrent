import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import {
  checkRateLimit,
  estimateBotRisk,
  getClientIp,
  trustedMutationOriginResponse,
} from '@/lib/security/request-guards'

export const runtime = 'nodejs'

const payloadSchema = z.object({
  eventType: z.enum([
    'registration_view',
    'registration_submit',
    'registration_success',
    'onboarding_view',
    'onboarding_step',
    'onboarding_complete',
    'onboarding_skip',
  ]),
  sessionId: z.string().trim().min(3).max(120),
  pagePath: z.string().trim().startsWith('/').max(240),
  step: z.number().int().min(1).max(4).optional(),
  planCode: z.string().trim().max(40).optional(),
  billingInterval: z.string().trim().max(40).optional(),
})

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  try {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const rateLimit = await checkRateLimit({
      key: `registration-funnel:${ip}`,
      limit: 80,
      windowMs: 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: 'Çok fazla kayıt akışı analitik isteği gönderildi.' },
        { status: 429, headers: { 'retry-after': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const parsed = payloadSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? 'Geçersiz kayıt akışı analitik verisi.' },
        { status: 400 },
      )
    }

    const botRisk = estimateBotRisk(request, [
      parsed.data.eventType,
      parsed.data.sessionId,
      parsed.data.pagePath,
      String(parsed.data.step || ''),
    ])
    if (botRisk.blocked) {
      return NextResponse.json(
        { ok: false, message: 'Kayıt akışı analitik isteği güvenlik nedeniyle engellendi.' },
        { status: 403 },
      )
    }

    const inserted = await insertAuditLog({
      action: 'registration_funnel_event',
      entityType: 'marketing',
      entityId: `registration:${parsed.data.eventType}`,
      source: 'registration_funnel',
      ip,
      userAgent,
      metadata: {
        eventType: parsed.data.eventType,
        sessionId: parsed.data.sessionId,
        pagePath: parsed.data.pagePath,
        step: parsed.data.step || null,
        planCode: parsed.data.planCode || null,
        billingInterval: parsed.data.billingInterval || null,
      },
    })

    if (!inserted.ok) {
      return NextResponse.json(
        { ok: false, message: inserted.error || 'Kayıt akışı analitiği kaydedilemedi.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, stored: inserted.stored })
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Kayıt akışı analitiği sırasında beklenmeyen bir hata oluştu.' },
      { status: 500 },
    )
  }
}
