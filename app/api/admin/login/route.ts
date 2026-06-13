import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordLoginFailure } from '@/lib/security/ops-monitor'
import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { verifyAdminAccountCredentials } from '@/lib/server/admin-accounts-repository'
import { createAdminSession, setAdminSessionCookie, verifyAdminCredentials } from '@/lib/server/admin-auth'

const route = '/api/admin/login'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
})

function jsonResponse(input: {
  startedAt: number
  status: number
  body: Record<string, unknown>
  message?: string
}) {
  recordApiTiming({
    route,
    method: 'POST',
    status: input.status,
    durationMs: Date.now() - input.startedAt,
    area: 'auth',
  })

  if (input.status >= 500 || input.message) {
    recordApiError({
      route,
      method: 'POST',
      status: input.status,
      message: input.message || 'admin_login_error',
      area: 'auth',
    })
  }

  return NextResponse.json(input.body, { status: input.status })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const limits = getSecurityLimits()
  const clientIp = getClientIp(request)
  const rateLimit = await checkRateLimit({
    key: `admin-login:${clientIp}`,
    limit: Math.min(limits.authLogin.limit, 5),
    windowMs: limits.authLogin.windowMs,
  })

  if (!rateLimit.allowed) {
    recordLoginFailure()
    return jsonResponse({
      startedAt,
      status: 429,
      body: {
        ok: false,
        error: 'rate_limited',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      message: 'admin_login_rate_limited',
    })
  }

  const payload = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(payload)

  if (!parsed.success) {
    return jsonResponse({
      startedAt,
      status: 400,
      body: {
        ok: false,
        error: 'invalid_payload',
      },
    })
  }

  const dbVerified = await verifyAdminAccountCredentials({
    username: parsed.data.username,
    password: parsed.data.password,
    ip: clientIp,
    userAgent: request.headers.get('user-agent') || undefined,
  })
  if (dbVerified.ok) {
    const session = createAdminSession(dbVerified.username, {
      source: 'database',
      accountId: dbVerified.accountId,
      adminRole: dbVerified.adminRole,
      sessionRevokedAt: dbVerified.sessionRevokedAt,
    })
    const response = NextResponse.json({
      ok: true,
      session,
    })

    setAdminSessionCookie(response, session)
    recordApiTiming({
      route,
      method: 'POST',
      status: 200,
      durationMs: Date.now() - startedAt,
      area: 'auth',
    })

    return response
  }

  if (dbVerified.reason === 'account_disabled' || dbVerified.reason === 'account_locked') {
    recordLoginFailure()
    return jsonResponse({
      startedAt,
      status: 403,
      body: {
        ok: false,
        error: dbVerified.reason,
      },
      message: dbVerified.reason,
    })
  }

  const verified = verifyAdminCredentials(parsed.data)
  if (!verified.ok) {
    recordLoginFailure()
    return jsonResponse({
      startedAt,
      status: verified.reason === 'admin_auth_not_configured' ? 500 : 401,
      body: {
        ok: false,
        error: verified.reason,
      },
      message: verified.reason,
    })
  }

  const session = createAdminSession(verified.username)
  const response = NextResponse.json({
    ok: true,
    session,
  })

  setAdminSessionCookie(response, session)
  recordApiTiming({
    route,
    method: 'POST',
    status: 200,
    durationMs: Date.now() - startedAt,
    area: 'auth',
  })

  return response
}
