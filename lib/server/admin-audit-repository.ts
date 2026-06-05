import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type AuditLogRow = {
  id: number
  action: string
  entity_type: string
  entity_id: string
  actor_email: string | null
  actor_role: string | null
  source: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export type AdminAuditSeverity = 'INFO' | 'WATCH' | 'CRITICAL'

export type AdminAuditEntry = {
  id: number
  action: string
  entityType: string
  entityId: string
  actorEmail: string | null
  actorRole: string | null
  source: string
  severity: AdminAuditSeverity
  metadata: Record<string, unknown>
  metadataPreview: string
  createdAt: string
}

export type AdminAuditSummaryRow = {
  key: string
  label: string
  count: number
}

export type AdminAuditSnapshot = {
  ok: true
  generatedAt: string
  source: 'supabase'
  sourceTable: 'audit_logs'
  appliedFilters: AdminAuditFilters
  stats: {
    loadedEvents: number
    criticalEvents: number
    watchEvents: number
    adminEvents: number
    blockedEvents: number
    anonymousActorEvents: number
    latestEventAt: string | null
  }
  summaries: {
    actions: AdminAuditSummaryRow[]
    entityTypes: AdminAuditSummaryRow[]
    sources: AdminAuditSummaryRow[]
    severities: AdminAuditSummaryRow[]
  }
  entries: AdminAuditEntry[]
  notes: {
    retention: string
    dataPolicy: string
    security: string
  }
}

export type AdminAuditFilters = {
  search?: string
  action?: string
  entityType?: string
  source?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500
const CRITICAL_ACTIONS = new Set([
  'admin_user_delete',
  'image_reject',
  'contact_form_blocked',
  'public_slug_rotation',
])
const WATCH_ACTIONS = new Set([
  'admin_user_status_update',
  'admin_user_authorization_update',
  'admin_subscription_update',
  'admin_moderation_action',
  'admin_notification_send',
])
const BLOCKED_ACTIONS = new Set(['contact_form_blocked', 'image_reject'])

function clampLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(Math.trunc(value), MAX_LIMIT))
}

function clampOffset(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function sanitizeSearch(value: string | undefined) {
  const normalized = (value || '').trim().replace(/[(),*]/g, ' ').replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, 100) : undefined
}

function sanitizeFilter(value: string | undefined) {
  const normalized = (value || '').trim()
  return normalized ? normalized.slice(0, 120) : undefined
}

function getSeverity(action: string): AdminAuditSeverity {
  if (CRITICAL_ACTIONS.has(action)) return 'CRITICAL'
  if (WATCH_ACTIONS.has(action) || action.startsWith('admin_')) return 'WATCH'
  return 'INFO'
}

function clip(value: string, length = 260) {
  if (value.length <= length) return value
  return `${value.slice(0, length)}...`
}

function isSensitiveMetadataKey(key: string) {
  return /(password|token|secret|authorization|cookie|session|service[_-]?role|api[_-]?key)/i.test(key)
}

function sanitizeMetadataForPreview(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadataForPreview(item))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      isSensitiveMetadataKey(key) ? '[redacted]' : sanitizeMetadataForPreview(nestedValue),
    ]),
  )
}

function buildMetadataPreview(metadata: Record<string, unknown>) {
  const safeMetadata = sanitizeMetadataForPreview(metadata)

  const text = JSON.stringify(safeMetadata)
  return text === '{}' ? 'Metadata yok' : clip(text)
}

function mapRow(row: AuditLogRow): AdminAuditEntry {
  const action = row.action || 'unknown'
  const metadata = row.metadata || {}

  return {
    id: row.id,
    action,
    entityType: row.entity_type || 'system',
    entityId: row.entity_id || 'unknown',
    actorEmail: row.actor_email || null,
    actorRole: row.actor_role || null,
    source: row.source || 'unknown',
    severity: getSeverity(action),
    metadata,
    metadataPreview: buildMetadataPreview(metadata),
    createdAt: row.created_at || new Date(0).toISOString(),
  }
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item) || 'unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 18)
    .map(([key, count]) => ({
      key,
      label: key,
      count,
    }))
}

function buildQuery(input: AdminAuditFilters) {
  const search = sanitizeSearch(input.search)
  const action = sanitizeFilter(input.action)
  const entityType = sanitizeFilter(input.entityType)
  const source = sanitizeFilter(input.source)
  const limit = clampLimit(input.limit)
  const offset = clampOffset(input.offset)
  const query: Record<string, string> = {
    select: 'id,action,entity_type,entity_id,actor_email,actor_role,source,metadata,created_at',
    order: 'created_at.desc',
    limit: String(limit),
    offset: String(offset),
  }

  if (action) query.action = `eq.${action}`
  if (entityType) query.entity_type = `eq.${entityType}`
  if (source) query.source = `eq.${source}`
  if (search) {
    query.or = `(entity_id.ilike.*${search}*,actor_email.ilike.*${search}*,action.ilike.*${search}*,entity_type.ilike.*${search}*)`
  }

  if (input.from || input.to) {
    const fromIso = input.from ? `${input.from}T00:00:00.000Z` : null
    const toIso = input.to ? `${input.to}T23:59:59.999Z` : null
    if (fromIso && toIso) {
      query.and = `(created_at.gte.${fromIso},created_at.lte.${toIso})`
    } else if (fromIso) {
      query.created_at = `gte.${fromIso}`
    } else if (toIso) {
      query.created_at = `lte.${toIso}`
    }
  }

  return {
    query,
    appliedFilters: {
      search,
      action,
      entityType,
      source,
      from: input.from,
      to: input.to,
      limit,
      offset,
    },
  }
}

export async function getAdminAuditSnapshot(input: AdminAuditFilters = {}): Promise<AdminAuditSnapshot> {
  requireSupabaseAdminConfig()

  const { query, appliedFilters } = buildQuery(input)
  const rows = await supabaseAdminFetch<AuditLogRow[]>({
    path: '/rest/v1/audit_logs',
    query,
  })
  const entries = rows.map(mapRow)

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    sourceTable: 'audit_logs',
    appliedFilters,
    stats: {
      loadedEvents: entries.length,
      criticalEvents: entries.filter((entry) => entry.severity === 'CRITICAL').length,
      watchEvents: entries.filter((entry) => entry.severity === 'WATCH').length,
      adminEvents: entries.filter((entry) => entry.action.startsWith('admin_')).length,
      blockedEvents: entries.filter((entry) => BLOCKED_ACTIONS.has(entry.action)).length,
      anonymousActorEvents: entries.filter((entry) => !entry.actorEmail).length,
      latestEventAt: entries[0]?.createdAt || null,
    },
    summaries: {
      actions: countBy(entries, (entry) => entry.action),
      entityTypes: countBy(entries, (entry) => entry.entityType),
      sources: countBy(entries, (entry) => entry.source),
      severities: countBy(entries, (entry) => entry.severity),
    },
    entries,
    notes: {
      retention: 'Bu ekran Supabase audit_logs tablosundan son kayıtları okur; toplam arşiv sayısı uydurulmaz.',
      dataPolicy: 'Mock audit satırı, örnek olay veya sahte güvenlik metriği gösterilmez.',
      security: 'Service role sadece server-side repository içinde kullanılır; frontend yalnızca korumalı admin API çağırır.',
    },
  }
}
