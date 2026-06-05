import { insertAuditLog } from '@/lib/security/audit'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type AuditLogRow = {
  id: number
  action: string
  entity_type: string
  entity_id: string
  actor_email: string | null
  source: string
  metadata: Record<string, unknown> | null
  created_at: string
}

type GalleryRow = {
  id: string
  name: string
  owner_email: string | null
  created_at: string | null
}

export type OperationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type OperationModerationKind = 'SUSPICIOUS_GALLERY' | 'SPAM_REPORT' | 'ABUSE_REPORT'
export type OperationModerationStatus = 'NEW' | 'WARNED' | 'SUSPENDED' | 'CONTENT_REMOVED' | 'DISMISSED'
export type OperationBroadcastTarget = 'ALL_TENANTS' | 'ACTIVE_TENANTS' | 'TRIAL_TENANTS' | 'SUSPENDED_TENANTS'

export type OperationSupportSource = {
  connected: boolean
  tableName: string
  message: string
}

export type OperationSupportTicket = {
  id: string
  subject: string
  requester: string
  gallery: string
  channel: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'PANEL'
  status: 'OPEN' | 'PENDING' | 'SOLVED' | 'CLOSED'
  priority: OperationPriority
  updatedAt: string
  internalNotes: Array<{
    id: string
    author: string
    body: string
    createdAt: string
  }>
  attachments: Array<{
    id: string
    fileName: string
    sizeLabel: string
    uploadedAt: string
  }>
  history: Array<{
    id: string
    actor: string
    event: string
    at: string
  }>
}

export type OperationModerationReport = {
  id: string
  sourceAuditId: number
  kind: OperationModerationKind
  targetGallery: string
  reporter: string
  severity: OperationPriority
  status: OperationModerationStatus
  reason: string
  evidence: string
  createdAt: string
  history: Array<{
    id: string
    actor: string
    event: string
    at: string
  }>
}

export type OperationBroadcastRecord = {
  id: string
  target: OperationBroadcastTarget
  subject: string
  body: string
  channels: {
    email: boolean
    sms: boolean
    panel: boolean
    push: boolean
  }
  createdAt: string
  status: 'AUDIT_ONLY'
  delivered: false
  deliveryProvider: 'not_connected'
}

export type OperationBellNotification = {
  id: string
  title: string
  body: string
  source: 'SUPPORT' | 'MODERATION' | 'BROADCAST'
  unread: boolean
  createdAt: string
}

export type AdminOperationsSnapshot = {
  ok: true
  generatedAt: string
  source: 'supabase'
  supportSource: OperationSupportSource
  tickets: OperationSupportTicket[]
  moderationReports: OperationModerationReport[]
  broadcasts: OperationBroadcastRecord[]
  notifications: OperationBellNotification[]
  stats: {
    openTickets: number
    pendingTickets: number
    highPriorityTickets: number
    newModerationReports: number
    recentBroadcasts: number
    auditEvents: number
  }
  notes: {
    support: string
    moderation: string
    broadcast: string
  }
}

const AUDIT_LIMIT = 200
const RISK_ACTIONS = new Set([
  'contact_form_blocked',
  'image_reject',
  'admin_user_status_update',
  'admin_user_delete',
])

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function pickString(metadata: Record<string, unknown> | null, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = asString(metadata[key])
    if (value) return value
  }
  return null
}

function mapBroadcastTarget(value: unknown): OperationBroadcastTarget {
  if (value === 'ACTIVE_TENANTS' || value === 'TRIAL_TENANTS' || value === 'SUSPENDED_TENANTS') return value
  return 'ALL_TENANTS'
}

function mapRiskKind(row: AuditLogRow): OperationModerationKind {
  if (row.action === 'contact_form_blocked') return 'SPAM_REPORT'
  if (row.action === 'image_reject') return 'ABUSE_REPORT'
  return 'SUSPICIOUS_GALLERY'
}

function mapRiskSeverity(row: AuditLogRow): OperationPriority {
  if (row.action === 'admin_user_delete') return 'URGENT'
  if (row.action === 'image_reject' || row.action === 'admin_user_status_update') return 'HIGH'
  return 'MEDIUM'
}

function getTargetGallery(row: AuditLogRow, galleryById: Map<string, GalleryRow>) {
  const metadata = row.metadata || {}
  const galleryId = pickString(metadata, ['galleryId', 'gallery_id', 'tenantId'])
  if (galleryId && galleryById.has(galleryId)) return galleryById.get(galleryId)!.name

  return (
    pickString(metadata, ['galleryName', 'targetGallery', 'tenantName'])
    || pickString(metadata, ['email', 'ownerEmail'])
    || row.entity_id
    || 'Bilinmeyen kayıt'
  )
}

function getRiskReason(row: AuditLogRow) {
  const metadata = row.metadata || {}
  const reason = pickString(metadata, ['reason', 'note', 'messagePreview', 'operation'])
  if (reason) return reason

  if (row.action === 'contact_form_blocked') return 'İletişim veya lead formu güvenlik filtresi tarafından engellendi.'
  if (row.action === 'image_reject') return 'Görsel yükleme güvenlik doğrulaması tarafından reddedildi.'
  if (row.action === 'admin_user_status_update') return 'Admin kullanıcı erişim durumu veya ban kaydı güncellendi.'
  if (row.action === 'admin_user_delete') return 'Admin tarafından kullanıcı silme işlemi kaydedildi.'
  return 'Canlı audit log olayından oluşturulan operasyon incelemesi.'
}

function getEvidence(row: AuditLogRow) {
  const metadata = row.metadata || {}
  return pickString(metadata, ['evidence', 'deliveryStatus', 'source', 'operation', 'fileName']) || row.action
}

function mapModerationActions(auditRows: AuditLogRow[]) {
  const actionsByReportId = new Map<string, AuditLogRow[]>()

  for (const row of auditRows) {
    if (row.action !== 'admin_moderation_action') continue

    const reportId = pickString(row.metadata || {}, ['reportId'])
    if (!reportId) continue

    const existing = actionsByReportId.get(reportId) || []
    existing.push(row)
    actionsByReportId.set(reportId, existing)
  }

  return actionsByReportId
}

function getModerationStatus(reportId: string, actionsByReportId: Map<string, AuditLogRow[]>): OperationModerationStatus {
  const actions = actionsByReportId.get(reportId)
  if (!actions?.length) return 'NEW'

  const status = pickString(actions[0].metadata || {}, ['status'])
  if (status === 'WARNED' || status === 'SUSPENDED' || status === 'CONTENT_REMOVED' || status === 'DISMISSED') {
    return status
  }
  return 'NEW'
}

function buildModerationReports(auditRows: AuditLogRow[], galleries: GalleryRow[]) {
  const galleryById = new Map(galleries.map((gallery) => [gallery.id, gallery]))
  const actionsByReportId = mapModerationActions(auditRows)

  return auditRows
    .filter((row) => RISK_ACTIONS.has(row.action))
    .slice(0, 24)
    .map((row): OperationModerationReport => {
      const reportId = `audit-${row.id}`
      const historyRows = actionsByReportId.get(reportId) || []
      return {
        id: reportId,
        sourceAuditId: row.id,
        kind: mapRiskKind(row),
        targetGallery: getTargetGallery(row, galleryById),
        reporter: row.actor_email || row.source || 'Sistem',
        severity: mapRiskSeverity(row),
        status: getModerationStatus(reportId, actionsByReportId),
        reason: getRiskReason(row),
        evidence: getEvidence(row),
        createdAt: row.created_at,
        history: historyRows.map((actionRow) => ({
          id: `moderation-action-${actionRow.id}`,
          actor: actionRow.actor_email || 'Admin',
          event: pickString(actionRow.metadata || {}, ['status']) || 'Moderasyon işlemi kaydedildi',
          at: actionRow.created_at,
        })),
      }
    })
}

function buildBroadcasts(auditRows: AuditLogRow[]) {
  return auditRows
    .filter((row) => row.action === 'admin_notification_send')
    .slice(0, 12)
    .map((row): OperationBroadcastRecord => {
      const metadata = row.metadata || {}
      const channel = pickString(metadata, ['channel'])
      return {
        id: `broadcast-${row.id}`,
        target: mapBroadcastTarget(metadata.targetSegment),
        subject: pickString(metadata, ['title']) || 'Admin bildirimi',
        body: pickString(metadata, ['messagePreview']) || 'Mesaj önizlemesi kaydedilmedi.',
        channels: {
          email: channel === 'email',
          sms: channel === 'sms',
          panel: channel === 'panel',
          push: false,
        },
        createdAt: row.created_at,
        status: 'AUDIT_ONLY',
        delivered: false,
        deliveryProvider: 'not_connected',
      }
    })
}

function buildNotifications(reports: OperationModerationReport[], broadcasts: OperationBroadcastRecord[]) {
  const moderationNotifications = reports.slice(0, 6).map((report): OperationBellNotification => ({
    id: `notif-${report.id}`,
    title: report.kind === 'SPAM_REPORT' ? 'Spam incelemesi' : report.kind === 'ABUSE_REPORT' ? 'İçerik güvenliği incelemesi' : 'Kullanıcı riski incelemesi',
    body: `${report.targetGallery}: ${report.reason}`,
    source: 'MODERATION',
    unread: false,
    createdAt: report.createdAt,
  }))

  const broadcastNotifications = broadcasts.slice(0, 4).map((broadcast): OperationBellNotification => ({
    id: `notif-${broadcast.id}`,
    title: 'Admin bildirim talebi',
    body: `${broadcast.subject} denetim kaydı olarak kaydedildi.`,
    source: 'BROADCAST',
    unread: false,
    createdAt: broadcast.createdAt,
  }))

  return [...moderationNotifications, ...broadcastNotifications]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 10)
}

async function fetchAuditLogs() {
  return supabaseAdminFetch<AuditLogRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'id,action,entity_type,entity_id,actor_email,source,metadata,created_at',
      order: 'created_at.desc',
      limit: AUDIT_LIMIT,
    },
  })
}

async function fetchGalleries() {
  return supabaseAdminFetch<GalleryRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,owner_email,created_at',
      order: 'created_at.desc',
      limit: 5000,
    },
  })
}

export async function getAdminOperationsSnapshot(): Promise<AdminOperationsSnapshot> {
  requireSupabaseAdminConfig()

  const [auditRows, galleries] = await Promise.all([fetchAuditLogs(), fetchGalleries()])
  const moderationReports = buildModerationReports(auditRows, galleries)
  const broadcasts = buildBroadcasts(auditRows)

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    supportSource: {
      connected: false,
      tableName: 'support_tickets',
      message: 'Destek talebi tablosu bağlı değil. Bu yüzden sahte destek talebi gösterilmiyor.',
    },
    tickets: [],
    moderationReports,
    broadcasts,
    notifications: buildNotifications(moderationReports, broadcasts),
    stats: {
      openTickets: 0,
      pendingTickets: 0,
      highPriorityTickets: 0,
      newModerationReports: moderationReports.filter((report) => report.status === 'NEW').length,
      recentBroadcasts: broadcasts.length,
      auditEvents: auditRows.length,
    },
    notes: {
      support: 'Destek akışı için gerçek destek talebi kaynağı bağlanana kadar kayıt gösterilmez.',
      moderation: 'Moderasyon kuyruğu canlı denetim risk olaylarından türetilir.',
      broadcast: 'Bildirim talepleri denetim kaydı olarak kaydedilir; harici e-posta/SMS/uygulama bildirimi teslimatı bağlı değilse teslim edildi denmez.',
    },
  }
}

export async function recordAdminModerationAction(input: {
  reportId: string
  status: OperationModerationStatus
  reason: string
  targetGallery: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  if (!input.dryRun) {
    await insertAuditLog({
      action: 'admin_moderation_action',
      entityType: 'moderation',
      entityId: input.reportId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        reportId: input.reportId,
        status: input.status,
        targetGallery: input.targetGallery,
        reason: input.reason,
        deliveryStatus: 'audit_only',
        note: 'Bu işlem denetim kaydı olarak kaydedildi. Harici uyarı/silme/askıya alma bağlantısı bağlı değilse gerçek teslimat veya içerik kaldırma iddia edilmez.',
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    reportId: input.reportId,
    status: input.status,
    delivered: false,
    deliveryProvider: 'not_connected' as const,
    message: 'Moderasyon işlemi denetim kaydı olarak kaydedildi. Harici işlem sağlayıcısı bağlı değilse gerçek uyarı/silme yapıldı denmez.',
  }
}
