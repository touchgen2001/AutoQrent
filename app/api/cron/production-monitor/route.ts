import { NextResponse } from 'next/server'

import { reportCriticalFailure } from '@/lib/server/critical-error-reporter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type CheckResult = {
  label: string
  path: string
  status: number
  expected: number[]
  ok: boolean
  durationMs: number
}

function authorizeCronRequest(request: Request) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (!cronSecret) {
    return NextResponse.json({ ok: false, message: 'CRON_SECRET yapılandırılmamış.' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz cron çağrısı.' }, { status: 401 })
  }
  return null
}

function getBaseUrl() {
  return (process.env.PRODUCTION_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cebindegaleri.com').replace(/\/$/, '')
}

function extractSessionCookie(response: Response) {
  const raw = response.headers.get('set-cookie') || ''
  return raw.match(/autoqrent_panel_session=[^;]+/)?.[0] || ''
}

async function runCheck(input: {
  baseUrl: string
  label: string
  path: string
  expected: number[]
  init?: RequestInit
  validate?: (data: unknown) => boolean
}) {
  const startedAt = Date.now()
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    ...input.init,
    cache: 'no-store',
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  const result: CheckResult = {
    label: input.label,
    path: input.path,
    status: response.status,
    expected: input.expected,
    ok: input.expected.includes(response.status) && (!input.validate || input.validate(data)),
    durationMs: Date.now() - startedAt,
  }

  return { result, response, data }
}

export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request)
  if (unauthorized) return unauthorized

  const baseUrl = getBaseUrl()
  const monitorKey = (process.env.MONITOR_SHARED_KEY || '').trim()
  const smokeEmail = (process.env.SMOKE_TEST_EMAIL || '').trim()
  const smokePassword = process.env.SMOKE_TEST_PASSWORD || ''
  const checks: CheckResult[] = []

  try {
    const publicChecks = [
      {
        label: 'health',
        path: '/api/health',
        expected: [200],
        init: monitorKey ? { headers: { 'x-monitor-key': monitorKey } } : undefined,
      },
      { label: 'auth boundary', path: '/api/auth/session', expected: [401] },
      { label: 'landing config', path: '/api/landing/cta-config', expected: [200] },
    ]

    for (const check of publicChecks) {
      const output = await runCheck({ baseUrl, ...check })
      checks.push(output.result)
    }

    if (!smokeEmail || !smokePassword) {
      checks.push({
        label: 'authenticated smoke credentials',
        path: '/api/auth/login',
        status: 0,
        expected: [200],
        ok: false,
        durationMs: 0,
      })
    } else {
      const login = await runCheck({
        baseUrl,
        label: 'persistent QA login',
        path: '/api/auth/login',
        expected: [200],
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
        },
        validate: (data) => Boolean(data && typeof data === 'object' && 'ok' in data && data.ok === true),
      })
      checks.push(login.result)

      const cookie = extractSessionCookie(login.response)
      if (!cookie) {
        checks.push({
          label: 'persistent QA session cookie',
          path: '/api/auth/login',
          status: login.response.status,
          expected: [200],
          ok: false,
          durationMs: 0,
        })
      } else {
        for (const check of [
          { label: 'panel session', path: '/api/auth/session' },
          { label: 'panel vehicles', path: '/api/panel/vehicles' },
          { label: 'panel QR', path: '/api/panel/qr-codes' },
          { label: 'panel analytics', path: '/api/panel/analytics/overview?range=7days' },
        ]) {
          const output = await runCheck({
            baseUrl,
            ...check,
            expected: [200],
            init: { headers: { cookie } },
          })
          checks.push(output.result)
        }

        const logout = await runCheck({
          baseUrl,
          label: 'persistent QA logout',
          path: '/api/auth/logout',
          expected: [200],
          init: {
            method: 'POST',
            headers: { cookie },
          },
        })
        checks.push(logout.result)
      }
    }

    const failures = checks.filter((check) => !check.ok)
    if (failures.length > 0) {
      await reportCriticalFailure({
        area: 'production_cron_monitor',
        route: '/api/cron/production-monitor',
        status: 500,
        message: `${failures.length} üretim kontrolü başarısız.`,
        metadata: {
          failureCount: failures.length,
          checkCount: checks.length,
        },
      })
    }

    return NextResponse.json(
      {
        ok: failures.length === 0,
        job: 'production-monitor',
        generatedAt: new Date().toISOString(),
        checkCount: checks.length,
        failures,
        checks,
      },
      { status: failures.length === 0 ? 200 : 500 },
    )
  } catch (error) {
    await reportCriticalFailure({
      area: 'production_cron_monitor',
      route: '/api/cron/production-monitor',
      status: 500,
      message: error instanceof Error ? error.message : 'Üretim cron monitor çalıştırılamadı.',
      error,
    })

    return NextResponse.json(
      {
        ok: false,
        job: 'production-monitor',
        message: 'Üretim kontrolü çalıştırılamadı.',
      },
      { status: 500 },
    )
  }
}
