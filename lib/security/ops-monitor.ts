import { getSecurityLimits } from '@/lib/security/limits'

type TimedEvent = {
  route: string
  method: string
  status: number
  durationMs: number
  at: number
}

type ErrorEvent = {
  area?: OpsArea
  route: string
  method: string
  status: number
  message: string
  at: number
}

type OpsArea = 'auth' | 'contact' | 'lead' | 'node_leak' | 'qr' | 'storage_delete' | 'system' | 'upload'

type OperationalEvent = {
  area: OpsArea
  route: string
  method: string
  status: number
  ok: boolean
  message: string
  count: number
  durationMs: number | null
  at: number
}

type OpsMonitorStore = {
  loginFailures: number[]
  slowApiEvents: TimedEvent[]
  recentErrors: ErrorEvent[]
  operationalEvents: OperationalEvent[]
}

const OPS_MONITOR_KEY = '__AUTOQRENT_OPS_MONITOR__'
const MAX_EVENT_ITEMS = 300

function getStore(): OpsMonitorStore {
  const globalScope = globalThis as typeof globalThis & {
    [OPS_MONITOR_KEY]?: OpsMonitorStore
  }

  if (!globalScope[OPS_MONITOR_KEY]) {
    globalScope[OPS_MONITOR_KEY] = {
      loginFailures: [],
      slowApiEvents: [],
      recentErrors: [],
      operationalEvents: [],
    }
  }

  return globalScope[OPS_MONITOR_KEY]
}

function trimByTime(values: number[], maxAgeMs: number, now = Date.now()) {
  return values.filter((value) => now - value <= maxAgeMs)
}

function trimEvents<T extends { at: number }>(events: T[], maxAgeMs: number, now = Date.now()) {
  const filtered = events.filter((event) => now - event.at <= maxAgeMs)
  if (filtered.length <= MAX_EVENT_ITEMS) return filtered
  return filtered.slice(filtered.length - MAX_EVENT_ITEMS)
}

export function recordLoginFailure() {
  const now = Date.now()
  const limits = getSecurityLimits()
  const store = getStore()
  const next = trimByTime(store.loginFailures, limits.loginFailureSpikeWindowMs, now)
  next.push(now)
  store.loginFailures = next
}

export function getLoginFailureCountInWindow() {
  const now = Date.now()
  const limits = getSecurityLimits()
  const store = getStore()
  store.loginFailures = trimByTime(store.loginFailures, limits.loginFailureSpikeWindowMs, now)
  return store.loginFailures.length
}

export function recordApiTiming(input: {
  route: string
  method: string
  status: number
  durationMs: number
  area?: OpsArea
}) {
  const now = Date.now()
  const limits = getSecurityLimits()
  const store = getStore()

  if (input.durationMs >= limits.slowApiThresholdMs) {
    store.slowApiEvents = trimEvents(
      [
        ...store.slowApiEvents,
        {
          ...input,
          at: now,
        },
      ],
      24 * 60 * 60 * 1000,
      now,
    )
  }

  if (input.status >= 500) {
    store.recentErrors = trimEvents(
      [
        ...store.recentErrors,
        {
          route: input.route,
          method: input.method,
          status: input.status,
          area: input.area,
          message: 'server_error',
          at: now,
        },
      ],
      24 * 60 * 60 * 1000,
      now,
    )
  }
}

export function recordApiError(input: {
  route: string
  method: string
  status: number
  message: string
  area?: OpsArea
}) {
  const now = Date.now()
  const store = getStore()
  store.recentErrors = trimEvents(
    [
      ...store.recentErrors,
      {
        ...input,
        at: now,
      },
    ],
    24 * 60 * 60 * 1000,
    now,
  )
}

export function recordOperationalEvent(input: {
  area: OpsArea
  route: string
  method?: string
  status?: number
  ok: boolean
  message: string
  count?: number
  durationMs?: number | null
}) {
  const now = Date.now()
  const store = getStore()
  store.operationalEvents = trimEvents(
    [
      ...store.operationalEvents,
      {
        area: input.area,
        route: input.route,
        method: input.method || 'SYSTEM',
        status: input.status ?? (input.ok ? 200 : 500),
        ok: input.ok,
        message: input.message.slice(0, 240),
        count: input.count ?? 1,
        durationMs: input.durationMs ?? null,
        at: now,
      },
    ],
    24 * 60 * 60 * 1000,
    now,
  )
}

export function recordNodeLeakProbe(input: {
  ok: boolean
  label: string
  details?: string
}) {
  recordOperationalEvent({
    area: 'node_leak',
    route: 'scripts/qa/check-node-leaks.sh',
    method: 'CHECK',
    status: input.ok ? 200 : 500,
    ok: input.ok,
    message: input.ok ? input.label : `${input.label}: ${input.details || 'leftover_process_detected'}`,
  })
}

function countOperationalEvents(events: OperationalEvent[], area: OpsArea, ok?: boolean) {
  return events.filter((event) => event.area === area && (ok === undefined || event.ok === ok)).length
}

function summarizeOperationalEvents(events: OperationalEvent[]) {
  const areas: OpsArea[] = ['auth', 'contact', 'lead', 'node_leak', 'qr', 'storage_delete', 'system', 'upload']
  return areas.map((area) => {
    const areaEvents = events.filter((event) => event.area === area)
    return {
      area,
      total24h: areaEvents.length,
      failures24h: areaEvents.filter((event) => !event.ok || event.status >= 500).length,
      lastFailureAt: areaEvents
        .filter((event) => !event.ok || event.status >= 500)
        .at(-1)?.at ?? null,
    }
  })
}

export function getOpsSnapshot() {
  const limits = getSecurityLimits()
  const now = Date.now()
  const store = getStore()

  store.loginFailures = trimByTime(store.loginFailures, limits.loginFailureSpikeWindowMs, now)
  store.slowApiEvents = trimEvents(store.slowApiEvents, 24 * 60 * 60 * 1000, now)
  store.recentErrors = trimEvents(store.recentErrors, 24 * 60 * 60 * 1000, now)
  store.operationalEvents = trimEvents(store.operationalEvents, 24 * 60 * 60 * 1000, now)

  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    thresholds: {
      slowApiMs: limits.slowApiThresholdMs,
      loginFailureSpikeWindowMs: limits.loginFailureSpikeWindowMs,
      loginFailureSpikeThreshold: limits.loginFailureSpikeThreshold,
    },
    health: {
      loginFailuresInWindow: store.loginFailures.length,
      loginFailureSpike: store.loginFailures.length >= limits.loginFailureSpikeThreshold,
      slowApiCount24h: store.slowApiEvents.length,
      error5xxCount24h: store.recentErrors.filter((item) => item.status >= 500).length,
      uploadErrors24h: countOperationalEvents(store.operationalEvents, 'upload', false),
      storageDeleteFailures24h: countOperationalEvents(store.operationalEvents, 'storage_delete', false),
      qrApiErrors24h: countOperationalEvents(store.operationalEvents, 'qr', false),
      leadApiErrors24h: countOperationalEvents(store.operationalEvents, 'lead', false),
      contactApiErrors24h: countOperationalEvents(store.operationalEvents, 'contact', false),
      nodeLeakFailures24h: countOperationalEvents(store.operationalEvents, 'node_leak', false),
    },
    operational: summarizeOperationalEvents(store.operationalEvents),
    samples: {
      slowApiEvents: store.slowApiEvents.slice(-20),
      recentErrors: store.recentErrors.slice(-20),
      operationalEvents: store.operationalEvents.slice(-20),
    },
  }
}
