import * as Sentry from '@sentry/nextjs'

type CriticalFailureInput = {
  area: string
  route: string
  message: string
  status?: number
  error?: unknown
  metadata?: Record<string, string | number | boolean | null>
}

function clipped(value: string, max = 240) {
  return value.length <= max ? value : `${value.slice(0, max)}...`
}

function safePayload(input: CriticalFailureInput) {
  return {
    area: clipped(input.area, 80),
    route: clipped(input.route, 180),
    status: input.status ?? 500,
    message: clipped(input.message),
    metadata: input.metadata || {},
  }
}

export function captureCriticalFailure(input: CriticalFailureInput) {
  const payload = safePayload(input)

  Sentry.withScope((scope) => {
    scope.setLevel('error')
    scope.setTag('operational_area', payload.area)
    scope.setTag('api_route', payload.route)
    scope.setTag('http_status', String(payload.status))
    scope.setContext('operational_failure', payload)

    if (input.error instanceof Error) {
      Sentry.captureException(input.error)
      return
    }

    Sentry.captureMessage(`[${payload.area}] ${payload.message}`, 'error')
  })
}

export async function reportCriticalFailure(input: CriticalFailureInput) {
  captureCriticalFailure(input)

  const webhookUrl = (process.env.MONITOR_ALERT_WEBHOOK_URL || '').trim()
  if (!webhookUrl) return { webhookSent: false }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `[Cebindegaleri] Kritik hata: ${input.area}`,
        report: safePayload(input),
      }),
      cache: 'no-store',
    })

    return { webhookSent: response.ok }
  } catch {
    return { webhookSent: false }
  }
}
