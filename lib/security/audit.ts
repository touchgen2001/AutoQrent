import { hashForStorage } from '@/lib/security/request-guards'

export type AuditAction =
  | 'vehicle_create'
  | 'vehicle_delete'
  | 'vehicle_update'
  | 'lead_status_change'
  | 'lead_note_add'
  | 'contact_form_submit'
  | 'contact_form_blocked'
  | 'public_vehicle_cta_click'
  | 'public_showroom_cta_click'
  | 'vehicle_social_image_download'
  | 'image_upload'
  | 'image_delete'
  | 'image_reject'
  | 'landing_cta_impression'
  | 'landing_cta_click'
  | 'landing_cta_config_update'
  | 'public_slug_rotation'
  | 'admin_user_delete'
  | 'admin_user_authorization_update'
  | 'admin_user_status_update'
  | 'admin_user_email_verify'
  | 'admin_user_password_reset'
  | 'admin_moderation_action'
  | 'admin_subscription_update'
  | 'admin_notification_send'
  | 'admin_account_create'
  | 'admin_account_update'
  | 'admin_account_status_update'
  | 'admin_account_password_reset'
  | 'admin_account_soft_delete'
  | 'admin_account_login'

export type AuditEntityType =
  | 'vehicle'
  | 'lead'
  | 'contact'
  | 'system'
  | 'marketing'
  | 'user'
  | 'subscription'
  | 'notification'
  | 'moderation'
  | 'admin_account'

type AuditInput = {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  actorEmail?: string
  actorRole?: string
  metadata?: Record<string, unknown>
  source?: string
  ip?: string
  userAgent?: string
}

type InsertAuditResult = {
  ok: boolean
  stored: boolean
  error?: string
}

const AUDIT_INSERT_ENDPOINT = '/rest/v1/audit_logs'

export async function insertAuditLog(input: AuditInput): Promise<InsertAuditResult> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.info('[audit-log][local-only]', input)
    return { ok: true, stored: false }
  }

  if (supabaseServiceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      ok: false,
      stored: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY must be different from NEXT_PUBLIC_SUPABASE_ANON_KEY',
    }
  }

  const payload = {
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    actor_email: input.actorEmail || null,
    actor_role: input.actorRole || null,
    source: input.source || 'web',
    ip_hash: input.ip ? hashForStorage(input.ip) : null,
    user_agent: input.userAgent || null,
    metadata: input.metadata || {},
  }

  const response = await fetch(`${supabaseUrl}${AUDIT_INSERT_ENDPOINT}`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceRoleKey,
      authorization: `Bearer ${supabaseServiceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    return {
      ok: false,
      stored: false,
      error: errorText || `Audit insert failed (${response.status})`,
    }
  }

  return { ok: true, stored: true }
}
