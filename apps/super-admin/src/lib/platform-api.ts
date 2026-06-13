import type {
  AdminAccountCreateInput,
  AdminAccountMutationResult,
  AdminAccountsSnapshot,
  AdminAccountUpdateInput,
} from '@/lib/platform-admin-account-types'
import type { AdminAuditFilters, AdminAuditSnapshot } from '@/lib/platform-audit-types'
import type { PlatformDashboardSnapshot } from '@/lib/platform-dashboard-types'
import type { AdminFinanceSnapshot } from '@/lib/platform-finance-types'
import type { AdminOperationsSnapshot, BroadcastInput, ModerationActionStatus } from '@/lib/platform-operations-types'
import type { AdminSettingsSnapshot } from '@/lib/platform-settings-types'
import type { Tenant, TenantCreateInput, TenantPaymentStatus, TenantStatus, TenantUpdateInput } from '@/lib/platform-tenant-types'
import type { PlatformUser, PlatformUserStatus, PlatformUserSummary } from '@/lib/platform-user-types'

type ApiFailure = {
  ok: false
  error?: string
  message?: string
}

type TenantListResponse =
  | {
      ok: true
      generatedAt: string
      source: 'supabase'
      tenants: Tenant[]
    }
  | ApiFailure

type TenantMutationResponse =
  | {
      ok: true
      tenant: Tenant
      temporaryPassword?: string
    }
  | ApiFailure

type TenantImpersonationResponse =
  | {
      ok: true
      tenantId: string
      galleryName: string
      issuedAt: string
      scope: string
    }
  | ApiFailure

type DashboardSnapshotResponse =
  | ({
      ok: true
    } & PlatformDashboardSnapshot)
  | ApiFailure

type UserListResponse =
  | {
      ok: true
      generatedAt: string
      capReached: boolean
      sourceLimit: number
      summary: PlatformUserSummary
      users: PlatformUser[]
    }
  | ApiFailure

type UserActionResponse =
  | {
      ok: true
      message?: string
      email?: string
      targetEmail?: string
      deliveryStatus?: string
    }
  | ApiFailure

type OperationsSnapshotResponse =
  | ({
      ok: true
    } & AdminOperationsSnapshot)
  | ApiFailure

type FinanceSnapshotResponse =
  | ({
      ok: true
    } & AdminFinanceSnapshot)
  | ApiFailure

type AuditSnapshotResponse =
  | ({
      ok: true
    } & AdminAuditSnapshot)
  | ApiFailure

type SettingsSnapshotResponse =
  | ({
      ok: true
    } & AdminSettingsSnapshot)
  | ApiFailure

type AdminAccountsSnapshotResponse =
  | ({
      ok: true
    } & AdminAccountsSnapshot)
  | ApiFailure

type AdminAccountMutationResponse = AdminAccountMutationResult | ApiFailure

type ModerationActionResponse =
  | {
      ok: true
      message: string
      reportId: string
      status: ModerationActionStatus
      delivered: false
      deliveryProvider: 'not_connected'
    }
  | ApiFailure

type NotificationActionResponse =
  | {
      ok: true
      message: string
      delivered: false
      deliveryProvider: 'not_connected'
      targetCount: number
    }
  | ApiFailure

type AdminRequestInit = RequestInit & {
  timeoutMs?: number
}

type AdminActionReasonInput = {
  reason: string
}

const DEFAULT_ADMIN_API_TIMEOUT_MS = 12_000
const JSON_CONTENT_TYPE = 'application/json'

function buildErrorMessage(response: Response, payload: ApiFailure | null) {
  if (response.status === 401) {
    return 'Canlı admin oturumu yok. Önce /admin/giris üzerinden admin oturumu açın.'
  }

  return payload?.message || payload?.error || `Canlı admin API isteği başarısız oldu (${response.status}).`
}

function buildRequestHeaders(headers?: HeadersInit) {
  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', JSON_CONTENT_TYPE)
  }

  return requestHeaders
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function buildTimeoutMessage(path: string, timeoutMs: number) {
  return `Canlı admin API isteği ${Math.round(timeoutMs / 1000)} saniye içinde yanıt vermedi: ${path}.`
}

async function requestJson<TSuccess extends { ok: true }>(path: string, init: AdminRequestInit = {}): Promise<TSuccess> {
  const { timeoutMs = DEFAULT_ADMIN_API_TIMEOUT_MS, signal, headers, ...fetchInit } = init
  const controller = new AbortController()
  let timeoutTriggered = false
  let removeAbortListener: (() => void) | undefined

  if (signal?.aborted) {
    controller.abort()
  } else if (signal) {
    const handleAbort = () => controller.abort()
    signal.addEventListener('abort', handleAbort, { once: true })
    removeAbortListener = () => signal.removeEventListener('abort', handleAbort)
  }

  const timeoutId = window.setTimeout(() => {
    timeoutTriggered = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(path, {
      ...fetchInit,
      credentials: 'include',
      signal: controller.signal,
      headers: buildRequestHeaders(headers),
    })
    const payload = (await response.json().catch(() => null)) as TSuccess | ApiFailure | null

    if (!response.ok || !payload?.ok) {
      throw new Error(buildErrorMessage(response, payload && !payload.ok ? payload : null))
    }

    return payload as TSuccess
  } catch (error) {
    if (timeoutTriggered) {
      throw new Error(buildTimeoutMessage(path, timeoutMs))
    }

    if (isAbortError(error)) {
      throw new Error('Canlı admin API isteği iptal edildi.')
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
    removeAbortListener?.()
  }
}

export const platformApi = {
  async getDashboardSnapshot() {
    const payload = await requestJson<Extract<DashboardSnapshotResponse, { ok: true }>>('/api/admin/dashboard')
    const { ok: _ok, ...snapshot } = payload
    void _ok
    return snapshot
  },

  async listTenants() {
    const payload = await requestJson<Extract<TenantListResponse, { ok: true }>>('/api/admin/tenants')
    return payload.tenants
  },

  async createTenant(input: TenantCreateInput) {
    const payload = await requestJson<Extract<TenantMutationResponse, { ok: true }>>('/api/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(input),
    })

    return payload
  },

  async updateTenant(id: string, input: TenantUpdateInput) {
    const payload = await requestJson<Extract<TenantMutationResponse, { ok: true }>>(
      `/api/admin/tenants/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )

    return payload.tenant
  },

  async setTenantStatus(id: string, status: TenantStatus, reason: string) {
    const payload = await requestJson<Extract<TenantMutationResponse, { ok: true }>>(
      `/api/admin/tenants/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reason,
          ...(status === 'DELETED' ? { paymentStatus: 'CANCELED' satisfies TenantPaymentStatus } : {}),
        }),
      },
    )

    return payload.tenant
  },

  async createImpersonationPreview(id: string) {
    return requestJson<Extract<TenantImpersonationResponse, { ok: true }>>(
      `/api/admin/tenants/${encodeURIComponent(id)}/impersonation`,
      {
        method: 'POST',
      },
    )
  },

  async listUsers() {
    const payload = await requestJson<Extract<UserListResponse, { ok: true }>>('/api/admin/users')
    return payload
  },

  async resetUserPassword(userId: string) {
    return requestJson<Extract<UserActionResponse, { ok: true }>>(
      `/api/admin/users/${encodeURIComponent(userId)}/password-reset`,
      {
        method: 'POST',
      },
    )
  },

  async verifyUserEmail(userId: string) {
    return requestJson<Extract<UserActionResponse, { ok: true }>>(
      `/api/admin/users/${encodeURIComponent(userId)}/email-verification`,
      {
        method: 'POST',
      },
    )
  },

  async setUserStatus(userId: string, status: PlatformUserStatus, reason: AdminActionReasonInput['reason']) {
    return requestJson<Extract<UserActionResponse, { ok: true }>>(
      `/api/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      },
    )
  },

  async getOperationsSnapshot() {
    const payload = await requestJson<Extract<OperationsSnapshotResponse, { ok: true }>>('/api/admin/operations')
    const { ok: _ok, ...snapshot } = payload
    void _ok
    return snapshot
  },

  async getFinanceSnapshot() {
    const payload = await requestJson<Extract<FinanceSnapshotResponse, { ok: true }>>('/api/admin/finance')
    const { ok: _ok, ...snapshot } = payload
    void _ok
    return snapshot
  },

  async getAuditSnapshot(filters: AdminAuditFilters = {}) {
    const params = new URLSearchParams()
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.action?.trim()) params.set('action', filters.action.trim())
    if (filters.entityType?.trim()) params.set('entityType', filters.entityType.trim())
    if (filters.source?.trim()) params.set('source', filters.source.trim())
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.offset) params.set('offset', String(filters.offset))

    const query = params.toString()
    const payload = await requestJson<Extract<AuditSnapshotResponse, { ok: true }>>(
      `/api/admin/audit${query ? `?${query}` : ''}`,
    )
    const { ok: _ok, ...snapshot } = payload
    void _ok
    return snapshot
  },

  async getSettingsSnapshot() {
    const payload = await requestJson<Extract<SettingsSnapshotResponse, { ok: true }>>('/api/admin/settings')
    const { ok: _ok, ...snapshot } = payload
    void _ok
    return snapshot
  },

  async getAdminAccountsSnapshot() {
    const payload = await requestJson<Extract<AdminAccountsSnapshotResponse, { ok: true }>>('/api/admin/accounts')
    const { ok: _ok, ...snapshot } = payload
    void _ok
    return snapshot
  },

  async createAdminAccount(input: AdminAccountCreateInput) {
    return requestJson<Extract<AdminAccountMutationResponse, { ok: true }>>('/api/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async updateAdminAccount(accountId: string, input: AdminAccountUpdateInput) {
    return requestJson<Extract<AdminAccountMutationResponse, { ok: true }>>(
      `/api/admin/accounts/${encodeURIComponent(accountId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
  },

  async deleteAdminAccount(accountId: string) {
    return requestJson<Extract<AdminAccountMutationResponse, { ok: true }>>(
      `/api/admin/accounts/${encodeURIComponent(accountId)}`,
      {
        method: 'DELETE',
      },
    )
  },

  async recordModerationAction(input: {
    reportId: string
    status: ModerationActionStatus
    targetGallery: string
    reason: string
  }) {
    return requestJson<Extract<ModerationActionResponse, { ok: true }>>('/api/admin/operations/moderation', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async sendBroadcast(input: BroadcastInput) {
    const channel = input.channels.email ? 'email' : input.channels.sms ? 'sms' : 'panel'
    return requestJson<Extract<NotificationActionResponse, { ok: true }>>('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'bulk',
        channel,
        targetSegment: input.target,
        title: input.subject,
        message: input.body,
      }),
    })
  },
}
