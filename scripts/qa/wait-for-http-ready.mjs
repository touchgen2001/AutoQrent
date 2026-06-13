#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || process.env.PRODUCTION_BASE_URL || 'https://cebindegaleri.com'
const pathName = process.env.WAIT_READY_PATH || '/api/health'
const timeoutMs = Number.parseInt(process.env.WAIT_READY_TIMEOUT_MS || '300000', 10)
const intervalMs = Number.parseInt(process.env.WAIT_READY_INTERVAL_MS || '5000', 10)
const requestTimeoutMs = Number.parseInt(process.env.WAIT_READY_REQUEST_TIMEOUT_MS || '8000', 10)
const monitorSharedKey = process.env.MONITOR_SHARED_KEY || ''

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestOnce(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: monitorSharedKey ? { 'x-monitor-key': monitorSharedKey } : undefined,
      signal: controller.signal,
    })
    return response.status
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const startedAt = Date.now()
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const url = `${normalizedBase}${pathName.startsWith('/') ? pathName : `/${pathName}`}`

  console.log(`[wait-for-http-ready] waiting for ${url}`)

  for (;;) {
    const elapsedMs = Date.now() - startedAt
    if (elapsedMs > timeoutMs) {
      throw new Error(`timeout: ${url} was not ready within ${timeoutMs}ms`)
    }

    try {
      const status = await requestOnce(url)
      if (status >= 200 && status < 500) {
        console.log(`[wait-for-http-ready] ready: status=${status} elapsed_ms=${elapsedMs}`)
        return
      }
      console.log(`[wait-for-http-ready] not ready: status=${status} elapsed_ms=${elapsedMs}`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error'
      console.log(`[wait-for-http-ready] not ready: ${reason} elapsed_ms=${elapsedMs}`)
    }

    await sleep(intervalMs)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'wait-for-http-ready failed')
  process.exit(1)
})
