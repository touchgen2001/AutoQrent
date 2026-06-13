import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordLoginFailure } from '@/lib/security/ops-monitor'
import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { loginWithSupabase, setPanelSessionCookie } from '@/lib/server/panel-auth'
import { mapPanelAuthError } from '@/lib/server/panel-auth-errors'

export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin.'),
  password: z.string().trim().min(1, 'Şifre zorunludur.'),
})

export async function POST(request: Request) {
  const startedAt = Date.now()
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const limits = getSecurityLimits()
  const clientIp = getClientIp(request)
  const rateLimit = await checkRateLimit({
    key: `auth-login:${clientIp}`,
    limit: limits.authLogin.limit,
    windowMs: limits.authLogin.windowMs,
  })

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        ok: false,
        message: 'Çok fazla giriş denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.',
      },
      {
        status: 429,
        headers: {
          'retry-after': String(rateLimit.retryAfterSeconds),
        },
      },
    )
    recordLoginFailure()
    recordApiTiming({
      route: '/api/auth/login',
      method: 'POST',
      status: 429,
      durationMs: Date.now() - startedAt,
    })
    return response
  }

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const response = NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz giriş bilgileri.',
        },
        { status: 400 },
      )
      recordLoginFailure()
      recordApiTiming({
        route: '/api/auth/login',
        method: 'POST',
        status: 400,
        durationMs: Date.now() - startedAt,
      })
      return response
    }

    const session = await loginWithSupabase(parsed.data)

    const response = NextResponse.json({
      ok: true,
      session: {
        userId: session.userId,
        email: session.email,
        fullName: session.fullName,
        galleryId: session.galleryId,
        galleryName: session.galleryName,
        role: session.role,
        expiresAt: session.expiresAt,
      },
    })

    setPanelSessionCookie(response, session)
    recordApiTiming({
      route: '/api/auth/login',
      method: 'POST',
      status: 200,
      durationMs: Date.now() - startedAt,
    })
    return response
  } catch (error) {
    const mapped = mapPanelAuthError({
      error,
      fallbackMessage: 'Giriş yapılamadı.',
      defaultStatus: 401,
    })

    const response = NextResponse.json(
      {
        ok: false,
        message: mapped.message,
      },
      { status: mapped.status },
    )
    if (mapped.status >= 400) {
      recordLoginFailure()
    }
    recordApiError({
      route: '/api/auth/login',
      method: 'POST',
      status: mapped.status,
      message: mapped.message,
    })
    recordApiTiming({
      route: '/api/auth/login',
      method: 'POST',
      status: mapped.status,
      durationMs: Date.now() - startedAt,
    })
    return response
  }
}
