#!/usr/bin/env node

const baseUrl = (process.env.PRODUCTION_BASE_URL || 'https://cebindegaleri.com').replace(/\/$/, '')
const maxLatencyMs = Number.parseInt(process.env.MONITOR_MAX_LATENCY_MS || '3500', 10)
const requestTimeoutMs = Number.parseInt(process.env.MONITOR_REQUEST_TIMEOUT_MS || '8000', 10)
const loginFailSpikeThreshold = Number.parseInt(process.env.MONITOR_LOGIN_FAIL_SPIKE_THRESHOLD || '25', 10)
const uploadErrorThreshold = Number.parseInt(process.env.MONITOR_UPLOAD_ERROR_THRESHOLD || '5', 10)
const storageDeleteFailureThreshold = Number.parseInt(process.env.MONITOR_STORAGE_DELETE_FAILURE_THRESHOLD || '1', 10)
const qrApiErrorThreshold = Number.parseInt(process.env.MONITOR_QR_API_ERROR_THRESHOLD || '5', 10)
const leadApiErrorThreshold = Number.parseInt(process.env.MONITOR_LEAD_API_ERROR_THRESHOLD || '5', 10)
const contactApiErrorThreshold = Number.parseInt(process.env.MONITOR_CONTACT_API_ERROR_THRESHOLD || '5', 10)
const nodeLeakFailureThreshold = Number.parseInt(process.env.MONITOR_NODE_LEAK_FAILURE_THRESHOLD || '1', 10)
const monitorWebhookUrl = process.env.MONITOR_ALERT_WEBHOOK_URL || ''
const monitorSharedKey = process.env.MONITOR_SHARED_KEY || ''

const checks = [
  { path: '/api/health', method: 'GET', expected: [200] },
  { path: '/api/auth/session', method: 'GET', expected: [401] },
  { path: '/api/landing/cta-config', method: 'GET', expected: [200] },
  {
    path: '/api/public/geocode',
    method: 'POST',
    expected: [200, 400, 404],
    body: { query: 'Istanbul' },
  },
]

function clip(value, length = 300) {
  if (value.length <= length) return value
  return `${value.slice(0, length)}...`
}

async function fetchWithTimer(input) {
  const method = input.method || 'GET'
  const body = input.body === undefined ? undefined : JSON.stringify(input.body)
  const url = `${baseUrl}${input.path}`
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const headers = {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(monitorSharedKey ? { 'x-monitor-key': monitorSharedKey } : {}),
    }

    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers,
      body,
      signal: controller.signal,
    })
    const text = await response.text()
    return {
      url,
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body: text,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function sendAlertIfNeeded(payload) {
  if (!monitorWebhookUrl) return
  try {
    await fetch(monitorWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Do not hide original failure due webhook issues.
  }
}

function pushCounterFailure(failures, input) {
  const threshold = Number.isFinite(input.threshold) ? input.threshold : 0
  if (threshold <= 0) return

  const value = Number(input.value || 0)
  if (Number.isFinite(value) && value >= threshold) {
    failures.push({
      path: '/api/health',
      reason: input.reason,
      value,
      threshold,
    })
  }
}

async function main() {
  const results = []
  const failures = []

  for (const check of checks) {
    try {
      const result = await fetchWithTimer(check)
      results.push(result)

      const statusOk = check.expected.includes(result.status)
      const speedOk = result.durationMs <= maxLatencyMs
      if (!statusOk || !speedOk) {
        failures.push({
          path: check.path,
          status: result.status,
          durationMs: result.durationMs,
          reason: !statusOk ? 'unexpected_status' : 'slow_response',
          body: clip(result.body),
        })
      }
    } catch (error) {
      failures.push({
        path: check.path,
        reason: 'request_failed',
        detail: error instanceof Error ? error.message : 'unknown_error',
      })
    }
  }

  const healthResult = results.find((result) => result.url.endsWith('/api/health'))
  if (healthResult) {
    try {
      const parsed = JSON.parse(healthResult.body || '{}')
      const health = parsed?.monitor?.health || {}
      pushCounterFailure(failures, {
        reason: 'login_fail_spike',
        value: health.loginFailuresInWindow,
        threshold: loginFailSpikeThreshold,
      })
      pushCounterFailure(failures, {
        reason: 'upload_error_spike',
        value: health.uploadErrors24h,
        threshold: uploadErrorThreshold,
      })
      pushCounterFailure(failures, {
        reason: 'storage_delete_failure',
        value: health.storageDeleteFailures24h,
        threshold: storageDeleteFailureThreshold,
      })
      pushCounterFailure(failures, {
        reason: 'qr_api_error_spike',
        value: health.qrApiErrors24h,
        threshold: qrApiErrorThreshold,
      })
      pushCounterFailure(failures, {
        reason: 'lead_api_error_spike',
        value: health.leadApiErrors24h,
        threshold: leadApiErrorThreshold,
      })
      pushCounterFailure(failures, {
        reason: 'contact_api_error_spike',
        value: health.contactApiErrors24h,
        threshold: contactApiErrorThreshold,
      })
      pushCounterFailure(failures, {
        reason: 'node_leak_failure',
        value: health.nodeLeakFailures24h,
        threshold: nodeLeakFailureThreshold,
      })
    } catch {
      failures.push({
        path: '/api/health',
        reason: 'invalid_health_payload',
      })
    }
  }

  const report = {
    ok: failures.length === 0,
    baseUrl,
    generatedAt: new Date().toISOString(),
    maxLatencyMs,
    thresholds: {
      loginFailSpikeThreshold,
      uploadErrorThreshold,
      storageDeleteFailureThreshold,
      qrApiErrorThreshold,
      leadApiErrorThreshold,
      contactApiErrorThreshold,
      nodeLeakFailureThreshold,
    },
    checks: results.map((item) => ({
          url: item.url,
          method: item.method,
      status: item.status,
      durationMs: item.durationMs,
    })),
    failures,
  }

  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    await sendAlertIfNeeded({
      text: '[AutoQrent] Production monitor failed',
      report,
    })
    process.exit(1)
  }
}

main().catch(async (error) => {
  const report = {
    ok: false,
    baseUrl,
    generatedAt: new Date().toISOString(),
    failures: [
      {
        reason: 'monitor_runtime_error',
        detail: error instanceof Error ? error.message : 'unknown_error',
      },
    ],
  }
  console.log(JSON.stringify(report, null, 2))
  await sendAlertIfNeeded({
    text: '[AutoQrent] Production monitor runtime failure',
    report,
  })
  process.exit(1)
})
