export const ticketStatuses = ['OPEN', 'PENDING', 'SOLVED', 'CLOSED'] as const
export const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const moderationKinds = ['SUSPICIOUS_GALLERY', 'SPAM_REPORT', 'ABUSE_REPORT'] as const
export const moderationStatuses = ['NEW', 'WARNED', 'SUSPENDED', 'CONTENT_REMOVED', 'DISMISSED'] as const
export const moderationActionStatuses = ['WARNED', 'SUSPENDED', 'CONTENT_REMOVED', 'DISMISSED'] as const
export const broadcastTargets = ['ALL_TENANTS', 'ACTIVE_TENANTS', 'TRIAL_TENANTS', 'SUSPENDED_TENANTS'] as const

export type TicketStatus = (typeof ticketStatuses)[number]
export type TicketPriority = (typeof ticketPriorities)[number]
export type ModerationKind = (typeof moderationKinds)[number]
export type ModerationStatus = (typeof moderationStatuses)[number]
export type ModerationActionStatus = (typeof moderationActionStatuses)[number]
export type BroadcastTarget = (typeof broadcastTargets)[number]

export type TicketHistoryEntry = {
  id: string
  actor: string
  event: string
  at: string
}

export type SupportTicket = {
  id: string
  subject: string
  requester: string
  gallery: string
  channel: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'PANEL'
  status: TicketStatus
  priority: TicketPriority
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
  history: TicketHistoryEntry[]
}

export type ModerationReport = {
  id: string
  sourceAuditId: number
  kind: ModerationKind
  targetGallery: string
  reporter: string
  severity: TicketPriority
  status: ModerationStatus
  reason: string
  evidence: string
  createdAt: string
  history: TicketHistoryEntry[]
}

export type BellNotification = {
  id: string
  title: string
  body: string
  source: 'SUPPORT' | 'MODERATION' | 'BROADCAST'
  unread: boolean
  createdAt: string
}

export type BroadcastInput = {
  target: BroadcastTarget
  subject: string
  body: string
  channels: {
    email: boolean
    sms: boolean
    panel: boolean
    push: boolean
  }
}

export type BroadcastRecord = BroadcastInput & {
  id: string
  createdAt: string
  status: 'AUDIT_ONLY'
  delivered: false
  deliveryProvider: 'not_connected'
}

export type AdminOperationsSnapshot = {
  generatedAt: string
  source: 'supabase'
  supportSource: {
    connected: boolean
    tableName: string
    message: string
  }
  tickets: SupportTicket[]
  moderationReports: ModerationReport[]
  broadcasts: BroadcastRecord[]
  notifications: BellNotification[]
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

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
}

export const ticketStatusLabels: Record<TicketStatus, string> = {
  OPEN: 'Açık',
  PENDING: 'Beklemede',
  SOLVED: 'Çözüldü',
  CLOSED: 'Kapandı',
}

export const moderationKindLabels: Record<ModerationKind, string> = {
  SUSPICIOUS_GALLERY: 'Şüpheli galeri',
  SPAM_REPORT: 'Spam raporu',
  ABUSE_REPORT: 'Kötüye kullanım raporu',
}

export const moderationStatusLabels: Record<ModerationStatus, string> = {
  NEW: 'Yeni',
  WARNED: 'Uyarıldı',
  SUSPENDED: 'Askıya alındı',
  CONTENT_REMOVED: 'İçerik kaldırma talebi',
  DISMISSED: 'Reddedildi',
}

export const broadcastTargetLabels: Record<BroadcastTarget, string> = {
  ALL_TENANTS: 'Tüm galeriler',
  ACTIVE_TENANTS: 'Aktif galeriler',
  TRIAL_TENANTS: 'Deneme galerileri',
  SUSPENDED_TENANTS: 'Askıdaki galeriler',
}
