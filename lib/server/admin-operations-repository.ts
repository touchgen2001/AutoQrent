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

type SupportTicketRow = {
  id: string
  gallery_id: string | null
  requester_name: string | null
  requester_email: string | null
  requester_phone: string | null
  subject: string
  channel: string
  status: string
  priority: string
  updated_at: string
}

type SupportTicketNoteRow = {
  id: string
  ticket_id: string
  author: string
  body: string
  created_at: string
}

type SupportTicketAttachmentRow = {
  id: string
  ticket_id: string
  file_name: string
  size_bytes: number | null
  uploaded_at: string
}

type SupportTicketEventRow = {
  id: string
  ticket_id: string
  actor: string
  event: string
  created_at: string
}

type ModerationReportRow = {
  id: string
  source_audit_log_id: number | null
  gallery_id: string | null
  kind: string
  reporter: string | null
  severity: string
  status: string
  reason: string
  evidence: string | null
  created_at: string
}

type ModerationReportEventRow = {
  id: string
  report_id: string
  actor: string
  event: string
  created_at: string
}

type AdminBroadcastRow = {
  id: string
  target: string
  subject: string
  body: string
  channel: string
  target_count: number
  delivery_provider: string
  delivery_status: string
  created_at: string
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

function isMissingOperationsTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('support_tickets')
    || message.includes('support_ticket_notes')
    || message.includes('support_ticket_attachments')
    || message.includes('support_ticket_events')
    || message.includes('moderation_reports')
    || message.includes('moderation_report_events')
    || message.includes('admin_broadcasts')
  ) && (
    message.includes('does not exist')
    || message.includes('Could not find the table')
    || message.includes('PGRST205')
  )
}

async function fetchOperationsTable<T>(input: Parameters<typeof supabaseAdminFetch>[0]) {
  try {
    return {
      connected: true,
      rows: await supabaseAdminFetch<T>(input),
    }
  } catch (error) {
    if (isMissingOperationsTableError(error)) {
      return {
        connected: false,
        rows: [] as T,
      }
    }

    throw error
  }
}

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

function mapTicketChannel(value: string): OperationSupportTicket['channel'] {
  if (value === 'EMAIL' || value === 'PHONE' || value === 'WHATSAPP' || value === 'PANEL') return value
  return 'PANEL'
}

function mapTicketStatus(value: string): OperationSupportTicket['status'] {
  if (value === 'OPEN' || value === 'PENDING' || value === 'SOLVED' || value === 'CLOSED') return value
  return 'OPEN'
}

function mapPriority(value: string): OperationPriority {
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'URGENT') return value
  return 'MEDIUM'
}

function mapModerationKind(value: string): OperationModerationKind {
  if (value === 'SUSPICIOUS_GALLERY' || value === 'SPAM_REPORT' || value === 'ABUSE_REPORT') return value
  return 'SUSPICIOUS_GALLERY'
}

function mapModerationStatus(value: string): OperationModerationStatus {
  if (value === 'NEW' || value === 'WARNED' || value === 'SUSPENDED' || value === 'CONTENT_REMOVED' || value === 'DISMISSED') return value
  return 'NEW'
}

function formatBytes(value: number | null) {
  if (!value || value <= 0) return 'Boyut yok'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
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

function buildSupportTickets(input: {
  tickets: SupportTicketRow[]
  notes: SupportTicketNoteRow[]
  attachments: SupportTicketAttachmentRow[]
  events: SupportTicketEventRow[]
  galleries: GalleryRow[]
}) {
  const galleryById = new Map(input.galleries.map((gallery) => [gallery.id, gallery.name]))
  const notesByTicketId = new Map<string, SupportTicketNoteRow[]>()
  const attachmentsByTicketId = new Map<string, SupportTicketAttachmentRow[]>()
  const eventsByTicketId = new Map<string, SupportTicketEventRow[]>()

  for (const note of input.notes) {
    const rows = notesByTicketId.get(note.ticket_id) || []
    rows.push(note)
    notesByTicketId.set(note.ticket_id, rows)
  }

  for (const attachment of input.attachments) {
    const rows = attachmentsByTicketId.get(attachment.ticket_id) || []
    rows.push(attachment)
    attachmentsByTicketId.set(attachment.ticket_id, rows)
  }

  for (const event of input.events) {
    const rows = eventsByTicketId.get(event.ticket_id) || []
    rows.push(event)
    eventsByTicketId.set(event.ticket_id, rows)
  }

  return input.tickets.map((ticket): OperationSupportTicket => ({
    id: ticket.id,
    subject: ticket.subject,
    requester: ticket.requester_name || ticket.requester_email || ticket.requester_phone || 'Bilinmeyen talep sahibi',
    gallery: ticket.gallery_id ? galleryById.get(ticket.gallery_id) || 'Galeri adı paylaşılmadı' : 'Galeri seçilmedi',
    channel: mapTicketChannel(ticket.channel),
    status: mapTicketStatus(ticket.status),
    priority: mapPriority(ticket.priority),
    updatedAt: ticket.updated_at,
    internalNotes: (notesByTicketId.get(ticket.id) || []).map((note) => ({
      id: note.id,
      author: note.author,
      body: note.body,
      createdAt: note.created_at,
    })),
    attachments: (attachmentsByTicketId.get(ticket.id) || []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      sizeLabel: formatBytes(attachment.size_bytes),
      uploadedAt: attachment.uploaded_at,
    })),
    history: (eventsByTicketId.get(ticket.id) || []).map((event) => ({
      id: event.id,
      actor: event.actor,
      event: event.event,
      at: event.created_at,
    })),
  }))
}

function buildPersistedModerationReports(input: {
  reports: ModerationReportRow[]
  events: ModerationReportEventRow[]
  galleries: GalleryRow[]
}) {
  const galleryById = new Map(input.galleries.map((gallery) => [gallery.id, gallery.name]))
  const eventsByReportId = new Map<string, ModerationReportEventRow[]>()

  for (const event of input.events) {
    const rows = eventsByReportId.get(event.report_id) || []
    rows.push(event)
    eventsByReportId.set(event.report_id, rows)
  }

  return input.reports.map((report): OperationModerationReport => ({
    id: report.id,
    sourceAuditId: report.source_audit_log_id || 0,
    kind: mapModerationKind(report.kind),
    targetGallery: report.gallery_id ? galleryById.get(report.gallery_id) || 'Galeri adı paylaşılmadı' : 'Galeri seçilmedi',
    reporter: report.reporter || 'Sistem',
    severity: mapPriority(report.severity),
    status: mapModerationStatus(report.status),
    reason: report.reason,
    evidence: report.evidence || 'Kanıt paylaşılmadı',
    createdAt: report.created_at,
    history: (eventsByReportId.get(report.id) || []).map((event) => ({
      id: event.id,
      actor: event.actor,
      event: event.event,
      at: event.created_at,
    })),
  }))
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

function buildPersistedBroadcasts(rows: AdminBroadcastRow[]) {
  return rows.map((row): OperationBroadcastRecord => ({
    id: row.id,
    target: mapBroadcastTarget(row.target),
    subject: row.subject,
    body: row.body,
    channels: {
      email: row.channel === 'email',
      sms: row.channel === 'sms',
      panel: row.channel === 'panel',
      push: false,
    },
    createdAt: row.created_at,
    status: 'AUDIT_ONLY',
    delivered: false,
    deliveryProvider: 'not_connected',
  }))
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

async function fetchSupportTicketRows() {
  const tickets = await fetchOperationsTable<SupportTicketRow[]>({
    path: '/rest/v1/support_tickets',
    query: {
      select: 'id,gallery_id,requester_name,requester_email,requester_phone,subject,channel,status,priority,updated_at',
      order: 'updated_at.desc',
      limit: 100,
    },
  })

  if (!tickets.connected || tickets.rows.length === 0) {
    return {
      connected: tickets.connected,
      tickets: tickets.rows,
      notes: [] as SupportTicketNoteRow[],
      attachments: [] as SupportTicketAttachmentRow[],
      events: [] as SupportTicketEventRow[],
    }
  }

  const ticketIds = tickets.rows.map((ticket) => ticket.id).join(',')
  const [notes, attachments, events] = await Promise.all([
    fetchOperationsTable<SupportTicketNoteRow[]>({
      path: '/rest/v1/support_ticket_notes',
      query: {
        select: 'id,ticket_id,author,body,created_at',
        ticket_id: `in.(${ticketIds})`,
        order: 'created_at.desc',
        limit: 300,
      },
    }),
    fetchOperationsTable<SupportTicketAttachmentRow[]>({
      path: '/rest/v1/support_ticket_attachments',
      query: {
        select: 'id,ticket_id,file_name,size_bytes,uploaded_at',
        ticket_id: `in.(${ticketIds})`,
        order: 'uploaded_at.desc',
        limit: 300,
      },
    }),
    fetchOperationsTable<SupportTicketEventRow[]>({
      path: '/rest/v1/support_ticket_events',
      query: {
        select: 'id,ticket_id,actor,event,created_at',
        ticket_id: `in.(${ticketIds})`,
        order: 'created_at.desc',
        limit: 300,
      },
    }),
  ])

  return {
    connected: tickets.connected && notes.connected && attachments.connected && events.connected,
    tickets: tickets.rows,
    notes: notes.rows,
    attachments: attachments.rows,
    events: events.rows,
  }
}

async function fetchPersistedModerationRows() {
  const reports = await fetchOperationsTable<ModerationReportRow[]>({
    path: '/rest/v1/moderation_reports',
    query: {
      select: 'id,source_audit_log_id,gallery_id,kind,reporter,severity,status,reason,evidence,created_at',
      order: 'created_at.desc',
      limit: 100,
    },
  })

  if (!reports.connected || reports.rows.length === 0) {
    return {
      connected: reports.connected,
      reports: reports.rows,
      events: [] as ModerationReportEventRow[],
    }
  }

  const reportIds = reports.rows.map((report) => report.id).join(',')
  const events = await fetchOperationsTable<ModerationReportEventRow[]>({
    path: '/rest/v1/moderation_report_events',
    query: {
      select: 'id,report_id,actor,event,created_at',
      report_id: `in.(${reportIds})`,
      order: 'created_at.desc',
      limit: 300,
    },
  })

  return {
    connected: reports.connected && events.connected,
    reports: reports.rows,
    events: events.rows,
  }
}

async function fetchPersistedBroadcastRows() {
  return fetchOperationsTable<AdminBroadcastRow[]>({
    path: '/rest/v1/admin_broadcasts',
    query: {
      select: 'id,target,subject,body,channel,target_count,delivery_provider,delivery_status,created_at',
      order: 'created_at.desc',
      limit: 24,
    },
  })
}

export async function getAdminOperationsSnapshot(): Promise<AdminOperationsSnapshot> {
  requireSupabaseAdminConfig()

  const [auditRows, galleries, supportRows, persistedModerationRows, persistedBroadcastRows] = await Promise.all([
    fetchAuditLogs(),
    fetchGalleries(),
    fetchSupportTicketRows(),
    fetchPersistedModerationRows(),
    fetchPersistedBroadcastRows(),
  ])
  const tickets = buildSupportTickets({
    tickets: supportRows.tickets,
    notes: supportRows.notes,
    attachments: supportRows.attachments,
    events: supportRows.events,
    galleries,
  })
  const persistedModerationReports = buildPersistedModerationReports({
    reports: persistedModerationRows.reports,
    events: persistedModerationRows.events,
    galleries,
  })
  const auditModerationReports = buildModerationReports(auditRows, galleries)
  const moderationReports = [...persistedModerationReports, ...auditModerationReports]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 60)
  const persistedBroadcasts = buildPersistedBroadcasts(persistedBroadcastRows.rows)
  const auditBroadcasts = buildBroadcasts(auditRows)
  const broadcasts = [...persistedBroadcasts, ...auditBroadcasts]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 24)
  const supportConnected = supportRows.connected

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    supportSource: {
      connected: supportConnected,
      tableName: 'support_tickets',
      message: supportConnected
        ? 'Destek talepleri canlı support_tickets kaynağından okunur.'
        : 'Destek talebi tablosu bağlı değil. Bu yüzden sahte destek talebi gösterilmiyor.',
    },
    tickets,
    moderationReports,
    broadcasts,
    notifications: buildNotifications(moderationReports, broadcasts),
    stats: {
      openTickets: tickets.filter((ticket) => ticket.status === 'OPEN').length,
      pendingTickets: tickets.filter((ticket) => ticket.status === 'PENDING').length,
      highPriorityTickets: tickets.filter((ticket) => ticket.priority === 'HIGH' || ticket.priority === 'URGENT').length,
      newModerationReports: moderationReports.filter((report) => report.status === 'NEW').length,
      recentBroadcasts: broadcasts.length,
      auditEvents: auditRows.length,
    },
    notes: {
      support: supportConnected
        ? 'Destek akışı canlı support_tickets, not, ek ve geçmiş tablolarından okunur.'
        : 'Destek akışı için gerçek destek talebi kaynağı bağlanana kadar kayıt gösterilmez.',
      moderation: persistedModerationRows.connected
        ? 'Moderasyon kuyruğu canlı moderation_reports tablosu ve denetim risk olayları birlikte okunur.'
        : 'Moderasyon kuyruğu canlı denetim risk olaylarından türetilir.',
      broadcast: persistedBroadcastRows.connected
        ? 'Bildirim talepleri admin_broadcasts ve denetim kayıtlarından okunur; teslimat sağlayıcısı bağlı değilse teslim edildi denmez.'
        : 'Bildirim talepleri denetim kaydı olarak kaydedilir; harici e-posta/SMS/uygulama bildirimi teslimatı bağlı değilse teslim edildi denmez.',
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
    if (looksLikeUuid(input.reportId)) {
      await supabaseAdminFetch<unknown>({
        method: 'PATCH',
        path: '/rest/v1/moderation_reports',
        query: {
          id: `eq.${input.reportId}`,
        },
        body: {
          status: input.status,
          metadata: {
            lastAdminAction: input.status,
            lastAdminReason: input.reason,
            lastAdminActor: input.adminUsername,
          },
        },
        prefer: 'return=minimal',
      })

      await supabaseAdminFetch<unknown>({
        method: 'POST',
        path: '/rest/v1/moderation_report_events',
        body: [
          {
            report_id: input.reportId,
            actor: input.adminUsername,
            status: input.status,
            event: input.reason,
            metadata: {
              targetGallery: input.targetGallery,
              deliveryProvider: 'not_connected',
              deliveryStatus: 'audit_only',
            },
          },
        ],
        prefer: 'return=minimal',
      })
    }

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
