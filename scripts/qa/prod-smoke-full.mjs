#!/usr/bin/env node

const baseUrl = (process.env.PRODUCTION_BASE_URL || 'https://cebindegaleri.com').replace(/\/$/, '')
const wwwBaseUrl = (process.env.PRODUCTION_WWW_BASE_URL || 'https://www.cebindegaleri.com').replace(/\/$/, '')
const requestTimeoutMs = Number.parseInt(process.env.PROD_SMOKE_REQUEST_TIMEOUT_MS || '8000', 10)
const maxLatencyMs = Number.parseInt(process.env.PROD_SMOKE_MAX_LATENCY_MS || '6000', 10)
const smokeEmail = process.env.SMOKE_TEST_EMAIL || ''
const smokePassword = process.env.SMOKE_TEST_PASSWORD || ''
const sessionCookieName = process.env.SMOKE_SESSION_COOKIE_NAME || 'autoqrent_panel_session'
const monitorSharedKey = process.env.MONITOR_SHARED_KEY || ''
const requireAuthenticatedSmoke = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.PROD_SMOKE_REQUIRE_AUTH || '').trim().toLowerCase(),
)

const commonHeaders = monitorSharedKey ? { 'x-monitor-key': monitorSharedKey } : {}
const panelReadEndpoints = [
  '/api/panel/vehicles',
  '/api/panel/leads',
  '/api/panel/qr-codes',
  '/api/panel/settings',
  '/api/panel/alerts',
  '/api/panel/audit-logs?limit=5',
  '/api/panel/analytics/overview?range=7days',
  '/api/panel/analytics/funnel?range=7days',
  '/api/panel/analytics/showroom?range=7days',
  '/api/panel/analytics/landing?range=7days',
  '/api/panel/analytics/landing-config',
  '/api/panel/subscription',
  '/api/panel/uploads/vehicle-images/quota',
]

const planGatedPanelReadEndpoints = new Set([
  '/api/panel/analytics/showroom?range=7days',
  '/api/panel/analytics/landing?range=7days',
  '/api/panel/analytics/landing-config',
])

function clip(value, length = 320) {
  if (!value) return ''
  if (value.length <= length) return value
  return `${value.slice(0, length)}...`
}

function headersToObject(headers) {
  const out = {}
  for (const [key, value] of headers.entries()) {
    out[key] = value
  }
  return out
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

function extractSessionCookie(rawSetCookie, cookieName) {
  if (!rawSetCookie) return ''
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = rawSetCookie.match(new RegExp(`${escaped}=[^;]+`))
  return match ? match[0] : ''
}

function extractCookieValue(cookie, cookieName) {
  const prefix = `${cookieName}=`
  if (!cookie.startsWith(prefix)) return ''
  return cookie.slice(prefix.length)
}

function encryptedPanelCookieOk(cookie, cookieName) {
  const cookieValue = extractCookieValue(cookie, cookieName)
  const parts = cookieValue.split('.')
  const base64UrlPart = /^[A-Za-z0-9_-]+$/

  return (
    parts.length === 5
    && parts[0] === 'v2'
    && parts.slice(1).every((part) => base64UrlPart.test(part))
    && !cookieValue.includes('access_token')
    && !cookieValue.includes('refresh_token')
  )
}

async function request(input) {
  const method = input.method || 'GET'
  const body = input.body === undefined ? undefined : JSON.stringify(input.body)
  const targetBaseUrl = input.baseUrl || baseUrl
  const url = `${targetBaseUrl}${normalizePath(input.path)}`
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        accept: 'application/json,text/html,text/plain,*/*',
        ...commonHeaders,
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(input.headers || {}),
      },
      body,
      signal: controller.signal,
    })
    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
    }
    return {
      label: input.label,
      url,
      path: input.path,
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
      headers: headersToObject(response.headers),
      text,
      data,
    }
  } finally {
    clearTimeout(timer)
  }
}

function statusMatches(status, expected) {
  return expected.includes(status)
}

async function runCheck(input, results, failures) {
  const expected = input.expected || [200]
  try {
    const result = await request(input)
    const statusOk = statusMatches(result.status, expected)
    const speedOk = result.durationMs <= (input.maxLatencyMs || maxLatencyMs)
    const payloadOk = input.validate ? input.validate(result) : true

    results.push({
      label: input.label,
      url: result.url,
      method: result.method,
      status: result.status,
      durationMs: result.durationMs,
      expected,
      ok: statusOk && speedOk && payloadOk,
    })

    if (!statusOk || !speedOk || !payloadOk) {
      failures.push({
        label: input.label,
        url: result.url,
        method: result.method,
        status: result.status,
        durationMs: result.durationMs,
        expected,
        reason: !statusOk ? 'unexpected_status' : !speedOk ? 'slow_response' : 'invalid_payload',
        body: clip(result.text),
      })
    }

    return result
  } catch (error) {
    failures.push({
      label: input.label,
      path: input.path,
      method: input.method || 'GET',
      reason: 'request_failed',
      detail: error instanceof Error ? error.message : 'unknown_error',
    })
    return null
  }
}

function healthPayloadOk(result) {
  return result.data?.ok === true
}

function protectedMonitorPayloadOk(result) {
  return result.data?.ok === false && result.data?.message === 'Monitor erişimi yetkisiz.'
}

function jsonOk(expected) {
  return (result) => result.data?.ok === expected
}

function panelReadEndpointOk(endpoint) {
  return (result) => {
    if (result.status === 403 && planGatedPanelReadEndpoints.has(endpoint)) {
      return (
        result.data?.ok === false
        && result.data?.code === 'feature_locked'
        && result.data?.feature === 'analytics.advanced'
        && result.data?.redirectTo === '/panel/ayarlar?tab=subscription'
      )
    }

    return result.data?.ok === true
  }
}

function safeCredentialErrorOk(result) {
  const message = String(result.data?.message || '')
  return (
    result.data?.ok === false
    && message.includes('E-posta veya şifre hatalı')
    && !message.toLowerCase().includes('invalid login credentials')
    && !result.text.toLowerCase().includes('invalid login credentials')
  )
}

function svgQrOk(result) {
  const contentType = getHeader(result, 'content-type').toLowerCase()
  return (
    contentType.includes('image/svg+xml')
    && result.text.includes('<svg')
    && result.text.includes('<path')
  )
}

function panelSettingsShowroomOk(result) {
  const slug = String(result.data?.settings?.slug || '')
  const publicShowroomUrl = String(result.data?.settings?.publicShowroomUrl || '')
  const activeVehicleCount = result.data?.settings?.activeVehicleCount

  return (
    result.data?.ok === true
    && /^[a-z0-9-]+-[a-f0-9]{32}$/.test(slug)
    && publicShowroomUrl === `${baseUrl}/showroom/${slug}`
    && Number.isInteger(activeVehicleCount)
  )
}

function getHeader(result, name) {
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(result.headers || {})) {
    if (key.toLowerCase() === target) return String(value)
  }
  return ''
}

function securityHeadersOk(result) {
  const csp = getHeader(result, 'content-security-policy')
  const hsts = getHeader(result, 'strict-transport-security')
  const contentTypeOptions = getHeader(result, 'x-content-type-options')
  const frameOptions = getHeader(result, 'x-frame-options')
  const referrerPolicy = getHeader(result, 'referrer-policy')
  const permissionsPolicy = getHeader(result, 'permissions-policy')

  return (
    csp.includes("default-src 'self'")
    && csp.includes("object-src 'none'")
    && csp.includes("frame-ancestors 'none'")
    && !csp.includes("'unsafe-eval'")
    && hsts.includes('max-age=63072000')
    && hsts.includes('includeSubDomains')
    && contentTypeOptions.toLowerCase() === 'nosniff'
    && frameOptions.toUpperCase() === 'DENY'
    && referrerPolicy === 'strict-origin-when-cross-origin'
    && permissionsPolicy.includes('camera=()')
    && permissionsPolicy.includes('microphone=()')
  )
}

async function runPublicChecks(results, failures) {
  const publicChecks = [
    {
      label: 'root health',
      path: '/api/health',
      expected: monitorSharedKey ? [200] : [401],
      validate: monitorSharedKey ? healthPayloadOk : protectedMonitorPayloadOk,
    },
    {
      label: 'www health',
      baseUrl: wwwBaseUrl,
      path: '/api/health',
      expected: monitorSharedKey ? [200] : [401],
      validate: monitorSharedKey ? healthPayloadOk : protectedMonitorPayloadOk,
    },
    {
      label: 'home page',
      path: '/',
      expected: [200],
    },
    {
      label: 'security headers present',
      path: '/',
      expected: [200],
      validate: securityHeadersOk,
    },
    {
      label: 'login page',
      path: '/giris',
      expected: [200],
    },
    {
      label: 'register page',
      path: '/kayit',
      expected: [200],
    },
    {
      label: 'sitemap',
      path: '/sitemap.xml',
      expected: [200],
    },
    {
      label: 'robots',
      path: '/robots.txt',
      expected: [200],
    },
    {
      label: 'landing CTA config',
      path: '/api/landing/cta-config',
      expected: [200],
      validate: healthPayloadOk,
    },
    {
      label: 'auth session requires login',
      path: '/api/auth/session',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'invalid login payload rejected',
      path: '/api/auth/login',
      method: 'POST',
      expected: [400],
      body: {},
      validate: jsonOk(false),
    },
    {
      label: 'invalid login credentials use Turkish safe copy',
      path: '/api/auth/login',
      method: 'POST',
      expected: [401],
      body: {
        email: 'not-a-real-smoke-user@cebindegaleri.com',
        password: 'WrongPassword123!',
      },
      validate: safeCredentialErrorOk,
    },
    {
      label: 'cross-site auth login blocked',
      path: '/api/auth/login',
      method: 'POST',
      expected: [403],
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      },
      body: {
        email: 'smoke@example.com',
        password: 'invalid-smoke-password',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin session requires admin login',
      path: '/api/admin/session',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin users requires admin login',
      path: '/api/admin/users',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin dashboard requires admin login',
      path: '/api/admin/dashboard',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin audit requires admin login',
      path: '/api/admin/audit',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin operations requires admin login',
      path: '/api/admin/operations',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin finance requires admin login',
      path: '/api/admin/finance',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin settings requires admin login',
      path: '/api/admin/settings',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin accounts requires admin login',
      path: '/api/admin/accounts',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin account create requires admin login',
      path: '/api/admin/accounts',
      method: 'POST',
      expected: [401],
      body: {
        username: 'smoke-admin',
        displayName: 'Smoke Admin',
        role: 'SUPPORT_AGENT',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin account update requires admin login',
      path: '/api/admin/accounts/demo-account',
      method: 'PATCH',
      expected: [401],
      body: {
        status: 'FROZEN',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin account delete requires admin login',
      path: '/api/admin/accounts/demo-account',
      method: 'DELETE',
      expected: [401],
      validate: jsonOk(false),
    },
    {
      label: 'admin moderation action requires admin login',
      path: '/api/admin/operations/moderation',
      method: 'POST',
      expected: [401],
      body: {
        reportId: 'audit-demo',
        status: 'WARNED',
        targetGallery: 'Demo',
        reason: 'Smoke',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin authorization requires admin login',
      path: '/api/admin/users/demo-user/authorization',
      method: 'POST',
      expected: [401],
      body: {
        role: 'owner',
        accessStatus: 'active',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin subscription requires admin login',
      path: '/api/admin/users/demo-user/subscription',
      method: 'POST',
      expected: [401],
      body: {
        plan: 'starter',
        status: 'trialing',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin password reset requires admin login',
      path: '/api/admin/users/demo-user/password-reset',
      method: 'POST',
      expected: [401],
      body: {},
      validate: jsonOk(false),
    },
    {
      label: 'admin email verification requires admin login',
      path: '/api/admin/users/demo-user/email-verification',
      method: 'POST',
      expected: [401],
      body: {},
      validate: jsonOk(false),
    },
    {
      label: 'admin user status requires admin login',
      path: '/api/admin/users/demo-user/status',
      method: 'POST',
      expected: [401],
      body: {
        status: 'FROZEN',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin delete requires admin login',
      path: '/api/admin/users/demo-user/delete',
      method: 'POST',
      expected: [401],
      body: {
        confirmEmail: 'demo@example.com',
      },
      validate: jsonOk(false),
    },
    {
      label: 'admin notifications requires admin login',
      path: '/api/admin/notifications',
      method: 'POST',
      expected: [401],
      body: {
        scope: 'bulk',
        channel: 'panel',
        title: 'Smoke',
        message: 'Smoke test',
      },
      validate: jsonOk(false),
    },
    {
      label: 'invalid admin login payload rejected',
      path: '/api/admin/login',
      method: 'POST',
      expected: [400],
      body: {},
      validate: jsonOk(false),
    },
    {
      label: 'invalid register payload rejected',
      path: '/api/auth/register',
      method: 'POST',
      expected: [400],
      body: {},
      validate: jsonOk(false),
    },
    {
      label: 'legacy vehicle route blocked',
      path: '/arac/demo',
      expected: [404],
    },
    {
      label: 'legacy showroom route blocked',
      path: '/showroom/demo',
      expected: [404],
    },
    {
      label: 'nonexistent secure vehicle route blocked',
      path: '/arac/smoke-yok-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      expected: [404],
    },
    {
      label: 'nonexistent secure showroom route blocked',
      path: '/showroom/smoke-yok-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      expected: [404],
    },
    {
      label: 'invalid QR event route token rejected',
      path: '/api/public/vehicle-events',
      method: 'POST',
      expected: [400],
      body: { vehicleRouteId: 'demo', source: 'qr' },
      validate: jsonOk(false),
    },
    {
      label: 'invalid vehicle lead route token rejected',
      path: '/api/vehicle-lead',
      method: 'POST',
      expected: [400],
      body: {
        name: 'Smoke User',
        phone: '05300000000',
        vehicleId: 'demo',
        vehicleTitle: 'Smoke Vehicle',
        formStartedAt: 1,
      },
      validate: jsonOk(false),
    },
    {
      label: 'cross-site contact blocked',
      path: '/api/contact',
      method: 'POST',
      expected: [403],
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      },
      body: {
        name: 'Smoke User',
        email: 'smoke@example.com',
        subject: 'Smoke test',
        message: 'Cross-site smoke test should be blocked before processing.',
        formStartedAt: Date.now() - 5000,
      },
      validate: jsonOk(false),
    },
    {
      label: 'QA cleanup endpoint disabled or protected',
      path: '/api/cron/cleanup-qa-test-data?dryRun=1',
      method: 'POST',
      expected: [401, 404],
      headers: { authorization: 'Bearer invalid-smoke-token-do-not-use' },
    },
    {
      label: 'public slug rotation endpoint disabled or protected',
      path: '/api/cron/rotate-public-slugs?dryRun=1',
      method: 'POST',
      expected: [401, 404],
      headers: { authorization: 'Bearer invalid-smoke-token-do-not-use' },
    },
    {
      label: 'uploaded asset cleanup cron protected',
      path: '/api/cron/cleanup-uploaded-assets?dryRun=1',
      method: 'GET',
      expected: [401],
      headers: { authorization: 'Bearer invalid-smoke-token-do-not-use' },
    },
  ]

  for (const check of publicChecks) {
    await runCheck(check, results, failures)
  }
}

async function runUnauthenticatedPanelChecks(results, failures) {
  for (const endpoint of panelReadEndpoints) {
    await runCheck(
      {
        label: `unauth panel protected ${endpoint}`,
        path: endpoint,
        expected: [401],
        validate: jsonOk(false),
      },
      results,
      failures,
    )
  }

  await runCheck(
    {
      label: 'unauth vehicle image upload protected',
      path: '/api/panel/uploads/vehicle-images',
      method: 'POST',
      expected: [401],
      body: {},
      validate: jsonOk(false),
    },
    results,
    failures,
  )
}

async function runAuthenticatedPanelChecks(results, failures) {
  if (!smokeEmail || !smokePassword) {
    if (requireAuthenticatedSmoke) {
      failures.push({
        label: 'auth smoke credentials',
        reason: 'missing_required_smoke_credentials',
        detail: 'PROD_SMOKE_REQUIRE_AUTH=1 but SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD are not set.',
      })
    }

    return {
      enabled: false,
      required: requireAuthenticatedSmoke,
      reason: 'SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD not set',
    }
  }

  const login = await runCheck(
    {
      label: 'auth smoke login',
      path: '/api/auth/login',
      method: 'POST',
      expected: [200],
      body: {
        email: smokeEmail,
        password: smokePassword,
      },
      validate: jsonOk(true),
    },
    results,
    failures,
  )

  const cookie = extractSessionCookie(login?.headers?.['set-cookie'] || '', sessionCookieName)
  if (!cookie) {
    failures.push({
      label: 'auth smoke session cookie',
      reason: 'missing_session_cookie',
    })
    return {
      enabled: true,
      required: requireAuthenticatedSmoke,
      cookie: false,
    }
  }

  const encryptedCookie = encryptedPanelCookieOk(cookie, sessionCookieName)
  results.push({
    label: 'auth smoke encrypted panel cookie',
    url: `${baseUrl}/api/auth/login`,
    method: 'POST',
    status: encryptedCookie ? 200 : 500,
    durationMs: 0,
    expected: [200],
    ok: encryptedCookie,
  })

  if (!encryptedCookie) {
    failures.push({
      label: 'auth smoke encrypted panel cookie',
      reason: 'panel_cookie_not_encrypted_v2',
      detail: 'Panel session cookie must use the encrypted v2 envelope.',
    })
  }

  const authHeaders = { cookie }
  const endpoints = [
    {
      label: 'auth panel /api/auth/session',
      path: '/api/auth/session',
      validate: (result) => result.data?.ok === true && result.data?.session?.email === smokeEmail,
    },
    ...panelReadEndpoints.map((endpoint) => ({
      label: `auth panel ${endpoint}`,
      path: endpoint,
      expected: planGatedPanelReadEndpoints.has(endpoint) ? [200, 403] : [200],
      validate: panelReadEndpointOk(endpoint),
    })),
  ]

  for (const endpoint of endpoints) {
    await runCheck(
      {
        label: endpoint.label,
        path: endpoint.path,
        expected: endpoint.expected || [200],
        headers: authHeaders,
        validate: endpoint.validate,
      },
      results,
      failures,
    )
  }

  await runCheck(
    {
      label: 'auth panel settings exposes gallery showroom url',
      path: '/api/panel/settings',
      expected: [200],
      headers: authHeaders,
      validate: panelSettingsShowroomOk,
    },
    results,
    failures,
  )

  const smokeQrVehicleUrl = `${baseUrl}/arac/smoke-arac-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?src=qr`
  await runCheck(
    {
      label: 'auth panel qr image generates real svg',
      path: `/api/panel/qr-image?url=${encodeURIComponent(smokeQrVehicleUrl)}&size=192`,
      expected: [200],
      headers: authHeaders,
      validate: svgQrOk,
    },
    results,
    failures,
  )

  const insecureQrVehicleUrl = `${baseUrl}/arac/demo?src=qr`
  await runCheck(
    {
      label: 'auth panel qr image rejects legacy route',
      path: `/api/panel/qr-image?url=${encodeURIComponent(insecureQrVehicleUrl)}&size=192`,
      expected: [400],
      headers: authHeaders,
      validate: jsonOk(false),
    },
    results,
    failures,
  )

  await runCheck(
    {
      label: 'auth smoke logout',
      path: '/api/auth/logout',
      method: 'POST',
      expected: [200],
      headers: authHeaders,
      validate: jsonOk(true),
    },
    results,
    failures,
  )

  return {
    enabled: true,
    required: requireAuthenticatedSmoke,
    cookie: true,
    panelEndpointCount: panelReadEndpoints.length,
  }
}

async function main() {
  const results = []
  const failures = []

  await runPublicChecks(results, failures)
  await runUnauthenticatedPanelChecks(results, failures)
  const authenticated = await runAuthenticatedPanelChecks(results, failures)

  const report = {
    ok: failures.length === 0,
    baseUrl,
    wwwBaseUrl,
    generatedAt: new Date().toISOString(),
    requestTimeoutMs,
    maxLatencyMs,
    requireAuthenticatedSmoke,
    authenticated,
    checks: results,
    failures,
  }

  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        reason: 'prod_smoke_runtime_error',
        detail: error instanceof Error ? error.message : 'unknown_error',
      },
      null,
      2,
    ),
  )
  process.exit(1)
})
