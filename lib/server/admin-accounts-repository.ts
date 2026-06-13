import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import { insertAuditLog } from '@/lib/security/audit'
import { hashForStorage } from '@/lib/security/request-guards'
import { ADMIN_SESSION_COOKIE_NAME, type AdminSession, type PlatformAdminRole } from '@/lib/server/admin-auth'
import { hasSupabaseAdmin, requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export type AdminAccountStatus = 'OK' | 'WATCH' | 'MISSING'
export type AdminAccountRole = PlatformAdminRole
export type AdminAccountDbStatus = 'ACTIVE' | 'FROZEN' | 'DISABLED'
export type AdminAccountSignerProvider =
  | 'ADMIN_SESSION_SECRET'
  | 'PANEL_SESSION_SECRET'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'missing'

export type AdminRuntimeAccount = {
  id: string
  username: string
  displayName: string
  role: AdminAccountRole
  source: 'env' | 'database'
  status: AdminAccountStatus
  accountStatus: AdminAccountDbStatus
  canLogin: boolean
  configuredUsername: boolean
  passwordHashConfigured: boolean
  passwordHashStatus: AdminAccountStatus
  usernameStatus: AdminAccountStatus
  sessionCookieName: string
  sessionMaxAgeSeconds: number
  sessionMaxAgeLabel: string
  signerProvider: AdminAccountSignerProvider
  signerStatus: AdminAccountStatus
  signerDetail: string
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
  lastLoginAt: string | null
  passwordRotatedAt: string | null
  sessionRevokedAt: string | null
  failedLoginCount: number
  lockedUntil: string | null
}

export type AdminAccountControl = {
  key: string
  label: string
  category: 'identity' | 'session' | 'rbac' | 'mutation'
  status: AdminAccountStatus
  required: boolean
  value: string
  detail: string
}

export type AdminAccountRoleMatrixRow = {
  role: AdminAccountRole
  label: string
  description: string
  permissionCount: number
  permissions: string[]
  criticalScopes: string[]
  canManageAdmins: boolean
}

export type AdminAccountAuditEvent = {
  id: number
  action: string
  entityType: string
  entityId: string
  actorEmail: string | null
  actorRole: string | null
  source: string
  metadataPreview: string
  createdAt: string
}

export type AdminAccountsSnapshot = {
  ok: true
  generatedAt: string
  source: 'runtime'
  currentSession: {
    username: string
    role: 'admin'
    adminRole: AdminAccountRole
    source: 'env' | 'database'
    accountId: string | null
    issuedAt: string
    expiresAt: string
  }
  stats: {
    runtimeAccounts: number
    databaseAccounts: number
    activeDatabaseAccounts: number
    currentSessions: number
    roles: number
    adminManageRoles: number
    securityWarnings: number
    requiredMissing: number
    adminAuditEvents: number
  }
  accounts: AdminRuntimeAccount[]
  controls: AdminAccountControl[]
  roleMatrix: AdminAccountRoleMatrixRow[]
  audit: {
    source: 'supabase' | 'supabase_unconfigured' | 'supabase_error'
    status: AdminAccountStatus
    loadedEvents: number
    detail: string
  }
  database: {
    source: 'supabase' | 'supabase_unconfigured' | 'supabase_error'
    status: AdminAccountStatus
    loadedAccounts: number
    detail: string
  }
  auditEvents: AdminAccountAuditEvent[]
  mutationPolicy: {
    enabled: boolean
    reason: string
    allowedActions: string[]
    disabledActions: string[]
  }
  notes: {
    dataPolicy: string
    security: string
    nextStep: string
  }
}

export type CreateAdminAccountInput = {
  username: string
  displayName: string
  role: AdminAccountRole
  status?: AdminAccountDbStatus
  adminUsername: string
}

export type UpdateAdminAccountInput = {
  accountId: string
  displayName?: string
  role?: AdminAccountRole
  status?: AdminAccountDbStatus
  resetPassword?: boolean
  revokeSessions?: boolean
  adminUsername: string
  currentSessionAccountId?: string | null
}

export type DeleteAdminAccountInput = {
  accountId: string
  adminUsername: string
  currentSessionAccountId?: string | null
}

export type AdminAccountMutationResult = {
  ok: true
  account: AdminRuntimeAccount
  temporaryPassword?: string
  message: string
}

type AuditLogRow = {
  id: number
  action: string
  entity_type: string | null
  entity_id: string | null
  actor_email: string | null
  actor_role: string | null
  source: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type AdminAccountRow = {
  id: string
  username: string
  display_name: string
  role: AdminAccountRole
  status: AdminAccountDbStatus
  password_hash: string | null
  password_hash_scheme: string | null
  password_rotated_at: string | null
  session_revoked_at: string | null
  last_login_at: string | null
  last_login_ip_hash: string | null
  failed_login_count: number | null
  locked_until: string | null
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type DbAdminCredentialResult =
  | {
      ok: true
      username: string
      accountId: string
      adminRole: AdminAccountRole
      sessionRevokedAt: string | null
    }
  | {
      ok: false
      reason: 'not_found' | 'invalid_credentials' | 'account_disabled' | 'account_locked' | 'admin_accounts_unavailable'
    }

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8
const HEX_SHA256_PATTERN = /^[a-f0-9]{64}$/i
const ADMIN_SELECT =
  'id,username,display_name,role,status,password_hash,password_hash_scheme,password_rotated_at,session_revoked_at,last_login_at,last_login_ip_hash,failed_login_count,locked_until,created_by,updated_by,deleted_at,created_at,updated_at'
const SENSITIVE_METADATA_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'hash', 'temporaryPassword'])
const ADMIN_AUDIT_ACTIONS = [
  'admin_user_delete',
  'admin_user_authorization_update',
  'admin_user_status_update',
  'admin_user_email_verify',
  'admin_user_password_reset',
  'admin_moderation_action',
  'admin_subscription_update',
  'admin_notification_send',
  'admin_account_create',
  'admin_account_update',
  'admin_account_status_update',
  'admin_account_password_reset',
  'admin_account_soft_delete',
  'admin_account_login',
  'public_slug_rotation',
]

const roleMatrix: AdminAccountRoleMatrixRow[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Süper Admin',
    description: 'Platform, RBAC, ayarlar, audit ve admin hesap yönetimi kapsamının tamamına erişir.',
    permissions: [
      'dashboard:view',
      'admins:view',
      'admins:manage',
      'tenants:view',
      'tenants:manage',
      'users:view',
      'users:manage',
      'rbac:view',
      'rbac:manage',
      'support:view',
      'support:manage',
      'finance:view',
      'audit:view',
      'settings:view',
    ],
    criticalScopes: ['Admin yönetimi', 'RBAC yönetimi', 'Ayarlar', 'Denetim kayıtları'],
    permissionCount: 14,
    canManageAdmins: true,
  },
  {
    role: 'PLATFORM_ADMIN',
    label: 'Platform Yöneticisi',
    description: 'Platform operasyonunu yönetir, admin hesap durumunu görüntüler ama admin hesabı silemez.',
    permissions: [
      'dashboard:view',
      'admins:view',
      'tenants:view',
      'tenants:manage',
      'users:view',
      'users:manage',
      'rbac:view',
      'support:view',
      'support:manage',
      'audit:view',
      'settings:view',
    ],
    criticalScopes: ['Galeri yönetimi', 'Kullanıcı yönetimi', 'Operasyon', 'Denetim kayıtları'],
    permissionCount: 11,
    canManageAdmins: false,
  },
  {
    role: 'SUPPORT_AGENT',
    label: 'Destek Uzmanı',
    description: 'Destek, moderasyon ve kullanıcı inceleme akışlarında sınırlı erişim alır.',
    permissions: ['dashboard:view', 'tenants:view', 'users:view', 'support:view', 'support:manage', 'audit:view'],
    criticalScopes: ['Destek operasyonu', 'Moderasyon', 'Denetim kayıtları'],
    permissionCount: 6,
    canManageAdmins: false,
  },
  {
    role: 'FINANCE_ADMIN',
    label: 'Finans Yöneticisi',
    description: 'Finans görünümü ve denetim kayıtlarını izler, platform ayarlarını değiştirmez.',
    permissions: ['dashboard:view', 'tenants:view', 'finance:view', 'audit:view'],
    criticalScopes: ['Finans', 'Galeri görünümü', 'Denetim kayıtları'],
    permissionCount: 4,
    canManageAdmins: false,
  },
]

function envValue(key: string) {
  return (process.env[key] || '').trim()
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function sanitizeUsername(value: string) {
  const normalized = normalizeUsername(value)
  if (!/^[a-z0-9._-]{3,64}$/.test(normalized)) {
    throw new Error('Admin kullanıcı adı 3-64 karakter olmalı; sadece harf, rakam, nokta, tire ve alt çizgi kullanılabilir.')
  }
  return normalized
}

function sanitizeDisplayName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length < 2 || normalized.length > 120) {
    throw new Error('Admin görünen adı 2-120 karakter olmalı.')
  }
  return normalized
}

function getRuntimeUsername() {
  return normalizeUsername(envValue('ADMIN_USERNAME') || 'admin')
}

function getPasswordHashStatus(): AdminAccountStatus {
  return HEX_SHA256_PATTERN.test(envValue('ADMIN_PASSWORD_SHA256')) ? 'OK' : 'MISSING'
}

function resolveSigner() {
  if (envValue('ADMIN_SESSION_SECRET')) {
    return {
      provider: 'ADMIN_SESSION_SECRET' as const,
      status: 'OK' as const,
      detail: 'Admin oturum imzası ayrı admin secret ile korunuyor.',
    }
  }

  if (envValue('PANEL_SESSION_SECRET')) {
    return {
      provider: 'PANEL_SESSION_SECRET' as const,
      status: 'WATCH' as const,
      detail: 'Admin oturumu panel secret fallback ile imzalanıyor; prod için ayrı ADMIN_SESSION_SECRET önerilir.',
    }
  }

  if (envValue('SUPABASE_SERVICE_ROLE_KEY')) {
    return {
      provider: 'SUPABASE_SERVICE_ROLE_KEY' as const,
      status: 'WATCH' as const,
      detail: 'Admin oturumu service role fallback ile imzalanıyor; secret ayrımı için ADMIN_SESSION_SECRET eklenmeli.',
    }
  }

  return {
    provider: 'missing' as const,
    status: 'MISSING' as const,
    detail: 'Admin oturum imza anahtarı eksik. Login cookie üretimi güvenli şekilde çalışmaz.',
  }
}

function getBaseSessionFields() {
  const signer = resolveSigner()
  return {
    sessionCookieName: ADMIN_SESSION_COOKIE_NAME,
    sessionMaxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    sessionMaxAgeLabel: '8 saat',
    signerProvider: signer.provider,
    signerStatus: signer.status,
    signerDetail: signer.detail,
  }
}

function buildRuntimeAccount(): AdminRuntimeAccount {
  const configuredUsername = Boolean(envValue('ADMIN_USERNAME'))
  const username = getRuntimeUsername()
  const usernameStatus: AdminAccountStatus = !configuredUsername || username === 'admin' ? 'WATCH' : 'OK'
  const passwordHashStatus = getPasswordHashStatus()
  const baseSession = getBaseSessionFields()
  const missingRequired = [passwordHashStatus, baseSession.signerStatus].includes('MISSING')
  const status: AdminAccountStatus = missingRequired
    ? 'MISSING'
    : usernameStatus === 'WATCH' || baseSession.signerStatus === 'WATCH'
      ? 'WATCH'
      : 'OK'

  return {
    id: 'runtime-env-admin',
    username,
    displayName: 'Runtime Süper Admin',
    role: 'SUPER_ADMIN',
    source: 'env',
    status,
    accountStatus: passwordHashStatus === 'OK' ? 'ACTIVE' : 'DISABLED',
    canLogin: status !== 'MISSING',
    configuredUsername,
    passwordHashConfigured: passwordHashStatus === 'OK',
    passwordHashStatus,
    usernameStatus,
    ...baseSession,
    createdAt: null,
    updatedAt: null,
    createdBy: null,
    updatedBy: null,
    lastLoginAt: null,
    passwordRotatedAt: null,
    sessionRevokedAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
  }
}

function mapDbAccount(row: AdminAccountRow): AdminRuntimeAccount {
  const baseSession = getBaseSessionFields()
  const locked = Boolean(row.locked_until && Date.parse(row.locked_until) > Date.now())
  const active = row.status === 'ACTIVE' && !row.deleted_at && !locked
  const passwordOk = Boolean(row.password_hash && row.password_hash_scheme === 'scrypt:v1')
  const status: AdminAccountStatus = active && passwordOk ? 'OK' : row.status === 'FROZEN' || locked ? 'WATCH' : 'MISSING'

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    source: 'database',
    status,
    accountStatus: row.status,
    canLogin: active && passwordOk,
    configuredUsername: true,
    passwordHashConfigured: passwordOk,
    passwordHashStatus: passwordOk ? 'OK' : 'MISSING',
    usernameStatus: 'OK',
    ...baseSession,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    lastLoginAt: row.last_login_at,
    passwordRotatedAt: row.password_rotated_at,
    sessionRevokedAt: row.session_revoked_at,
    failedLoginCount: row.failed_login_count || 0,
    lockedUntil: row.locked_until,
  }
}

function buildControls(account: AdminRuntimeAccount, database: { status: AdminAccountStatus; loadedAccounts: number }): AdminAccountControl[] {
  const productionCookie = process.env.NODE_ENV === 'production'

  return [
    {
      key: 'ADMIN_USERNAME',
      label: 'Env fallback admin kullanıcı adı',
      category: 'identity',
      status: account.usernameStatus,
      required: true,
      value: account.configuredUsername ? account.username : 'admin varsayılanı',
      detail: account.configuredUsername
        ? 'Env fallback admin kullanıcı adı ayarlı.'
        : 'ADMIN_USERNAME eksik olduğu için auth kodundaki admin varsayılanı kullanılır; prod için explicit değer önerilir.',
    },
    {
      key: 'ADMIN_PASSWORD_SHA256',
      label: 'Env fallback admin şifre hash',
      category: 'identity',
      status: account.passwordHashStatus,
      required: true,
      value: account.passwordHashConfigured ? 'Ayarlı' : 'Eksik veya geçersiz',
      detail: 'Hash değeri güvenlik gereği frontend veya API cevabında gösterilmez.',
    },
    {
      key: 'ADMIN_ACCOUNTS_TABLE',
      label: 'DB-backed admin_accounts',
      category: 'identity',
      status: database.status,
      required: false,
      value: database.status === 'OK' ? `${database.loadedAccounts} hesap` : 'Bağlı değil',
      detail: 'Çoklu admin hesabı public.admin_accounts tablosundan server-side service role ile yönetilir.',
    },
    {
      key: 'ADMIN_SESSION_SECRET',
      label: 'Session imza kaynağı',
      category: 'session',
      status: account.signerStatus,
      required: true,
      value: account.signerProvider === 'missing' ? 'Eksik' : account.signerProvider,
      detail: account.signerDetail,
    },
    {
      key: 'ADMIN_SESSION_COOKIE_FLAGS',
      label: 'Cookie güvenlik bayrakları',
      category: 'session',
      status: 'OK',
      required: true,
      value: 'HttpOnly + SameSite Strict',
      detail: 'Admin cookie JavaScript tarafından okunamaz ve cross-site gönderime kapalıdır.',
    },
    {
      key: 'ADMIN_SESSION_COOKIE_SECURE',
      label: 'Secure cookie modu',
      category: 'session',
      status: productionCookie ? 'OK' : 'WATCH',
      required: false,
      value: productionCookie ? 'Prod secure' : 'Local secure kapalı',
      detail: productionCookie
        ? 'NODE_ENV=production olduğu için cookie sadece HTTPS üzerinde gönderilir.'
        : 'Local geliştirme modunda HTTPS zorunlu değildir; prod build secure cookie kullanır.',
    },
    {
      key: 'RBAC_ROLE_MATRIX',
      label: 'RBAC rol matrisi',
      category: 'rbac',
      status: roleMatrix.length === 4 ? 'OK' : 'MISSING',
      required: true,
      value: `${roleMatrix.length} rol`,
      detail: 'SUPER_ADMIN, PLATFORM_ADMIN, SUPPORT_AGENT ve FINANCE_ADMIN izinleri kod sözleşmesiyle tanımlı.',
    },
    {
      key: 'ADMIN_ACCOUNT_MUTATIONS',
      label: 'Admin hesap mutasyonları',
      category: 'mutation',
      status: database.status === 'OK' ? 'OK' : 'WATCH',
      required: false,
      value: database.status === 'OK' ? 'Aktif' : 'Migration bekliyor',
      detail: 'Create/update/reset/soft delete aksiyonları sadece korumalı admin API üzerinden çalışır.',
    },
  ]
}

function clip(value: string, length = 220) {
  if (value.length <= length) return value
  return `${value.slice(0, length)}...`
}

function buildMetadataPreview(metadata: Record<string, unknown> | null) {
  if (!metadata) return 'Metadata yok'

  const safeMetadata: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEYS.has(key.toLowerCase())) continue
    safeMetadata[key] = value
  }

  const text = JSON.stringify(safeMetadata)
  return text === '{}' ? 'Metadata yok' : clip(text)
}

function mapAuditRow(row: AuditLogRow): AdminAccountAuditEvent {
  return {
    id: row.id,
    action: row.action || 'unknown',
    entityType: row.entity_type || 'system',
    entityId: row.entity_id || 'unknown',
    actorEmail: row.actor_email || null,
    actorRole: row.actor_role || null,
    source: row.source || 'unknown',
    metadataPreview: buildMetadataPreview(row.metadata),
    createdAt: row.created_at || new Date(0).toISOString(),
  }
}

function generateTemporaryPassword() {
  return `Cg-${randomBytes(15).toString('base64url')}`
}

function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const key = scryptSync(password, salt, 64).toString('base64url')
  return `scrypt:v1:${salt}:${key}`
}

function verifyPasswordHash(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false
  const [scheme, version, salt, key] = storedHash.split(':')
  if (scheme !== 'scrypt' || version !== 'v1' || !salt || !key) return false

  const candidate = scryptSync(password, salt, 64).toString('base64url')
  const left = Buffer.from(candidate)
  const right = Buffer.from(key)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

async function fetchDbAdminAccounts() {
  if (!hasSupabaseAdmin()) {
    return {
      source: 'supabase_unconfigured' as const,
      status: 'MISSING' as const,
      detail: 'Supabase service role yapılandırması eksik olduğu için DB admin hesapları okunamadı.',
      accounts: [] as AdminRuntimeAccount[],
      rows: [] as AdminAccountRow[],
    }
  }

  try {
    const rows = await supabaseAdminFetch<AdminAccountRow[]>({
      path: '/rest/v1/admin_accounts',
      query: {
        select: ADMIN_SELECT,
        deleted_at: 'is.null',
        order: 'created_at.desc',
        limit: '200',
      },
    })

    return {
      source: 'supabase' as const,
      status: 'OK' as const,
      detail: 'Admin hesapları Supabase admin_accounts tablosundan okundu.',
      accounts: rows.map(mapDbAccount),
      rows,
    }
  } catch (error) {
    return {
      source: 'supabase_error' as const,
      status: 'WATCH' as const,
      detail: `admin_accounts okunamadı. Migration uygulanmamış olabilir: ${clip(error instanceof Error ? error.message : 'Bilinmeyen hata', 180)}`,
      accounts: [] as AdminRuntimeAccount[],
      rows: [] as AdminAccountRow[],
    }
  }
}

async function fetchAdminAccountById(accountId: string) {
  const rows = await supabaseAdminFetch<AdminAccountRow[]>({
    path: '/rest/v1/admin_accounts',
    query: {
      select: ADMIN_SELECT,
      id: `eq.${accountId}`,
      deleted_at: 'is.null',
      limit: '1',
    },
  })

  return rows[0] || null
}

async function fetchAdminAccountByUsername(username: string) {
  const rows = await supabaseAdminFetch<AdminAccountRow[]>({
    path: '/rest/v1/admin_accounts',
    query: {
      select: ADMIN_SELECT,
      username: `eq.${username}`,
      deleted_at: 'is.null',
      limit: '1',
    },
  })

  return rows[0] || null
}

async function countActiveSuperAdmins(excludeAccountId?: string) {
  const rows = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/admin_accounts',
    query: {
      select: 'id',
      role: 'eq.SUPER_ADMIN',
      status: 'eq.ACTIVE',
      deleted_at: 'is.null',
      limit: '100',
    },
  })

  return rows.filter((row) => row.id !== excludeAccountId).length
}

async function assertAdminAccountSafeToRestrict(account: AdminAccountRow, currentSessionAccountId?: string | null) {
  if (currentSessionAccountId && account.id === currentSessionAccountId) {
    throw new Error('Kendi aktif admin hesabınızı bu işlemle kısıtlayamazsınız.')
  }

  if (account.role === 'SUPER_ADMIN') {
    const remainingSuperAdmins = await countActiveSuperAdmins(account.id)
    if (remainingSuperAdmins < 1) {
      throw new Error('Son aktif Süper Admin hesabı kısıtlanamaz veya silinemez.')
    }
  }
}

async function loadAdminAuditEvents() {
  if (!hasSupabaseAdmin()) {
    return {
      source: 'supabase_unconfigured' as const,
      status: 'MISSING' as const,
      detail: 'Supabase service role yapılandırması eksik olduğu için admin audit olayları okunamadı.',
      events: [] as AdminAccountAuditEvent[],
    }
  }

  try {
    const rows = await supabaseAdminFetch<AuditLogRow[]>({
      path: '/rest/v1/audit_logs',
      query: {
        select: 'id,action,entity_type,entity_id,actor_email,actor_role,source,metadata,created_at',
        action: `in.(${ADMIN_AUDIT_ACTIONS.join(',')})`,
        order: 'created_at.desc',
        limit: '25',
      },
    })

    return {
      source: 'supabase' as const,
      status: 'OK' as const,
      detail: 'Admin güvenlik ve operasyon olayları Supabase audit_logs tablosundan okundu.',
      events: rows.map(mapAuditRow),
    }
  } catch (error) {
    return {
      source: 'supabase_error' as const,
      status: 'WATCH' as const,
      detail: `audit_logs okunamadı: ${clip(error instanceof Error ? error.message : 'Bilinmeyen hata', 160)}`,
      events: [] as AdminAccountAuditEvent[],
    }
  }
}

export async function verifyAdminAccountCredentials(input: {
  username: string
  password: string
  ip?: string
  userAgent?: string
}): Promise<DbAdminCredentialResult> {
  if (!hasSupabaseAdmin()) return { ok: false, reason: 'admin_accounts_unavailable' }

  try {
    const username = sanitizeUsername(input.username)
    const account = await fetchAdminAccountByUsername(username)
    if (!account) return { ok: false, reason: 'not_found' }

    if (account.status !== 'ACTIVE' || account.deleted_at) {
      return { ok: false, reason: 'account_disabled' }
    }

    if (account.locked_until && Date.parse(account.locked_until) > Date.now()) {
      return { ok: false, reason: 'account_locked' }
    }

    if (!verifyPasswordHash(input.password, account.password_hash)) {
      const failedLoginCount = (account.failed_login_count || 0) + 1
      const lockedUntil = failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
      await supabaseAdminFetch<unknown>({
        method: 'PATCH',
        path: '/rest/v1/admin_accounts',
        query: {
          id: `eq.${account.id}`,
        },
        body: {
          failed_login_count: failedLoginCount,
          locked_until: lockedUntil,
        },
        prefer: 'return=minimal',
      })
      return { ok: false, reason: lockedUntil ? 'account_locked' : 'invalid_credentials' }
    }

    const now = new Date().toISOString()
    await supabaseAdminFetch<unknown>({
      method: 'PATCH',
      path: '/rest/v1/admin_accounts',
      query: {
        id: `eq.${account.id}`,
      },
      body: {
        last_login_at: now,
        last_login_ip_hash: input.ip ? hashForStorage(input.ip) : null,
        failed_login_count: 0,
        locked_until: null,
      },
      prefer: 'return=minimal',
    })

    await insertAuditLog({
      action: 'admin_account_login',
      entityType: 'admin_account',
      entityId: account.id,
      actorEmail: account.username,
      actorRole: account.role,
      source: 'admin',
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        username: account.username,
        role: account.role,
        loginAt: now,
      },
    })

    return {
      ok: true,
      username: account.username,
      accountId: account.id,
      adminRole: account.role,
      sessionRevokedAt: account.session_revoked_at,
    }
  } catch {
    return { ok: false, reason: 'admin_accounts_unavailable' }
  }
}

export async function createAdminAccount(input: CreateAdminAccountInput): Promise<AdminAccountMutationResult> {
  requireSupabaseAdminConfig()

  const username = sanitizeUsername(input.username)
  const displayName = sanitizeDisplayName(input.displayName)
  const temporaryPassword = generateTemporaryPassword()
  const now = new Date().toISOString()
  const passwordHash = createPasswordHash(temporaryPassword)

  const rows = await supabaseAdminFetch<AdminAccountRow[]>({
    method: 'POST',
    path: '/rest/v1/admin_accounts',
    query: {
      select: ADMIN_SELECT,
    },
    body: {
      username,
      display_name: displayName,
      role: input.role,
      status: input.status || 'ACTIVE',
      password_hash: passwordHash,
      password_hash_scheme: 'scrypt:v1',
      password_rotated_at: now,
      created_by: input.adminUsername,
      updated_by: input.adminUsername,
    },
    prefer: 'return=representation',
  })

  const account = rows[0]
  if (!account) throw new Error('Admin hesabı oluşturuldu fakat kayıt geri okunamadı.')

  await insertAuditLog({
    action: 'admin_account_create',
    entityType: 'admin_account',
    entityId: account.id,
    actorEmail: input.adminUsername,
    actorRole: 'SUPER_ADMIN',
    source: 'admin',
    metadata: {
      username,
      displayName,
      role: input.role,
      status: input.status || 'ACTIVE',
      passwordDelivery: 'temporary_password_returned_once',
    },
  })

  return {
    ok: true,
    account: mapDbAccount(account),
    temporaryPassword,
    message: 'Admin hesabı oluşturuldu. Geçici parola sadece bu cevapta gösterilir.',
  }
}

export async function updateAdminAccount(input: UpdateAdminAccountInput): Promise<AdminAccountMutationResult> {
  requireSupabaseAdminConfig()

  const account = await fetchAdminAccountById(input.accountId)
  if (!account) throw new Error('Admin hesabı bulunamadı.')

  const body: Record<string, unknown> = {
    updated_by: input.adminUsername,
  }
  const auditAction = input.status && input.status !== account.status ? 'admin_account_status_update' : 'admin_account_update'
  const temporaryPassword = input.resetPassword ? generateTemporaryPassword() : undefined

  if (input.displayName !== undefined) body.display_name = sanitizeDisplayName(input.displayName)
  if (input.role !== undefined) body.role = input.role
  if (input.status !== undefined) {
    if (input.status !== 'ACTIVE') {
      await assertAdminAccountSafeToRestrict(account, input.currentSessionAccountId)
    }
    body.status = input.status
  }
  if (input.resetPassword && temporaryPassword) {
    body.password_hash = createPasswordHash(temporaryPassword)
    body.password_hash_scheme = 'scrypt:v1'
    body.password_rotated_at = new Date().toISOString()
    body.failed_login_count = 0
    body.locked_until = null
  }
  if (input.revokeSessions) {
    body.session_revoked_at = new Date().toISOString()
  }

  const rows = await supabaseAdminFetch<AdminAccountRow[]>({
    method: 'PATCH',
    path: '/rest/v1/admin_accounts',
    query: {
      id: `eq.${input.accountId}`,
      deleted_at: 'is.null',
      select: ADMIN_SELECT,
    },
    body,
    prefer: 'return=representation',
  })

  const updated = rows[0]
  if (!updated) throw new Error('Admin hesabı güncellendi fakat kayıt geri okunamadı.')

  await insertAuditLog({
    action: input.resetPassword ? 'admin_account_password_reset' : auditAction,
    entityType: 'admin_account',
    entityId: updated.id,
    actorEmail: input.adminUsername,
    actorRole: 'SUPER_ADMIN',
    source: 'admin',
    metadata: {
      username: updated.username,
      previous: {
        role: account.role,
        status: account.status,
        displayName: account.display_name,
      },
      next: {
        role: updated.role,
        status: updated.status,
        displayName: updated.display_name,
        passwordReset: Boolean(input.resetPassword),
        sessionsRevoked: Boolean(input.revokeSessions),
      },
    },
  })

  return {
    ok: true,
    account: mapDbAccount(updated),
    temporaryPassword,
    message: temporaryPassword
      ? 'Admin hesabı güncellendi ve yeni geçici parola üretildi. Parola sadece bu cevapta gösterilir.'
      : 'Admin hesabı güncellendi.',
  }
}

export async function softDeleteAdminAccount(input: DeleteAdminAccountInput): Promise<AdminAccountMutationResult> {
  requireSupabaseAdminConfig()

  const account = await fetchAdminAccountById(input.accountId)
  if (!account) throw new Error('Admin hesabı bulunamadı.')
  await assertAdminAccountSafeToRestrict(account, input.currentSessionAccountId)

  const now = new Date().toISOString()
  const rows = await supabaseAdminFetch<AdminAccountRow[]>({
    method: 'PATCH',
    path: '/rest/v1/admin_accounts',
    query: {
      id: `eq.${input.accountId}`,
      deleted_at: 'is.null',
      select: ADMIN_SELECT,
    },
    body: {
      status: 'DISABLED',
      deleted_at: now,
      session_revoked_at: now,
      updated_by: input.adminUsername,
    },
    prefer: 'return=representation',
  })

  const deleted = rows[0]
  if (!deleted) throw new Error('Admin hesabı silindi fakat kayıt geri okunamadı.')

  await insertAuditLog({
    action: 'admin_account_soft_delete',
    entityType: 'admin_account',
    entityId: deleted.id,
    actorEmail: input.adminUsername,
    actorRole: 'SUPER_ADMIN',
    source: 'admin',
    metadata: {
      username: deleted.username,
      role: deleted.role,
      deletedAt: now,
    },
  })

  return {
    ok: true,
    account: mapDbAccount(deleted),
    message: 'Admin hesabı soft delete ile kapatıldı ve oturumları revoke edildi.',
  }
}

export async function getAdminAccountsSnapshot(session: AdminSession): Promise<AdminAccountsSnapshot> {
  const runtimeAccount = buildRuntimeAccount()
  const database = await fetchDbAdminAccounts()
  const controls = buildControls(runtimeAccount, {
    status: database.status,
    loadedAccounts: database.accounts.length,
  })
  const audit = await loadAdminAuditEvents()
  const accounts = [runtimeAccount, ...database.accounts]
  const securityWarnings = controls.filter((control) => control.status !== 'OK').length + accounts.filter((account) => account.status !== 'OK').length
  const requiredMissing = controls.filter((control) => control.required && control.status === 'MISSING').length

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'runtime',
    currentSession: {
      username: session.username,
      role: session.role,
      adminRole: session.adminRole,
      source: session.source,
      accountId: session.accountId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    },
    stats: {
      runtimeAccounts: 1,
      databaseAccounts: database.accounts.length,
      activeDatabaseAccounts: database.accounts.filter((account) => account.accountStatus === 'ACTIVE').length,
      currentSessions: 1,
      roles: roleMatrix.length,
      adminManageRoles: roleMatrix.filter((role) => role.canManageAdmins).length,
      securityWarnings,
      requiredMissing,
      adminAuditEvents: audit.events.length,
    },
    accounts,
    controls,
    roleMatrix,
    audit: {
      source: audit.source,
      status: audit.status,
      loadedEvents: audit.events.length,
      detail: audit.detail,
    },
    database: {
      source: database.source,
      status: database.status,
      loadedAccounts: database.accounts.length,
      detail: database.detail,
    },
    auditEvents: audit.events,
    mutationPolicy: {
      enabled: database.status === 'OK',
      reason:
        database.status === 'OK'
          ? 'DB-backed admin_accounts aktif; create/update/reset/soft delete aksiyonları gerçek API üzerinden çalışır.'
          : 'admin_accounts migration canlı veritabanına uygulanmadan admin CRUD açılmaz.',
      allowedActions:
        database.status === 'OK'
          ? ['Admin oluştur', 'Rol/durum güncelle', 'Geçici parola üret', 'Oturumları revoke et', 'Soft delete']
          : ['Runtime admin durumunu görüntüle', 'RBAC kapsamını incele', 'Admin audit olaylarını oku'],
      disabledActions: database.status === 'OK' ? [] : ['Admin oluştur', 'Admin rolü değiştir', 'Admin şifresi değiştir', 'Admin sil veya askıya al'],
    },
    notes: {
      dataPolicy: 'Bu modül mock admin listesi üretmez; env fallback ve varsa canlı admin_accounts kayıtlarını gösterir.',
      security: 'ADMIN_PASSWORD_SHA256, DB password_hash ve secret değerler API cevabına eklenmez.',
      nextStep: 'Migration prod veritabanına uygulandıktan sonra yeni admin hesapları panelden yönetilebilir.',
    },
  }
}
