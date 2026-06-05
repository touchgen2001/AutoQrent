export type AdminAccountStatus = 'OK' | 'WATCH' | 'MISSING'
export type AdminAccountRole = 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'SUPPORT_AGENT' | 'FINANCE_ADMIN'
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

export type AdminAccountCreateInput = {
  username: string
  displayName: string
  role: AdminAccountRole
  status?: AdminAccountDbStatus
}

export type AdminAccountUpdateInput = {
  displayName?: string
  role?: AdminAccountRole
  status?: AdminAccountDbStatus
  resetPassword?: boolean
  revokeSessions?: boolean
}

export type AdminAccountMutationResult = {
  ok: true
  account: AdminRuntimeAccount
  temporaryPassword?: string
  message: string
}

export const adminAccountStatusLabels: Record<AdminAccountStatus, string> = {
  OK: 'Hazır',
  WATCH: 'İzle',
  MISSING: 'Eksik',
}

export const adminAccountDbStatusLabels: Record<AdminAccountDbStatus, string> = {
  ACTIVE: 'Aktif',
  FROZEN: 'Donduruldu',
  DISABLED: 'Devre dışı',
}

export const adminAccountRoleLabels: Record<AdminAccountRole, string> = {
  SUPER_ADMIN: 'Süper Admin',
  PLATFORM_ADMIN: 'Platform Yöneticisi',
  SUPPORT_AGENT: 'Destek Uzmanı',
  FINANCE_ADMIN: 'Finans Yöneticisi',
}

export const adminAccountControlCategoryLabels: Record<AdminAccountControl['category'], string> = {
  identity: 'Kimlik',
  session: 'Oturum',
  rbac: 'Rol yetkisi',
  mutation: 'Değişiklik',
}

export const adminAccountSignerLabels: Record<AdminAccountSignerProvider, string> = {
  ADMIN_SESSION_SECRET: 'Ayrı admin gizli anahtarı', // pragma: allowlist secret
  PANEL_SESSION_SECRET: 'Panel gizli anahtar yedeği', // pragma: allowlist secret
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase servis anahtarı yedeği',
  missing: 'Eksik',
}
