export type AdminAuditSeverity = 'INFO' | 'WATCH' | 'CRITICAL'

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

export const auditSeverityLabels: Record<AdminAuditSeverity, string> = {
  INFO: 'Bilgi',
  WATCH: 'İzle',
  CRITICAL: 'Kritik',
}

export const auditActionLabels: Record<string, string> = {
  vehicle_create: 'Araç oluşturma',
  vehicle_delete: 'Araç silme',
  vehicle_update: 'Araç güncelleme',
  lead_status_change: 'Müşteri talebi durum güncelleme',
  lead_note_add: 'Müşteri talebi not ekleme',
  contact_form_submit: 'İletişim formu',
  contact_form_blocked: 'Engellenen iletişim',
  public_vehicle_cta_click: 'Herkese açık araç butonu',
  public_showroom_cta_click: 'Herkese açık galeri butonu',
  image_upload: 'Görsel yükleme',
  image_delete: 'Görsel silme',
  image_reject: 'Görsel reddetme',
  landing_cta_impression: 'Ana sayfa buton gösterimi',
  landing_cta_click: 'Ana sayfa buton tıklama',
  landing_cta_config_update: 'Ana sayfa buton ayar güncelleme',
  public_slug_rotation: 'Herkese açık link yenileme',
  admin_user_delete: 'Admin kullanıcı silme',
  admin_user_authorization_update: 'Admin yetki güncelleme',
  admin_user_status_update: 'Admin kullanıcı durum güncelleme',
  admin_user_email_verify: 'Admin e-posta doğrulama',
  admin_user_password_reset: 'Admin şifre sıfırlama',
  admin_moderation_action: 'Admin moderasyon işlemi',
  admin_subscription_update: 'Admin abonelik güncelleme',
  admin_notification_send: 'Admin bildirim talebi',
  admin_account_create: 'Admin hesabı oluşturma',
  admin_account_update: 'Admin hesabı güncelleme',
  admin_account_status_update: 'Admin hesabı durum güncelleme',
  admin_account_password_reset: 'Admin hesabı şifre sıfırlama',
  admin_account_soft_delete: 'Admin hesabı geri alınabilir silme',
  admin_account_login: 'Admin hesabı giriş',
}

export const auditEntityLabels: Record<string, string> = {
  vehicle: 'Araç',
  lead: 'Müşteri talebi',
  contact: 'İletişim',
  system: 'Sistem',
  marketing: 'Pazarlama',
  user: 'Kullanıcı',
  subscription: 'Abonelik',
  notification: 'Bildirim',
  moderation: 'Moderasyon',
  admin_account: 'Admin hesabı',
}
