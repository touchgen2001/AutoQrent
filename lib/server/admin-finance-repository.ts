import {
  ADMIN_SUBSCRIPTION_PLANS,
  ADMIN_SUBSCRIPTION_STATUSES,
  type AdminSubscriptionPlan,
  type AdminSubscriptionStatus,
  isAdminSubscriptionPlan,
  isAdminSubscriptionStatus,
} from '@/lib/admin-user-types'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { normalizeSubscriptionPlanCode, normalizeSubscriptionStatus } from '@/lib/subscription-plans'

type AuthUserRow = {
  id: string
  email?: string | null
  phone?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
  banned_until?: string | null
  user_metadata?: Record<string, unknown> | null
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

type AuditLogRow = {
  id: number
  action: string
  entity_type: string
  entity_id: string
  actor_email: string | null
  source: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export type AdminFinancePlan = AdminSubscriptionPlan | 'unknown'
export type AdminFinanceStatus = AdminSubscriptionStatus | 'unknown'

export type AdminFinanceAccount = {
  userId: string
  email: string
  fullName: string | null
  phone: string | null
  galleryId: string | null
  galleryName: string | null
  plan: AdminFinancePlan
  status: AdminFinanceStatus
  monthlyRevenue: number
  revenueSource: string | null
  subscriptionUpdatedAt: string | null
  createdAt: string | null
  lastSignInAt: string | null
  banned: boolean
  accessStatus: string
  riskLevel: 'OK' | 'WATCH' | 'RISK'
  riskReason: string
}

export type AdminFinanceBreakdownRow = {
  key: AdminFinancePlan | AdminFinanceStatus
  label: string
  totalAccounts: number
  activeAccounts: number
  trialAccounts: number
  pastDueAccounts: number
  cancelledAccounts: number
  monthlyRevenue: number
  unpricedAccounts: number
}

export type AdminFinanceAuditEvent = {
  id: string
  action: string
  actor: string
  target: string
  detail: string
  createdAt: string
}

export type AdminFinanceSnapshot = {
  ok: true
  generatedAt: string
  source: 'supabase'
  widgets: {
    monthlyRevenue: number
    billableAccounts: number
    activeAccounts: number
    trialAccounts: number
    pastDueAccounts: number
    cancelledAccounts: number
    unpricedActiveAccounts: number
    galleriesWithOwner: number
  }
  planBreakdown: AdminFinanceBreakdownRow[]
  statusBreakdown: AdminFinanceBreakdownRow[]
  accounts: AdminFinanceAccount[]
  auditEvents: AdminFinanceAuditEvent[]
  notes: {
    revenue: string
    paymentProvider: string
    dataPolicy: string
  }
}

const AUTH_USERS_PAGE_SIZE = 100
const MAX_AUTH_USERS = 5000
const DATA_ROW_LIMIT = 20000
const AUDIT_LIMIT = 80
const REVENUE_METADATA_KEYS = ['monthlyRevenue', 'mrrAmount', 'subscriptionAmount', 'subscriptionPrice'] as const

const planLabels: Record<AdminFinancePlan, string> = {
  starter: 'Başlangıç',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Kurumsal',
  unknown: 'Paket tanımsız',
}

const statusLabels: Record<AdminFinanceStatus, string> = {
  trialing: 'Deneme',
  active: 'Aktif',
  past_due: 'Ödeme bekliyor',
  canceled: 'İptal',
  expired: 'Süresi doldu',
  suspended: 'Askıya alındı',
  unknown: 'Durum tanımsız',
}

function extractAuthUsers(response: AuthUsersResponse) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response.users)) return response.users
  if (Array.isArray(response.data?.users)) return response.data.users
  return []
}

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null

  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function getMetadataNumber(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return { amount: 0, source: null as string | null }

  for (const key of REVENUE_METADATA_KEYS) {
    const value = metadata[key]
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN
    if (Number.isFinite(amount) && amount > 0) {
      return {
        amount,
        source: `app_metadata.${key}`,
      }
    }
  }

  return {
    amount: 0,
    source: null,
  }
}

function getPlan(metadata: Record<string, unknown> | null | undefined): AdminFinancePlan {
  const value = metadata?.subscriptionPlan
  if (isAdminSubscriptionPlan(value)) return value
  if (typeof value === 'string' && value.trim()) return normalizeSubscriptionPlanCode(value)
  return 'unknown'
}

function getStatus(metadata: Record<string, unknown> | null | undefined): AdminFinanceStatus {
  const value = metadata?.subscriptionStatus
  if (isAdminSubscriptionStatus(value)) return value
  if (typeof value === 'string' && value.trim()) return normalizeSubscriptionStatus(value)
  return 'unknown'
}

function isBanned(user: AuthUserRow) {
  return Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now())
}

function getAccessStatus(metadata: Record<string, unknown> | null | undefined) {
  return getMetadataString(metadata, ['accessStatus']) || 'unknown'
}

async function fetchAuthUsers() {
  const users: AuthUserRow[] = []
  let page = 1

  while (users.length < MAX_AUTH_USERS) {
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

  return users.slice(0, MAX_AUTH_USERS)
}

function fetchGalleries() {
  return supabaseAdminFetch<GalleryRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,owner_email,created_at',
      order: 'created_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function fetchAuditLogs() {
  return supabaseAdminFetch<AuditLogRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'id,action,entity_type,entity_id,actor_email,source,metadata,created_at',
      order: 'created_at.desc',
      limit: AUDIT_LIMIT,
    },
  })
}

function buildGalleryByOwnerEmail(galleries: GalleryRow[]) {
  const map = new Map<string, GalleryRow>()

  for (const gallery of galleries) {
    const ownerEmail = normalizeEmail(gallery.owner_email)
    if (ownerEmail && !map.has(ownerEmail)) {
      map.set(ownerEmail, gallery)
    }
  }

  return map
}

function getRisk(input: {
  status: AdminFinanceStatus
  banned: boolean
  accessStatus: string
  monthlyRevenue: number
}): Pick<AdminFinanceAccount, 'riskLevel' | 'riskReason'> {
  if (input.banned || input.accessStatus === 'suspended') {
    return {
      riskLevel: 'RISK',
      riskReason: 'Hesap erişimi askıda veya banlı.',
    }
  }

  if (input.status === 'past_due') {
    return {
      riskLevel: 'RISK',
      riskReason: 'Abonelik ödeme bekliyor.',
    }
  }

  if (input.status === 'canceled') {
    return {
      riskLevel: 'WATCH',
      riskReason: 'Abonelik iptal durumunda.',
    }
  }

  if (input.status === 'active' && input.monthlyRevenue <= 0) {
    return {
      riskLevel: 'WATCH',
      riskReason: 'Aktif abonelikte doğrulanmış aylık tutar yok.',
    }
  }

  return {
    riskLevel: 'OK',
    riskReason: 'Finans kaydı izlenebilir durumda.',
  }
}

function mapAccount(user: AuthUserRow, galleryByOwnerEmail: Map<string, GalleryRow>): AdminFinanceAccount | null {
  const email = normalizeEmail(user.email)
  if (!email) return null

  const plan = getPlan(user.app_metadata)
  const status = getStatus(user.app_metadata)
  const accessStatus = getAccessStatus(user.app_metadata)
  const revenue = getMetadataNumber(user.app_metadata)
  const banned = isBanned(user)
  const gallery = galleryByOwnerEmail.get(email) || null
  const risk = getRisk({
    status,
    banned,
    accessStatus,
    monthlyRevenue: revenue.amount,
  })

  return {
    userId: user.id,
    email,
    fullName: getMetadataString(user.user_metadata, ['fullName', 'full_name', 'name']),
    phone: user.phone || getMetadataString(user.user_metadata, ['phone', 'phoneNumber']),
    galleryId: gallery?.id || null,
    galleryName: gallery?.name || null,
    plan,
    status,
    monthlyRevenue: revenue.amount,
    revenueSource: revenue.source,
    subscriptionUpdatedAt: getMetadataString(user.app_metadata, ['subscriptionUpdatedAt']),
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
    banned,
    accessStatus,
    ...risk,
  }
}

function createBreakdownRow(key: AdminFinancePlan | AdminFinanceStatus, label: string): AdminFinanceBreakdownRow {
  return {
    key,
    label,
    totalAccounts: 0,
    activeAccounts: 0,
    trialAccounts: 0,
    pastDueAccounts: 0,
    cancelledAccounts: 0,
    monthlyRevenue: 0,
    unpricedAccounts: 0,
  }
}

function updateBreakdown(row: AdminFinanceBreakdownRow, account: AdminFinanceAccount) {
  row.totalAccounts += 1
  row.monthlyRevenue += account.monthlyRevenue

  if (account.status === 'active') row.activeAccounts += 1
  if (account.status === 'trialing') row.trialAccounts += 1
  if (account.status === 'past_due') row.pastDueAccounts += 1
  if (account.status === 'canceled') row.cancelledAccounts += 1
  if (account.status === 'active' && account.monthlyRevenue <= 0) row.unpricedAccounts += 1
}

function buildPlanBreakdown(accounts: AdminFinanceAccount[]) {
  const rows = new Map<AdminFinancePlan, AdminFinanceBreakdownRow>()

  for (const plan of [...ADMIN_SUBSCRIPTION_PLANS, 'unknown'] as AdminFinancePlan[]) {
    rows.set(plan, createBreakdownRow(plan, planLabels[plan]))
  }

  for (const account of accounts) {
    updateBreakdown(rows.get(account.plan)!, account)
  }

  return Array.from(rows.values())
}

function buildStatusBreakdown(accounts: AdminFinanceAccount[]) {
  const rows = new Map<AdminFinanceStatus, AdminFinanceBreakdownRow>()

  for (const status of [...ADMIN_SUBSCRIPTION_STATUSES, 'unknown'] as AdminFinanceStatus[]) {
    rows.set(status, createBreakdownRow(status, statusLabels[status]))
  }

  for (const account of accounts) {
    updateBreakdown(rows.get(account.status)!, account)
  }

  return Array.from(rows.values())
}

function getAuditDetail(row: AuditLogRow) {
  const metadata = row.metadata || {}
  const next = metadata.next
  const previous = metadata.previous

  if (row.action === 'admin_subscription_update') {
    return `Abonelik güncellendi: ${JSON.stringify(previous || {})} -> ${JSON.stringify(next || {})}`
  }

  return getMetadataString(metadata, ['note', 'reason', 'messagePreview', 'operation']) || row.entity_type
}

function buildAuditEvents(rows: AuditLogRow[]): AdminFinanceAuditEvent[] {
  const financeActions = new Set([
    'admin_subscription_update',
    'admin_user_authorization_update',
    'admin_user_status_update',
    'admin_notification_send',
  ])

  return rows
    .filter((row) => financeActions.has(row.action))
    .slice(0, 18)
    .map((row) => ({
      id: `finance-audit-${row.id}`,
      action: row.action,
      actor: row.actor_email || row.source || 'Sistem',
      target: getMetadataString(row.metadata, ['email', 'targetEmail', 'ownerEmail']) || row.entity_id,
      detail: getAuditDetail(row),
      createdAt: row.created_at || new Date(0).toISOString(),
    }))
}

export async function getAdminFinanceSnapshot(): Promise<AdminFinanceSnapshot> {
  requireSupabaseAdminConfig()

  const authUsers = await fetchAuthUsers()
  const galleries = await fetchGalleries()
  const auditRows = await fetchAuditLogs()
  const galleryByOwnerEmail = buildGalleryByOwnerEmail(galleries)
  const accounts = authUsers
    .map((user) => mapAccount(user, galleryByOwnerEmail))
    .filter((account): account is AdminFinanceAccount => Boolean(account))
    .sort((left, right) => {
      if (left.riskLevel !== right.riskLevel) {
        const order = { RISK: 0, WATCH: 1, OK: 2 }
        return order[left.riskLevel] - order[right.riskLevel]
      }

      return right.monthlyRevenue - left.monthlyRevenue
    })

  const monthlyRevenue = accounts.reduce((total, account) => total + account.monthlyRevenue, 0)
  const activeAccounts = accounts.filter((account) => account.status === 'active').length

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    widgets: {
      monthlyRevenue,
      billableAccounts: accounts.filter((account) => account.status === 'active' && account.monthlyRevenue > 0).length,
      activeAccounts,
      trialAccounts: accounts.filter((account) => account.status === 'trialing').length,
      pastDueAccounts: accounts.filter((account) => account.status === 'past_due').length,
      cancelledAccounts: accounts.filter((account) => account.status === 'canceled').length,
      unpricedActiveAccounts: accounts.filter((account) => account.status === 'active' && account.monthlyRevenue <= 0).length,
      galleriesWithOwner: accounts.filter((account) => Boolean(account.galleryId)).length,
    },
    planBreakdown: buildPlanBreakdown(accounts),
    statusBreakdown: buildStatusBreakdown(accounts),
    accounts: accounts.slice(0, 80),
    auditEvents: buildAuditEvents(auditRows),
    notes: {
      revenue:
        'MRR sadece Supabase Auth app_metadata içindeki açık sayısal abonelik tutarlarından hesaplanır. Paket fiyatı uydurulmaz.',
      paymentProvider:
        monthlyRevenue > 0
          ? 'Doğrulanmış tutarlar app_metadata alanından okunuyor; ödeme sağlayıcısı mutabakatı ayrıca bağlanmalıdır.'
          : 'Ödeme sağlayıcısı bağlı değil veya app_metadata içinde doğrulanmış tutar yok; MRR 0 gösterilir.',
      dataPolicy: 'Finans panelinde mock veri, sabit paket fiyatı veya tahmini gelir kullanılmaz.',
    },
  }
}
