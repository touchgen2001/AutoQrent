#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010'
const smokeEmail = process.env.SMOKE_TEST_EMAIL || ''
const smokePassword = process.env.SMOKE_TEST_PASSWORD || ''
const sessionCookieName = process.env.SMOKE_SESSION_COOKIE_NAME || 'autoqrent_panel_session'

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

function clip(value, length = 220) {
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

async function requestJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  } else {
    data = {}
  }

  return {
    status: response.status,
    data,
    text,
    headers: headersToObject(response.headers),
  }
}

function assertStatus(label, actual, expected) {
  if (actual !== expected) {
    fail(`${label} expected HTTP ${expected}, got ${actual}`)
  }
}

function assertOk(label, data, expected) {
  if (!data || data.ok !== expected) {
    fail(`${label} expected ok=${expected}. payload=${clip(JSON.stringify(data || {}))}`)
  }
}

function extractSessionCookie(rawSetCookie, cookieName) {
  if (!rawSetCookie) return ''
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = rawSetCookie.match(new RegExp(`${escaped}=[^;]+`))
  return match ? match[0] : ''
}

async function unauthenticatedSmoke() {
  const session = await requestJson('/api/auth/session')
  assertStatus('GET /api/auth/session (unauth)', session.status, 401)
  assertOk('GET /api/auth/session (unauth)', session.data, false)

  const badLogin = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  assertStatus('POST /api/auth/login with invalid payload', badLogin.status, 400)
  assertOk('POST /api/auth/login with invalid payload', badLogin.data, false)

  const badRegister = await requestJson('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  assertStatus('POST /api/auth/register with invalid payload', badRegister.status, 400)
  assertOk('POST /api/auth/register with invalid payload', badRegister.data, false)

  const panelEndpoints = [
    '/api/panel/vehicles',
    '/api/panel/leads',
    '/api/panel/analytics/overview',
  ]

  for (const endpoint of panelEndpoints) {
    const response = await requestJson(endpoint)
    assertStatus(`GET ${endpoint} (unauth)`, response.status, 401)
    assertOk(`GET ${endpoint} (unauth)`, response.data, false)
  }

  const logout = await requestJson('/api/auth/logout', { method: 'POST' })
  assertStatus('POST /api/auth/logout (unauth)', logout.status, 200)
  assertOk('POST /api/auth/logout (unauth)', logout.data, true)
}

async function authenticatedSmoke() {
  if (!smokeEmail || !smokePassword) {
    console.log('[panel-api-smoke] SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD not set. Skipping authenticated checks.')
    return
  }

  const login = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: smokeEmail,
      password: smokePassword,
    }),
  })

  assertStatus('POST /api/auth/login (auth smoke)', login.status, 200)
  assertOk('POST /api/auth/login (auth smoke)', login.data, true)

  const cookie = extractSessionCookie(login.headers['set-cookie'] || '', sessionCookieName)
  if (!cookie) {
    fail('Login succeeded but session cookie was not returned.')
  }

  const authHeaders = {
    cookie,
  }

  const session = await requestJson('/api/auth/session', {
    headers: authHeaders,
  })
  assertStatus('GET /api/auth/session (auth)', session.status, 200)
  assertOk('GET /api/auth/session (auth)', session.data, true)

  const panelEndpoints = [
    '/api/panel/vehicles',
    '/api/panel/leads',
    '/api/panel/analytics/overview',
  ]

  for (const endpoint of panelEndpoints) {
    const response = await requestJson(endpoint, {
      headers: authHeaders,
    })
    assertStatus(`GET ${endpoint} (auth)`, response.status, 200)
    assertOk(`GET ${endpoint} (auth)`, response.data, true)
  }

  const logout = await requestJson('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders,
  })
  assertStatus('POST /api/auth/logout (auth)', logout.status, 200)
  assertOk('POST /api/auth/logout (auth)', logout.data, true)
}

async function main() {
  console.log(`[panel-api-smoke] baseUrl=${baseUrl}`)
  await unauthenticatedSmoke()
  await authenticatedSmoke()
  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        authenticatedChecks: Boolean(smokeEmail && smokePassword),
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : 'Unknown panel smoke failure')
})

