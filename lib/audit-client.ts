type AuditAction =
  | 'vehicle_create'
  | 'vehicle_delete'
  | 'vehicle_update'
  | 'lead_status_change'
  | 'lead_note_add'
  | 'lead_follow_up_change'
  | 'customer_task_create'
  | 'customer_task_status_change'

type AuditEntityType = 'vehicle' | 'lead' | 'system'

type AuditPayload = {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  actorEmail?: string
  actorRole?: string
  metadata?: Record<string, unknown>
}

export async function sendAuditLog(payload: AuditPayload) {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (error) {
    console.error('[audit] request failed', error)
  }
}
