import { getOpsSnapshot } from '@/lib/security/ops-monitor'
import { isQaAuthMetadata } from '@/lib/server/qa-account'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { normalizeSubscriptionStatus } from '@/lib/subscription-plans'

export type PlatformDashboardTrendPoint = {
  label: string
  value: number
}

export type PlatformDashboardHealthStatus = 'OPERATIONAL' | 'WATCH' | 'ISSUE'

export type PlatformDashboardHealthCheck = {
  label: string
  status: PlatformDashboardHealthStatus
  detail: string
  latencyMs: number
}

export type PlatformDashboardActivity = {
  id: string
  type: 'gallery' | 'lead' | 'qr' | 'audit'
  title: string
  detail: string
  at: string
  status: PlatformDashboardHealthStatus
}

export type PlatformDashboardSnapshot = {
  ok: true
  generatedAt: string
  source: 'supabase'
  sourceLabel: string
  widgets: {
    totalGalleries: number
    activeGalleries: number
    passiveGalleries: number
    totalVehicles: number
    totalQr: number
    dailyQrScans: number
    totalLeads: number
    monthlyRevenue: number
    todayRegistrations: number
    trialUsers: number
    systemHealthScore: number
    systemHealthLabel: string
  }
  trends: {
    registrations: PlatformDashboardTrendPoint[]
    subscriptions: PlatformDashboardTrendPoint[]
    qrUsage: PlatformDashboardTrendPoint[]
    leads: PlatformDashboardTrendPoint[]
  }
  healthChecks: PlatformDashboardHealthCheck[]
  recentActivity: PlatformDashboardActivity[]
  notes: {
    revenue: string
    qr: string
    dataPolicy: string
  }
}

type AuthUserRow = {
  id: string
  email?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
  banned_until?: string | null
  app_metadata?: Record<string, unknown> | null
}

type AuthUsersResponse =
  | {
      users?: AuthUserRow[]
      data?: {
        users?: AuthUserRow[]
      }
      total?: number
    }
  | AuthUserRow[]

type GalleryRow = {
  id: string
  name: string
  owner_email: string | null
  created_at: string | null
}

type VehicleRow = {
  id: string
  gallery_id: string | null
  slug: string | null
  status: string | null
  created_at: string | null
}

type QrScanRow = {
  id: number
  vehicle_id: string | null
  source: string | null
  scanned_at: string | null
}

type LeadRow = {
  id: string
  gallery_id: string | null
  vehicle_id: string | null
  status: string | null
  source: string | null
  customer_name: string | null
  created_at: string | null
}

type AuditLogRow = {
  id: number
  action: string
  entity_type: string
  actor_email: string | null
  created_at: string | null
}

type TimedResult<T> = {
  value: T
  latencyMs: number
  ok: boolean
  error?: string
}

const DATA_ROW_LIMIT = 20000
const AUTH_USERS_PAGE_SIZE = 100
const DASHBOARD_AUTH_USER_LIMIT = 1000
const DAY_MS = 24 * 60 * 60 * 1000
const TRY_TIME_ZONE = 'Europe/Istanbul'

const dayLabelFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: TRY_TIME_ZONE,
})

const monthLabelFormatter = new Intl.DateTimeFormat('tr-TR', {
  month: 'short',
  timeZone: TRY_TIME_ZONE,
})

function extractAuthUsers(response: AuthUsersResponse) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response.users)) return response.users
  if (Array.isArray(response.data?.users)) return response.data.users
  return []
}

async function timed<T>(label: string, read: () => Promise<T>): Promise<TimedResult<T>> {
  const startedAt = Date.now()
  try {
    const value = await read()
    return {
      value,
      latencyMs: Date.now() - startedAt,
      ok: true,
    }
  } catch (error) {
    return {
      value: [] as T,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : `${label} okunamadı`,
    }
  }
}

async function fetchAuthUsers() {
  const users: AuthUserRow[] = []
  let page = 1

  while (users.length < DASHBOARD_AUTH_USER_LIMIT) {
    const response = await supabaseAdminFetch<AuthUsersResponse>({
      path: '/auth/v1/admin/users',
      query: {
        page,
        per_page: AUTH_USERS_PAGE_SIZE,
      },
    })
    const pageUsers = extractAuthUsers(response)
    users.push(...pageUsers)

    if (pageUsers.length < AUTH_USERS_PAGE_SIZE) break
    page += 1
  }

  return users.slice(0, DASHBOARD_AUTH_USER_LIMIT)
}

function fetchGalleries() {
  return supabaseAdminFetch<GalleryRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,owner_email,created_at',
      is_qa_account: 'eq.false',
      order: 'created_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function fetchVehicles() {
  return supabaseAdminFetch<VehicleRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id,slug,status,created_at',
      order: 'created_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function fetchQrScans(sinceIso: string) {
  return supabaseAdminFetch<QrScanRow[]>({
    path: '/rest/v1/qr_scans',
    query: {
      select: 'id,vehicle_id,source,scanned_at',
      scanned_at: `gte.${sinceIso}`,
      order: 'scanned_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function fetchLeads(sinceIso: string) {
  return supabaseAdminFetch<LeadRow[]>({
    path: '/rest/v1/leads',
    query: {
      select: 'id,gallery_id,vehicle_id,status,source,customer_name,created_at',
      created_at: `gte.${sinceIso}`,
      order: 'created_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function fetchAllLeads() {
  return supabaseAdminFetch<LeadRow[]>({
    path: '/rest/v1/leads',
    query: {
      select: 'id,gallery_id,vehicle_id,status,source,customer_name,created_at',
      order: 'created_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function fetchAuditLogs() {
  return supabaseAdminFetch<AuditLogRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'id,action,entity_type,actor_email,created_at',
      order: 'created_at.desc',
      limit: 12,
    },
  })
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getMetadataNumber(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return 0
}

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function getDayKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TRY_TIME_ZONE,
  }).format(date)
}

function getMonthKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: TRY_TIME_ZONE,
  }).format(date)
}

function labelDay(dayKey: string) {
  return dayLabelFormatter.format(new Date(`${dayKey}T12:00:00Z`))
}

function labelMonth(monthKey: string) {
  return monthLabelFormatter.format(new Date(`${monthKey}-15T12:00:00Z`))
}

function makeLastDays(now: Date, length: number) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(now.getTime() - (length - 1 - index) * DAY_MS)
    return getDayKey(date)
  })
}

function makeLastMonths(now: Date, length: number) {
  const keys: string[] = []
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  for (let index = length - 1; index >= 0; index -= 1) {
    keys.push(getMonthKey(new Date(Date.UTC(year, month - index, 15, 12))))
  }

  return keys
}

function countByKey<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>()

  for (const item of items) {
    const key = getKey(item)
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return counts
}

function buildDayTrend(keys: string[], counts: Map<string, number>): PlatformDashboardTrendPoint[] {
  return keys.map((key) => ({
    label: labelDay(key),
    value: counts.get(key) || 0,
  }))
}

function buildMonthTrend(keys: string[], counts: Map<string, number>): PlatformDashboardTrendPoint[] {
  return keys.map((key) => ({
    label: labelMonth(key),
    value: counts.get(key) || 0,
  }))
}

function isBanned(user: AuthUserRow) {
  return Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now())
}

function isActiveSubscription(user: AuthUserRow) {
  const status = normalizeSubscriptionStatus(getMetadataString(user.app_metadata, 'subscriptionStatus'))
  const accessStatus = getMetadataString(user.app_metadata, 'accessStatus')
  return !isBanned(user) && accessStatus !== 'suspended' && status === 'active'
}

function isTrialSubscription(user: AuthUserRow) {
  const status = normalizeSubscriptionStatus(getMetadataString(user.app_metadata, 'subscriptionStatus'))
  return !isBanned(user) && status === 'trialing'
}

function buildHealthChecks(input: {
  auth: TimedResult<AuthUserRow[]>
  galleries: TimedResult<GalleryRow[]>
  qrScans: TimedResult<QrScanRow[]>
  leads: TimedResult<LeadRow[]>
  opsErrorCount: number
}): PlatformDashboardHealthCheck[] {
  return [
    {
      label: 'Supabase Auth',
      status: input.auth.ok ? 'OPERATIONAL' : 'ISSUE',
      detail: input.auth.ok ? 'Auth kullanıcıları okunabiliyor' : input.auth.error || 'Auth verisi okunamadı',
      latencyMs: input.auth.latencyMs,
    },
    {
      label: 'Galeri Data API',
      status: input.galleries.ok ? 'OPERATIONAL' : 'ISSUE',
      detail: input.galleries.ok ? 'Galeri kayıtları okunabiliyor' : input.galleries.error || 'Galeri verisi okunamadı',
      latencyMs: input.galleries.latencyMs,
    },
    {
      label: 'QR olay deposu',
      status: input.qrScans.ok ? 'OPERATIONAL' : 'ISSUE',
      detail: input.qrScans.ok ? 'QR tarama olayları okunabiliyor' : input.qrScans.error || 'QR verisi okunamadı',
      latencyMs: input.qrScans.latencyMs,
    },
    {
      label: 'Lead hattı',
      status: input.leads.ok ? 'OPERATIONAL' : 'ISSUE',
      detail: input.leads.ok ? 'Lead kayıtları okunabiliyor' : input.leads.error || 'Lead verisi okunamadı',
      latencyMs: input.leads.latencyMs,
    },
    {
      label: 'Operasyon izleme',
      status: input.opsErrorCount > 0 ? 'WATCH' : 'OPERATIONAL',
      detail: input.opsErrorCount > 0 ? `${input.opsErrorCount} operasyon uyarısı izleniyor` : 'Son pencere temiz',
      latencyMs: 0,
    },
  ]
}

function getSystemHealthScore(healthChecks: PlatformDashboardHealthCheck[]) {
  const issueCount = healthChecks.filter((check) => check.status === 'ISSUE').length
  const watchCount = healthChecks.filter((check) => check.status === 'WATCH').length
  return Math.max(0, 100 - issueCount * 30 - watchCount * 10)
}

function buildRecentActivity(input: {
  galleries: GalleryRow[]
  leads: LeadRow[]
  qrScans: QrScanRow[]
  auditLogs: AuditLogRow[]
}) {
  const activities: PlatformDashboardActivity[] = []

  for (const gallery of input.galleries.slice(0, 4)) {
    if (!gallery.created_at) continue
    activities.push({
      id: `gallery:${gallery.id}`,
      type: 'gallery',
      title: 'Yeni galeri kaydı',
      detail: gallery.name,
      at: gallery.created_at,
      status: 'OPERATIONAL',
    })
  }

  for (const lead of input.leads.slice(0, 4)) {
    if (!lead.created_at) continue
    activities.push({
      id: `lead:${lead.id}`,
      type: 'lead',
      title: 'Yeni lead',
      detail: lead.customer_name || lead.source || 'Lead kaydı',
      at: lead.created_at,
      status: 'OPERATIONAL',
    })
  }

  for (const scan of input.qrScans.slice(0, 4)) {
    if (!scan.scanned_at) continue
    activities.push({
      id: `qr:${scan.id}`,
      type: 'qr',
      title: 'QR tarama',
      detail: scan.source || 'qr',
      at: scan.scanned_at,
      status: 'OPERATIONAL',
    })
  }

  for (const audit of input.auditLogs.slice(0, 4)) {
    if (!audit.created_at) continue
    activities.push({
      id: `audit:${audit.id}`,
      type: 'audit',
      title: audit.action,
      detail: audit.actor_email || audit.entity_type,
      at: audit.created_at,
      status: 'WATCH',
    })
  }

  return activities
    .sort((left, right) => (Date.parse(right.at) || 0) - (Date.parse(left.at) || 0))
    .slice(0, 8)
}

export async function getAdminDashboardSnapshot(): Promise<PlatformDashboardSnapshot> {
  requireSupabaseAdminConfig()

  const now = new Date()
  const since7Days = new Date(now.getTime() - 6 * DAY_MS).toISOString()
  const dayKeys = makeLastDays(now, 7)
  const monthKeys = makeLastMonths(now, 6)

  const auth = await timed('auth users', fetchAuthUsers)
  const galleries = await timed('galleries', fetchGalleries)
  const vehicles = await timed('vehicles', fetchVehicles)
  const qrScans = await timed('qr scans', () => fetchQrScans(since7Days))
  const recentLeads = await timed('recent leads', () => fetchLeads(since7Days))
  const allLeads = await timed('all leads', fetchAllLeads)
  const auditLogs = await timed('audit logs', fetchAuditLogs)
  const ops = getOpsSnapshot()

  const authUsers = auth.value.filter((user) => !isQaAuthMetadata(user.app_metadata))
  const galleryRows = galleries.value
  const productionGalleryIds = new Set(galleryRows.map((gallery) => gallery.id))
  const vehicleRows = vehicles.value.filter((vehicle) => vehicle.gallery_id && productionGalleryIds.has(vehicle.gallery_id))
  const productionVehicleIds = new Set(vehicleRows.map((vehicle) => vehicle.id))
  const qrScanRows = qrScans.value.filter((scan) => scan.vehicle_id && productionVehicleIds.has(scan.vehicle_id))
  const recentLeadRows = recentLeads.value.filter((lead) => lead.gallery_id && productionGalleryIds.has(lead.gallery_id))
  const allLeadRows = allLeads.value.filter((lead) => lead.gallery_id && productionGalleryIds.has(lead.gallery_id))
  const qaEmails = new Set(
    auth.value
      .filter((user) => isQaAuthMetadata(user.app_metadata))
      .map((user) => normalizeEmail(user.email))
      .filter(Boolean),
  )
  const auditRows = auditLogs.value.filter((row) => !qaEmails.has(normalizeEmail(row.actor_email)))
  const ownerEmails = new Set(galleryRows.map((gallery) => normalizeEmail(gallery.owner_email)).filter(Boolean))
  const activeUsers = authUsers.filter((user) => ownerEmails.has(normalizeEmail(user.email)) && isActiveSubscription(user))
  const trialUsers = authUsers.filter((user) => ownerEmails.has(normalizeEmail(user.email)) && isTrialSubscription(user))
  const activeEmails = new Set(activeUsers.map((user) => normalizeEmail(user.email)))
  const activeGalleries = galleryRows.filter((gallery) => activeEmails.has(normalizeEmail(gallery.owner_email)))
  const passiveGalleries = galleryRows.length - activeGalleries.length
  const todayKey = getDayKey(now)
  const totalQr = vehicleRows.filter((vehicle) => Boolean(vehicle.slug)).length
  const totalLeads = allLeads.ok ? allLeadRows.length : recentLeadRows.length
  const dailyQrScans = qrScanRows.filter((scan) => scan.scanned_at && getDayKey(scan.scanned_at) === todayKey).length
  const registrationCounts = countByKey(galleryRows, (gallery) => (gallery.created_at ? getDayKey(gallery.created_at) : null))
  const qrCounts = countByKey(qrScanRows, (scan) => (scan.scanned_at ? getDayKey(scan.scanned_at) : null))
  const leadCounts = countByKey(recentLeadRows, (lead) => (lead.created_at ? getDayKey(lead.created_at) : null))
  const subscriptionCounts = countByKey(activeUsers, (user) => {
    const date = getMetadataString(user.app_metadata, 'subscriptionUpdatedAt') || user.created_at
    return date ? getMonthKey(date) : null
  })
  const monthlyRevenue = activeUsers.reduce(
    (total, user) =>
      total
      + getMetadataNumber(user.app_metadata, ['monthlyRevenue', 'mrrAmount', 'subscriptionAmount', 'subscriptionPrice']),
    0,
  )
  const opsErrorCount =
    ops.health.error5xxCount24h
    + ops.health.uploadErrors24h
    + ops.health.storageDeleteFailures24h
    + ops.health.qrApiErrors24h
    + ops.health.leadApiErrors24h
    + ops.health.nodeLeakFailures24h
  const healthChecks = buildHealthChecks({
    auth,
    galleries,
    qrScans,
    leads: recentLeads,
    opsErrorCount,
  })
  const systemHealthScore = getSystemHealthScore(healthChecks)

  return {
    ok: true,
    source: 'supabase',
    generatedAt: now.toISOString(),
    sourceLabel: 'Canlı Supabase admin API',
    widgets: {
      totalGalleries: galleryRows.length,
      activeGalleries: activeGalleries.length,
      passiveGalleries,
      totalVehicles: vehicleRows.length,
      totalQr,
      dailyQrScans,
      totalLeads,
      monthlyRevenue,
      todayRegistrations: galleryRows.filter((gallery) => gallery.created_at && getDayKey(gallery.created_at) === todayKey).length,
      trialUsers: trialUsers.length,
      systemHealthScore,
      systemHealthLabel: systemHealthScore >= 95 ? 'Sağlıklı' : systemHealthScore >= 70 ? 'İzlemede' : 'Müdahale gerekli',
    },
    trends: {
      registrations: buildDayTrend(dayKeys, registrationCounts),
      subscriptions: buildMonthTrend(monthKeys, subscriptionCounts),
      qrUsage: buildDayTrend(dayKeys, qrCounts),
      leads: buildDayTrend(dayKeys, leadCounts),
    },
    healthChecks,
    recentActivity: buildRecentActivity({
      galleries: galleryRows,
      leads: recentLeadRows,
      qrScans: qrScanRows,
      auditLogs: auditRows,
    }),
    notes: {
      revenue: monthlyRevenue > 0
        ? 'MRR sadece auth app_metadata içindeki doğrulanabilir gelir alanlarından hesaplandı.'
        : 'Ödeme sağlayıcısı bağlı olmadığı için MRR 0 gösterilir; paket fiyatı uydurulmaz.',
      qr: 'Toplam QR, canlı araç route havuzundan; günlük tarama qr_scans kayıtlarından hesaplanır.',
      dataPolicy: 'Bu ekranda mock veri, uydurma metrik veya sabit başarı oranı kullanılmaz.',
    },
  }
}
