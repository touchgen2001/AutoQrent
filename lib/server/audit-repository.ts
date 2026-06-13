import type { PanelAuditAction, PanelAuditEntityType, PanelAuditLog } from '@/lib/panel-types'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type AuditLogRow = {
  id: number
  action: string
  entity_type: string
  entity_id: string
  actor_email: string | null
  actor_role: string | null
  source: string
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTIONS: PanelAuditAction[] = [
  'vehicle_create',
  'vehicle_delete',
  'vehicle_update',
  'lead_status_change',
  'lead_note_add',
  'lead_follow_up_change',
  'lead_whatsapp_open',
  'reservation_create',
  'reservation_update',
  'review_moderate',
  'vehicle_restore',
  'customer_task_create',
  'customer_task_status_change',
  'contact_form_submit',
  'contact_form_blocked',
  'public_vehicle_cta_click',
  'public_showroom_cta_click',
  'image_upload',
  'image_delete',
  'image_reject',
  'landing_cta_impression',
  'landing_cta_click',
  'landing_cta_config_update',
  'registration_funnel_event',
  'public_slug_rotation',
  'admin_user_delete',
  'admin_user_authorization_update',
  'admin_user_status_update',
  'admin_user_email_verify',
  'admin_user_password_reset',
  'admin_moderation_action',
  'admin_subscription_update',
  'admin_notification_send',
]

const ENTITY_TYPES: PanelAuditEntityType[] = ['vehicle', 'lead', 'contact', 'system', 'marketing', 'user', 'subscription', 'notification', 'moderation', 'reservation', 'review']

export type ListAuditLogsInput = {
  galleryId?: string
  entityId?: string
  search?: string
  action?: PanelAuditAction
  entityType?: PanelAuditEntityType
  source?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

function toAction(action: string): PanelAuditAction {
  return ACTIONS.includes(action as PanelAuditAction) ? (action as PanelAuditAction) : 'contact_form_submit'
}

function toEntityType(entityType: string): PanelAuditEntityType {
  return ENTITY_TYPES.includes(entityType as PanelAuditEntityType) ? (entityType as PanelAuditEntityType) : 'system'
}

function mapAuditRow(row: AuditLogRow): PanelAuditLog {
  return {
    id: row.id,
    action: toAction(row.action),
    entityType: toEntityType(row.entity_type),
    entityId: row.entity_id,
    actorEmail: row.actor_email || undefined,
    actorRole: row.actor_role || undefined,
    source: row.source,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }
}

export async function listAuditLogs(input: ListAuditLogsInput = {}) {
  requireSupabaseAdminConfig()

  const limit = Math.max(Math.min(input.limit || 100, 500), 1)
  const offset = Math.max(input.offset || 0, 0)
  const query: Record<string, string> = {
    select: 'id,action,entity_type,entity_id,actor_email,actor_role,source,metadata,created_at',
    order: 'created_at.desc',
    limit: String(limit),
    offset: String(offset),
  }

  if (input.action) {
    query.action = `eq.${input.action}`
  }
  if (input.entityType) {
    query.entity_type = `eq.${input.entityType}`
  }
  if (input.source) {
    query.source = `eq.${input.source}`
  }
  if (input.galleryId) {
    query['metadata->>galleryId'] = `eq.${input.galleryId}`
  }
  if (input.entityId) {
    query.entity_id = `eq.${input.entityId}`
  }

  if (input.search?.trim()) {
    const escaped = input.search.trim().replace(/,/g, ' ')
    query.or = `(entity_id.ilike.*${escaped}*,actor_email.ilike.*${escaped}*,action.ilike.*${escaped}*)`
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

  const rows = await supabaseAdminFetch<AuditLogRow[]>({
    path: '/rest/v1/audit_logs',
    query,
  })

  return {
    source: 'supabase' as const,
    items: rows.map(mapAuditRow),
  }
}
