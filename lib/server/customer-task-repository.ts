import type { PanelCustomerTask, PanelCustomerTaskStatus, PanelCustomerTaskType } from '@/lib/panel-types'
import { listAuditLogs } from '@/lib/server/audit-repository'

function text(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function listPanelCustomerTasks(galleryId: string) {
  const logs = await listAuditLogs({ galleryId, limit: 500 })
  const statusByTask = new Map<string, { status: PanelCustomerTaskStatus; updatedAt: string }>()

  for (const log of logs.items) {
    if (log.action !== 'customer_task_status_change') continue
    if (statusByTask.has(log.entityId)) continue
    const status = text(log.metadata, 'status')
    if (status === 'open' || status === 'completed' || status === 'cancelled') {
      statusByTask.set(log.entityId, { status, updatedAt: log.createdAt })
    }
  }

  const items: PanelCustomerTask[] = []
  for (const log of logs.items) {
    if (log.action !== 'customer_task_create') continue
    const type = text(log.metadata, 'taskType')
    const title = text(log.metadata, 'title')
    const scheduledAt = text(log.metadata, 'scheduledAt')
    const customerName = text(log.metadata, 'customerName')
    const customerPhone = text(log.metadata, 'customerPhone')
    if ((type !== 'appointment' && type !== 'post_sale') || !title || !scheduledAt || !customerName || !customerPhone) continue

    const statusRecord = statusByTask.get(log.entityId)
    items.push({
      id: log.entityId,
      type: type as PanelCustomerTaskType,
      status: statusRecord?.status || 'open',
      title,
      scheduledAt,
      customerName,
      customerPhone,
      leadId: text(log.metadata, 'leadId'),
      vehicleId: text(log.metadata, 'vehicleId'),
      vehicleTitle: text(log.metadata, 'vehicleTitle'),
      note: text(log.metadata, 'note'),
      createdAt: log.createdAt,
      updatedAt: statusRecord?.updatedAt || log.createdAt,
    })
  }

  return items.sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt))
}
