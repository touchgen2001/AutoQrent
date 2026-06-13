import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

import { hasSupabaseAdmin, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

type BotCheckResult = {
  blocked: boolean
  score: number
  reasons: string[]
}

const RATE_LIMIT_STORE_KEY = '__AUTOQRENT_RATE_LIMIT_STORE__'
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const DEFAULT_TRUSTED_ORIGINS = ['https://cebindegaleri.com', 'https://www.cebindegaleri.com']

function getRateLimitStore() {
  const globalScope = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitEntry>
  }

  if (!globalScope[RATE_LIMIT_STORE_KEY]) {
    globalScope[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>()
  }

  return globalScope[RATE_LIMIT_STORE_KEY]
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value.trim()).origin.toLowerCase()
  } catch {
    return null
  }
}

function splitOrigins(value: string | undefined) {
  if (!value) return []
  return value
    .split(/[\s,]+/)
    .map((item) => normalizeOrigin(item))
    .filter((item): item is string => Boolean(item))
}

function requestHostOrigin(request: Request) {
  const url = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim() || url.host
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || url.protocol.replace(':', '') || 'https'

  if (!host) return null
  return normalizeOrigin(`${protocol}://${host}`)
}

function isDevelopmentRuntime() {
  return process.env.NODE_ENV !== 'production'
}

export function getTrustedMutationOrigins(request: Request) {
  const origins = new Set<string>()
  const requestOrigin = normalizeOrigin(request.url)
  const hostOrigin = requestHostOrigin(request)

  for (const origin of [
    requestOrigin,
    hostOrigin,
    ...DEFAULT_TRUSTED_ORIGINS,
    ...splitOrigins(process.env.NEXT_PUBLIC_SITE_URL),
    ...splitOrigins(process.env.PRODUCTION_BASE_URL),
    ...splitOrigins(process.env.PRODUCTION_WWW_BASE_URL),
    ...splitOrigins(process.env.TRUSTED_MUTATION_ORIGINS),
  ]) {
    if (origin) origins.add(origin)
  }

  if (isDevelopmentRuntime()) {
    origins.add('http://localhost:3000')
    origins.add('http://127.0.0.1:3000')
  }

  return origins
}

export function isTrustedMutationOrigin(request: Request) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true

  const secFetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase()
  if (secFetchSite === 'cross-site') return false

  const trustedOrigins = getTrustedMutationOrigins(request)
  const origin = normalizeOrigin(request.headers.get('origin'))
  if (origin) return trustedOrigins.has(origin)

  const refererOrigin = normalizeOrigin(request.headers.get('referer'))
  if (refererOrigin) return trustedOrigins.has(refererOrigin)

  return true
}

export function trustedMutationOriginResponse(request: Request) {
  if (isTrustedMutationOrigin(request)) return null

  return NextResponse.json(
    {
      ok: false,
      error: 'untrusted_origin',
      message: 'Bu işlem güvenlik nedeniyle engellendi.',
    },
    { status: 403 },
  )
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

export function hashForStorage(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function checkLocalRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const store = getRateLimitStore()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existing.count >= limit) {
    const msLeft = Math.max(existing.resetAt - now, 0)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil(msLeft / 1000), 1),
    }
  }

  existing.count += 1
  store.set(key, existing)

  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
  }
}

type DistributedRateLimitRow = {
  allowed: boolean
  remaining: number
  retry_after_seconds: number
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  if (hasSupabaseAdmin()) {
    try {
      const keyHash = hashForStorage(options.key)
      const rows = await supabaseAdminFetch<DistributedRateLimitRow[]>({
        method: 'POST',
        path: '/rest/v1/rpc/consume_request_rate_limit',
        body: {
          p_key_hash: keyHash,
          p_limit: options.limit,
          p_window_seconds: Math.max(Math.ceil(options.windowMs / 1000), 1),
        },
      })
      const row = rows[0]
      if (row) {
        return {
          allowed: row.allowed,
          remaining: row.remaining,
          retryAfterSeconds: row.retry_after_seconds,
        }
      }
    } catch {
      // Keep a local fail-safe so auth and public forms remain protected during
      // a short database outage. The shared database counter is the primary gate.
    }
  }

  return checkLocalRateLimit(options)
}

export function estimateBotRisk(request: Request, textFields: string[] = []): BotCheckResult {
  const reasons: string[] = []
  let score = 0

  const userAgent = (request.headers.get('user-agent') || '').toLowerCase()
  const acceptLanguage = request.headers.get('accept-language')
  const secFetchSite = request.headers.get('sec-fetch-site')
  const secChUa = request.headers.get('sec-ch-ua')

  if (!userAgent) {
    score += 40
    reasons.push('missing_user_agent')
  } else if (/(bot|crawler|spider|curl|wget|python-requests|httpclient)/i.test(userAgent)) {
    score += 80
    reasons.push('automated_user_agent')
  }

  if (!acceptLanguage) {
    score += 10
    reasons.push('missing_accept_language')
  }

  if (!secFetchSite) {
    score += 8
    reasons.push('missing_sec_fetch_site')
  }

  if (!secChUa) {
    score += 8
    reasons.push('missing_sec_ch_ua')
  }

  const payloadText = textFields.join(' ').toLowerCase()
  const linksInPayload = (payloadText.match(/https?:\/\//g) || []).length
  if (linksInPayload >= 3) {
    score += 25
    reasons.push('too_many_links')
  }

  if (/(viagra|casino|forex|seo service|backlink|porn)/i.test(payloadText)) {
    score += 50
    reasons.push('spam_keywords')
  }

  return {
    blocked: score >= 70,
    score,
    reasons,
  }
}
