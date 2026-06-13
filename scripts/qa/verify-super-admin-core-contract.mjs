#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const appRoot = path.join(projectRoot, 'apps/super-admin')

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8')
}

function exists(relPath) {
  return fs.existsSync(path.join(projectRoot, relPath))
}

const app = read('apps/super-admin/src/App.tsx')
const rbac = read('apps/super-admin/src/lib/rbac.ts')
const auth = read('apps/super-admin/src/lib/auth.tsx')
const layout = read('apps/super-admin/src/components/layout/super-admin-layout.tsx')
const login = read('apps/super-admin/src/pages/login-page.tsx')
const unauthorized = read('apps/super-admin/src/pages/unauthorized-page.tsx')
const forbidden = read('apps/super-admin/src/pages/forbidden-page.tsx')
const placeholder = read('apps/super-admin/src/pages/module-placeholder-page.tsx')
const tenantPage = read('apps/super-admin/src/pages/tenant-management-page.tsx')
const userPage = read('apps/super-admin/src/pages/user-management-page.tsx')
const platformApi = read('apps/super-admin/src/lib/platform-api.ts')
const platformAuditTypes = read('apps/super-admin/src/lib/platform-audit-types.ts')
const platformDashboardTypes = read('apps/super-admin/src/lib/platform-dashboard-types.ts')
const platformFinanceTypes = read('apps/super-admin/src/lib/platform-finance-types.ts')
const platformOperationsTypes = read('apps/super-admin/src/lib/platform-operations-types.ts')
const platformSettingsTypes = read('apps/super-admin/src/lib/platform-settings-types.ts')
const platformAdminAccountTypes = read('apps/super-admin/src/lib/platform-admin-account-types.ts')
const platformTenantTypes = read('apps/super-admin/src/lib/platform-tenant-types.ts')
const platformUserTypes = read('apps/super-admin/src/lib/platform-user-types.ts')
const superAdminBundleBudget = read('scripts/qa/verify-super-admin-bundle-budget.mjs')
const criticalActionConfirmation = read('apps/super-admin/src/components/platform/critical-action-confirmation.tsx')
const adminAccountsRepository = read('lib/server/admin-accounts-repository.ts')
const adminAccountsRoute = read('app/api/admin/accounts/route.ts')
const adminAccountRoute = read('app/api/admin/accounts/[accountId]/route.ts')
const adminAccountMigration = read('supabase/migrations/20260603095234_admin_accounts_system.sql')
const adminAuditRepository = read('lib/server/admin-audit-repository.ts')
const adminAuditRoute = read('app/api/admin/audit/route.ts')
const adminDashboardRepository = read('lib/server/admin-dashboard-repository.ts')
const adminDashboardRoute = read('app/api/admin/dashboard/route.ts')
const adminFinanceRepository = read('lib/server/admin-finance-repository.ts')
const adminFinanceRoute = read('app/api/admin/finance/route.ts')
const adminOperationsRepository = read('lib/server/admin-operations-repository.ts')
const adminOperationsRoute = read('app/api/admin/operations/route.ts')
const adminOperationsModerationRoute = read('app/api/admin/operations/moderation/route.ts')
const adminSettingsRepository = read('lib/server/admin-settings-repository.ts')
const adminSettingsRoute = read('app/api/admin/settings/route.ts')
const adminUsersRepository = read('lib/server/admin-users-repository.ts')
const adminUsersRoute = read('app/api/admin/users/route.ts')
const adminUserPasswordResetRoute = read('app/api/admin/users/[userId]/password-reset/route.ts')
const adminUserEmailVerificationRoute = read('app/api/admin/users/[userId]/email-verification/route.ts')
const adminUserStatusRoute = read('app/api/admin/users/[userId]/status/route.ts')
const adminUserAuthorizationRoute = read('app/api/admin/users/[userId]/authorization/route.ts')
const adminUserSubscriptionRoute = read('app/api/admin/users/[userId]/subscription/route.ts')
const adminUserDeleteRoute = read('app/api/admin/users/[userId]/delete/route.ts')
const adminTenantsRepository = read('lib/server/admin-tenants-repository.ts')
const adminTenantsRoute = read('app/api/admin/tenants/route.ts')
const adminTenantRoute = read('app/api/admin/tenants/[tenantId]/route.ts')
const adminTenantImpersonationRoute = read('app/api/admin/tenants/[tenantId]/impersonation/route.ts')
const dataTable = read('apps/super-admin/src/components/platform/enterprise-data-table.tsx')
const supportPage = read('apps/super-admin/src/pages/support-operations-page.tsx')
const notificationBell = read('apps/super-admin/src/components/operations/notification-bell-panel.tsx')
const dashboardTrendGrid = read('apps/super-admin/src/components/platform/dashboard-trend-grid.tsx')
const auditPage = read('apps/super-admin/src/pages/audit-log-page.tsx')
const dashboardPage = read('apps/super-admin/src/pages/dashboard-page.tsx')
const financePage = read('apps/super-admin/src/pages/finance-page.tsx')
const settingsPage = read('apps/super-admin/src/pages/settings-page.tsx')
const adminAccountsPage = read('apps/super-admin/src/pages/admin-accounts-page.tsx')
const packageJson = read('package.json')
const superAdminPackageJson = read('apps/super-admin/package.json')
const workspace = read('pnpm-workspace.yaml')
const viteConfig = read('apps/super-admin/vite.config.ts')
const vercelConfig = read('vercel.json')

const requiredFiles = [
  'apps/super-admin/package.json',
  'apps/super-admin/vite.config.ts',
  'apps/super-admin/index.html',
  'apps/super-admin/src/main.tsx',
  'apps/super-admin/src/App.tsx',
  'apps/super-admin/src/styles.css',
  'apps/super-admin/src/lib/auth.tsx',
  'apps/super-admin/src/lib/rbac.ts',
  'apps/super-admin/src/lib/platform-api.ts',
  'apps/super-admin/src/lib/platform-audit-types.ts',
  'apps/super-admin/src/lib/platform-dashboard-types.ts',
  'apps/super-admin/src/lib/platform-finance-types.ts',
  'apps/super-admin/src/lib/platform-operations-types.ts',
  'apps/super-admin/src/lib/platform-settings-types.ts',
  'apps/super-admin/src/lib/platform-admin-account-types.ts',
  'apps/super-admin/src/lib/platform-tenant-types.ts',
  'apps/super-admin/src/lib/platform-user-types.ts',
  'apps/super-admin/src/components/layout/super-admin-layout.tsx',
  'apps/super-admin/src/components/auth/protected-shell.tsx',
  'apps/super-admin/src/components/operations/notification-bell-panel.tsx',
  'apps/super-admin/src/components/platform/critical-action-confirmation.tsx',
  'apps/super-admin/src/components/platform/enterprise-data-table.tsx',
  'apps/super-admin/src/components/platform/dashboard-trend-grid.tsx',
  'apps/super-admin/src/components/ui/table.tsx',
  'apps/super-admin/src/components/ui/textarea.tsx',
  'apps/super-admin/src/pages/login-page.tsx',
  'apps/super-admin/src/pages/unauthorized-page.tsx',
  'apps/super-admin/src/pages/forbidden-page.tsx',
  'apps/super-admin/src/pages/audit-log-page.tsx',
  'apps/super-admin/src/pages/dashboard-page.tsx',
  'apps/super-admin/src/pages/finance-page.tsx',
  'apps/super-admin/src/pages/settings-page.tsx',
  'apps/super-admin/src/pages/admin-accounts-page.tsx',
  'apps/super-admin/src/pages/access-control-page.tsx',
  'apps/super-admin/src/pages/tenant-management-page.tsx',
  'apps/super-admin/src/pages/user-management-page.tsx',
  'apps/super-admin/src/pages/support-operations-page.tsx',
  'apps/super-admin/src/pages/module-placeholder-page.tsx',
  'scripts/qa/verify-super-admin-bundle-budget.mjs',
  'lib/server/admin-tenants-repository.ts',
  'lib/server/admin-users-repository.ts',
  'lib/server/admin-audit-repository.ts',
  'lib/server/admin-dashboard-repository.ts',
  'lib/server/admin-finance-repository.ts',
  'lib/server/admin-operations-repository.ts',
  'lib/server/admin-settings-repository.ts',
  'lib/server/admin-accounts-repository.ts',
  'supabase/migrations/20260603095234_admin_accounts_system.sql',
  'app/api/admin/audit/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/admin/finance/route.ts',
  'app/api/admin/operations/route.ts',
  'app/api/admin/operations/moderation/route.ts',
  'app/api/admin/settings/route.ts',
  'app/api/admin/accounts/route.ts',
  'app/api/admin/accounts/[accountId]/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/users/[userId]/password-reset/route.ts',
  'app/api/admin/users/[userId]/email-verification/route.ts',
  'app/api/admin/users/[userId]/status/route.ts',
  'app/api/admin/tenants/route.ts',
  'app/api/admin/tenants/[tenantId]/route.ts',
  'app/api/admin/tenants/[tenantId]/impersonation/route.ts',
]

const checks = [
  ['super admin app directory exists', fs.existsSync(appRoot)],
  ['all core files exist', requiredFiles.every(exists)],
  ['workspace includes apps packages', workspace.includes('packages:') && workspace.includes('apps/*')],
  ['root exposes super admin scripts', packageJson.includes('super-admin:dev') && packageJson.includes('super-admin:build')],
  ['root prepares super admin public bundle', packageJson.includes('super-admin:prepare-public') && packageJson.includes('public/super-admin')],
  [
    'root exposes super admin bundle budget',
    packageJson.includes('super-admin:bundle-budget') && packageJson.includes('verify-super-admin-bundle-budget.mjs'),
  ],
  [
    'vercel build includes super admin bundle and budget gate',
    vercelConfig.includes('pnpm super-admin:prepare-public') && vercelConfig.includes('pnpm super-admin:bundle-budget'),
  ],
  [
    'super admin bundle budget checks critical chunks',
    superAdminBundleBudget.includes('dashboard-page-')
      && superAdminBundleBudget.includes('dashboard-trend-grid-')
      && superAdminBundleBudget.includes('public/super-admin/assets')
      && superAdminBundleBudget.includes('entryRaw')
      && superAdminBundleBudget.includes('largestRaw'),
  ],
  ['vite stack configured', superAdminPackageJson.includes('"vite"') && read('apps/super-admin/vite.config.ts').includes('@vitejs/plugin-react')],
  ['tanstack table dependency installed', superAdminPackageJson.includes('@tanstack/react-table')],
  ['recharts dependency installed', superAdminPackageJson.includes('"recharts"')],
  ['vite app uses super admin base path', viteConfig.includes("base: '/super-admin/'")],
  ['super admin uses hash routing for static deploy', app.includes('window.location.hash') && app.includes('hashchange')],
  ['tailwind v4 stylesheet configured', read('apps/super-admin/src/styles.css').includes("@import 'tailwindcss'")],
  ['all required roles exist', ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN'].every((role) => rbac.includes(role))],
  ['rbac permission map exists', rbac.includes('rolePermissions') && rbac.includes('hasPermission')],
  ['protected routes require permissions', app.includes('hasPermission(session.user.role, route.permission)')],
  ['unauthorized screen exists', unauthorized.includes('Oturum Gerekli') && app.includes("path === '/unauthorized'")],
  ['forbidden screen exists', forbidden.includes('Yetki Reddedildi') && app.includes("path === '/forbidden'")],
  [
    'login screen exists and creates admin api session',
    login.includes('Süper Admin Girişi')
      && login.includes('Admin kullanıcı adı veya e-posta')
      && auth.includes('/api/admin/login')
      && auth.includes('/api/admin/session')
      && auth.includes("credentials: 'include'"),
  ],
  ['sidebar navigation exists', layout.includes('navigationItems') && layout.includes('getAllowedNavigation')],
  ['top header exists', layout.includes('Aramayı Galeriler, Kullanıcılar ve Operasyon içinde kullanın') && layout.includes('Admin Profili')],
  ['profile menu exists', layout.includes('DropdownMenu') && layout.includes('Çıkış yap')],
  ['admin session is not persisted in browser storage', !auth.includes('localStorage') && !auth.includes('SESSION_STORAGE_KEY')],
  ['role preview cannot mutate the active admin role', !auth.includes('switchRoleForPreview') && !layout.includes('olarak önizle')],
  ['bell notification panel wired', layout.includes('NotificationBellPanel') && notificationBell.includes('platformApi.getOperationsSnapshot')],
  ['responsive sidebar exists', layout.includes('lg:fixed') && layout.includes('translate-x-0')],
  ['dashboard route is platform command center', app.includes("title: 'Platform Yönetim Ekranı'") && app.includes('komuta merkezi')],
  [
    'super admin routes use lazy code splitting',
    app.includes('Suspense')
      && app.includes('RouteLoadingState')
      && app.includes("import('@/pages/dashboard-page')")
      && app.includes("import('@/pages/tenant-management-page')")
      && app.includes("import('@/pages/admin-accounts-page')")
      && app.includes('<RouteComponent />'),
  ],
  [
    'super admin routes preload on navigation intent',
    app.includes('preloadRoute')
      && app.includes('routePreloadCache')
      && app.includes('onNavigateIntent={preloadRoute}')
      && layout.includes('onNavigateIntent')
      && layout.includes('onPointerEnter')
      && layout.includes('onFocus'),
  ],
  [
    'super admin api client uses timeout and abort guard',
    platformApi.includes('DEFAULT_ADMIN_API_TIMEOUT_MS')
      && platformApi.includes('AbortController')
      && platformApi.includes('buildTimeoutMessage')
      && platformApi.includes('window.setTimeout')
      && platformApi.includes('window.clearTimeout')
      && platformApi.includes('buildRequestHeaders')
      && platformApi.includes("credentials: 'include'"),
  ],
  [
    'critical admin action confirmation exists',
    criticalActionConfirmation.includes('confirmationPhrase')
      && criticalActionConfirmation.includes('İşlem sebebi')
      && criticalActionConfirmation.includes('denetim kaydının teknik detayına')
      && criticalActionConfirmation.includes('minReasonLength')
      && criticalActionConfirmation.includes('onConfirm'),
  ],
  [
    'dashboard required widgets exist',
    [
      'Toplam galeri sayısı',
      'Aktif / pasif galeriler',
      'Toplam araç',
      'Toplam QR',
      'Günlük QR tarama',
      'Toplam müşteri talebi',
      'Aylık tekrar eden gelir',
      'Bugün yeni kayıt',
      'Trial kullanıcılar',
      'Sistem sağlığı',
    ].every((copy) => dashboardPage.includes(copy)),
  ],
  [
    'dashboard required charts exist',
    ['Günlük kayıt', 'Abonelik büyümesi', 'QR kullanım trendi', 'Müşteri talebi trendi'].every((copy) =>
      dashboardTrendGrid.includes(copy) || dashboardPage.includes(copy),
    ) && dashboardTrendGrid.includes('ResponsiveContainer'),
  ],
  [
    'dashboard charts are lazy loaded',
    dashboardPage.includes("import('@/components/platform/dashboard-trend-grid')")
      && dashboardPage.includes('ChartsLoadingGrid')
      && !dashboardPage.includes("from 'recharts'")
      && dashboardTrendGrid.includes("from 'recharts'"),
  ],
  [
    'dashboard uses live admin api client',
    dashboardPage.includes('@/lib/platform-api')
      && dashboardPage.includes('platformApi.getDashboardSnapshot')
      && !dashboardPage.includes('mockPlatformApi.getDashboardSnapshot'),
  ],
  [
    'live dashboard api route exists',
    adminDashboardRoute.includes('requireAdminSessionOrThrow')
      && adminDashboardRoute.includes('getAdminDashboardSnapshot')
      && platformApi.includes('/api/admin/dashboard'),
  ],
  [
    'live dashboard repository reads real supabase sources',
    adminDashboardRepository.includes('/auth/v1/admin/users')
      && adminDashboardRepository.includes('/rest/v1/galleries')
      && adminDashboardRepository.includes('/rest/v1/vehicles')
      && adminDashboardRepository.includes('/rest/v1/qr_scans')
      && adminDashboardRepository.includes('/rest/v1/leads')
      && adminDashboardRepository.includes('/rest/v1/audit_logs'),
  ],
  [
    'live dashboard avoids fake mrr and frontend service role exposure',
    adminDashboardRepository.includes('Ödeme sağlayıcısı bağlı olmadığı için MRR 0')
      && adminDashboardRepository.includes('monthlyRevenue')
      && platformDashboardTypes.includes('recentActivity')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  ['finance route registered', app.includes("path: '/finance'") && app.includes('Component: FinancePage')],
  [
    'finance module uses live admin api client',
    financePage.includes('@/lib/platform-api')
      && financePage.includes('platformApi.getFinanceSnapshot')
      && financePage.includes('Sahte satır gösterilmiyor')
      && financePage.includes('sabit paket fiyatı')
      && !financePage.includes('mockPlatformApi'),
  ],
  [
    'live finance api route exists',
    adminFinanceRoute.includes('requireAdminSessionOrThrow')
      && adminFinanceRoute.includes('getAdminFinanceSnapshot')
      && platformApi.includes('/api/admin/finance'),
  ],
  [
    'live finance repository reads real supabase sources',
    adminFinanceRepository.includes('/auth/v1/admin/users')
      && adminFinanceRepository.includes('/rest/v1/galleries')
      && adminFinanceRepository.includes('/rest/v1/audit_logs')
      && adminFinanceRepository.includes('REVENUE_METADATA_KEYS'),
  ],
  [
    'live finance avoids fake package pricing and frontend service role exposure',
    adminFinanceRepository.includes('Paket fiyatı uydurulmaz')
      && adminFinanceRepository.includes('mock veri')
      && platformFinanceTypes.includes('AdminFinanceSnapshot')
      && !adminFinanceRepository.includes('operationalMetricsByTenant')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  ['audit route registered', app.includes("path: '/audit'") && app.includes('Component: AuditLogPage')],
  [
    'audit module uses live admin api client',
    auditPage.includes('@/lib/platform-api')
      && auditPage.includes('platformApi.getAuditSnapshot')
      && auditPage.includes('Sahte satır gösterilmiyor')
      && auditPage.includes('Canlı Supabase denetim kayıtları')
      && !auditPage.includes('mockPlatformApi'),
  ],
  [
    'audit module exposes safe detail drawer',
    auditPage.includes('AuditDetailDrawer')
      && auditPage.includes('sanitizeAuditMetadata')
      && auditPage.includes('readAuditReason')
      && auditPage.includes('Hassas alanlar maskeli')
      && auditPage.includes('Sebep:')
      && auditPage.includes('Detay aç')
      && adminAuditRepository.includes('sanitizeMetadataForPreview')
      && adminAuditRepository.includes('isSensitiveMetadataKey'),
  ],
  [
    'live audit api route exists',
    adminAuditRoute.includes('requireAdminSessionOrThrow')
      && adminAuditRoute.includes('getAdminAuditSnapshot')
      && platformApi.includes('/api/admin/audit'),
  ],
  [
    'live audit repository reads real audit logs',
    adminAuditRepository.includes('/rest/v1/audit_logs')
      && adminAuditRepository.includes("select: 'id,action,entity_type,entity_id,actor_email,actor_role,source,metadata,created_at'")
      && adminAuditRepository.includes('buildMetadataPreview')
      && adminAuditRepository.includes('CRITICAL_ACTIONS'),
  ],
  [
    'live audit avoids fake data and frontend service role exposure',
    adminAuditRepository.includes('Mock audit satırı')
      && platformAuditTypes.includes('AdminAuditSnapshot')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  ['settings route registered', app.includes("path: '/settings'") && app.includes('Component: SettingsPage')],
  [
    'settings module uses live admin api client',
    settingsPage.includes('@/lib/platform-api')
      && settingsPage.includes('platformApi.getSettingsSnapshot')
      && settingsPage.includes('Gizli değer yazma kapalı')
      && settingsPage.includes('Sahte satır gösterilmiyor')
      && !settingsPage.includes('mockPlatformApi'),
  ],
  [
    'live settings api route exists',
    adminSettingsRoute.includes('requireAdminSessionOrThrow')
      && adminSettingsRoute.includes('getAdminSettingsSnapshot')
      && platformApi.includes('/api/admin/settings'),
  ],
  [
    'live settings repository reads runtime config without exposing secrets',
    adminSettingsRepository.includes('process.env')
      && adminSettingsRepository.includes('maskValue')
      && adminSettingsRepository.includes('SUPABASE_SERVICE_ROLE_KEY')
      && adminSettingsRepository.includes('ADMIN_PASSWORD_SHA256')
      && adminSettingsRepository.includes('Gizli değerler tarayıcıya')
      && platformSettingsTypes.includes('AdminSettingsSnapshot'),
  ],
  [
    'live settings avoids fake config and frontend service role exposure',
    adminSettingsRepository.includes('sahte ayar')
      && adminSettingsRepository.includes('Gizli değer değişiklikleri')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  ['admin accounts route registered', app.includes("path: '/admin-accounts'") && app.includes('Component: AdminAccountsPage')],
  [
    'admin accounts module uses live admin api client',
    adminAccountsPage.includes('@/lib/platform-api')
      && adminAccountsPage.includes('platformApi.getAdminAccountsSnapshot')
      && adminAccountsPage.includes('platformApi.createAdminAccount')
      && adminAccountsPage.includes('platformApi.updateAdminAccount')
      && adminAccountsPage.includes('platformApi.deleteAdminAccount')
      && adminAccountsPage.includes('Veritabanı destekli admin hesabı')
      && !adminAccountsPage.includes('mockPlatformApi'),
  ],
  [
    'live admin accounts api route exists',
    adminAccountsRoute.includes('requireAdminSessionOrThrow')
      && adminAccountsRoute.includes('requireAdminRoleOrThrow')
      && adminAccountsRoute.includes('getAdminAccountsSnapshot')
      && adminAccountsRoute.includes('createAdminAccount')
      && adminAccountRoute.includes('updateAdminAccount')
      && adminAccountRoute.includes('softDeleteAdminAccount')
      && platformApi.includes('/api/admin/accounts'),
  ],
  [
    'admin accounts migration is locked down',
    adminAccountMigration.includes('CREATE TABLE IF NOT EXISTS admin_accounts')
      && adminAccountMigration.includes('ALTER TABLE admin_accounts FORCE ROW LEVEL SECURITY')
      && adminAccountMigration.includes('REVOKE ALL ON TABLE admin_accounts FROM anon, authenticated')
      && adminAccountMigration.includes('CREATE POLICY "Service role manage admin accounts"'),
  ],
  [
    'live admin accounts repository reads runtime admin and audit state',
    adminAccountsRepository.includes('ADMIN_PASSWORD_SHA256')
      && adminAccountsRepository.includes('ADMIN_SESSION_COOKIE_NAME')
      && adminAccountsRepository.includes('/rest/v1/admin_accounts')
      && adminAccountsRepository.includes('/rest/v1/audit_logs')
      && adminAccountsRepository.includes('ADMIN_AUDIT_ACTIONS')
      && adminAccountsRepository.includes('mutationPolicy'),
  ],
  [
    'live admin accounts avoids fake admin crud and frontend service role exposure',
    adminAccountsRepository.includes('scrypt:v1')
      && adminAccountsRepository.includes('ADMIN_PASSWORD_SHA256, DB password_hash ve secret değerler')
      && adminAccountsRepository.includes('temporaryPassword')
      && platformAdminAccountTypes.includes('AdminAccountsSnapshot')
      && platformAdminAccountTypes.includes('AdminAccountMutationResult')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  ['placeholder modules remain for future phases', placeholder.includes('Modül henüz aktif değil') && placeholder.includes('Sahte operasyon tablosu')],
  ['tenant route registered', app.includes("path: '/tenants'") && app.includes('Component: TenantManagementPage')],
  ['user route registered', app.includes("path: '/users'") && app.includes('Component: UserManagementPage')],
  ['support operations route registered', app.includes("path: '/support-console'") && app.includes('Component: SupportOperationsPage')],
  ['tenant and user navigation exists', rbac.includes("key: 'tenants'") && rbac.includes("key: 'users'")],
  ['tenant and user permissions exist', rbac.includes('tenants:manage') && rbac.includes('users:manage')],
  ['support permissions exist', rbac.includes('support:manage') && rbac.includes("key: 'support-console'")],
  ['tanstack wrapper uses react table', dataTable.includes('useReactTable') && dataTable.includes('getSortedRowModel')],
  [
    'legacy mock platform api removed',
    !exists('apps/super-admin/src/lib/mock-platform-api.ts')
      && !platformApi.includes('mock-platform-api')
      && !tenantPage.includes('mock-platform-api'),
  ],
  [
    'tenant module uses live admin api client',
    tenantPage.includes('@/lib/platform-api')
      && tenantPage.includes('platformApi')
      && tenantPage.includes('.listTenants()')
      && !tenantPage.includes('mockPlatformApi.listTenants'),
  ],
  [
    'live tenant api routes exist',
    adminTenantsRoute.includes('listAdminManagedTenants')
      && adminTenantsRoute.includes('createAdminManagedTenant')
      && adminTenantRoute.includes('updateAdminManagedTenant')
      && adminTenantImpersonationRoute.includes('createAdminTenantImpersonationPreview'),
  ],
  [
    'live tenant repository uses Supabase Auth and galleries',
    adminTenantsRepository.includes('/auth/v1/admin/users')
      && adminTenantsRepository.includes('/rest/v1/galleries')
      && adminTenantsRepository.includes('ban_duration')
      && adminTenantsRepository.includes('buildSecurePublicSlug'),
  ],
  [
    'frontend tenant api never exposes service role',
    platformApi.includes('/api/admin/tenants')
      && platformApi.includes("credentials: 'include'")
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  [
    'user module uses live admin api client',
    userPage.includes('@/lib/platform-api')
      && userPage.includes('platformApi.listUsers')
      && userPage.includes('platformApi.resetUserPassword')
      && userPage.includes('platformApi.verifyUserEmail')
      && userPage.includes('platformApi.setUserStatus')
      && !userPage.includes('mockPlatformApi'),
  ],
  [
    'critical user and tenant actions require reason confirmation',
    userPage.includes('CriticalActionConfirmation')
      && userPage.includes('criticalReason')
      && userPage.includes('openUserStatusAction')
      && tenantPage.includes('CriticalActionConfirmation')
      && tenantPage.includes('openTenantCriticalAction')
      && tenantPage.includes('hasCriticalTenantFormChange')
      && platformApi.includes('AdminActionReasonInput')
      && platformApi.includes('reason')
      && platformTenantTypes.includes('reason?: string'),
  ],
  [
    'critical admin mutation routes require action reason',
    adminUserStatusRoute.includes('reason: z.string().trim().min(12).max(500)')
      && adminUserAuthorizationRoute.includes('reason: z.string().trim().min(12).max(500)')
      && adminUserSubscriptionRoute.includes('reason: z.string().trim().min(12).max(500)')
      && adminUserDeleteRoute.includes('reason: z.string().trim().min(12).max(500)')
      && adminTenantRoute.includes('reason_required')
      && adminUsersRepository.includes('reason: input.reason')
      && adminTenantsRepository.includes('reason: input.reason || null'),
  ],
  [
    'live user api routes exist',
    adminUsersRoute.includes('listAdminManagedUsers')
      && adminUserPasswordResetRoute.includes('requestAdminUserPasswordReset')
      && adminUserEmailVerificationRoute.includes('verifyAdminUserEmail')
      && adminUserStatusRoute.includes('updateAdminUserStatus'),
  ],
  [
    'live user repository manages real auth state',
    adminUsersRepository.includes('/auth/v1/admin/users')
      && adminUsersRepository.includes('/auth/v1/recover')
      && adminUsersRepository.includes('email_confirm')
      && adminUsersRepository.includes('ban_duration')
      && adminUsersRepository.includes('admin_user_password_reset')
      && adminUsersRepository.includes('admin_user_email_verify')
      && adminUsersRepository.includes('admin_user_status_update'),
  ],
  [
    'frontend user api never exposes service role',
    platformApi.includes('/api/admin/users')
      && platformUserTypes.includes('derivePlatformUserStatus')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  [
    'tenant table required fields exist',
    ['galleryName', 'owner', 'package', 'status', 'paymentStatus', 'vehicleCount', 'lastLogin'].every((field) =>
      tenantPage.includes(field),
    ),
  ],
  [
    'tenant payment status model exists',
    platformTenantTypes.includes('tenantPaymentStatuses')
      && platformTenantTypes.includes('paymentStatus')
      && tenantPage.includes('Ödeme durumu'),
  ],
  [
    'tenant actions exist',
    ['Galeri oluştur', 'Düzenle', 'Askıya al', 'Banla', 'Geri alınabilir sil', 'Galeri hesabına gir'].every((copy) =>
      tenantPage.includes(copy),
    ),
  ],
  [
    'user table required live fields exist',
    ['email', 'phone', 'authorization.role', 'gallery', 'derivePlatformUserStatus', 'lastSignInAt'].every((field) =>
      userPage.includes(field),
    ),
  ],
  ['user actions exist', ['Şifre sıfırla', 'E-posta doğrula', 'Dondur', 'Banla'].every((copy) => userPage.includes(copy))],
  [
    'operations module uses live admin api client',
    supportPage.includes('@/lib/platform-api')
      && supportPage.includes('platformApi.getOperationsSnapshot')
      && supportPage.includes('platformApi.recordModerationAction')
      && supportPage.includes('platformApi.sendBroadcast')
      && notificationBell.includes('platformApi.getOperationsSnapshot')
      && !supportPage.includes('mockOperationsApi')
      && !notificationBell.includes('mockOperationsApi'),
  ],
  [
    'live operations api routes exist',
    adminOperationsRoute.includes('requireAdminSessionOrThrow')
      && adminOperationsRoute.includes('getAdminOperationsSnapshot')
      && adminOperationsModerationRoute.includes('recordAdminModerationAction'),
  ],
  [
    'live operations repository uses support tables and audit logs without fake support tickets',
    adminOperationsRepository.includes('/rest/v1/audit_logs')
      && adminOperationsRepository.includes('/rest/v1/galleries')
      && adminOperationsRepository.includes('/rest/v1/support_tickets')
      && adminOperationsRepository.includes('/rest/v1/moderation_reports')
      && adminOperationsRepository.includes('/rest/v1/admin_broadcasts')
      && adminOperationsRepository.includes('Destek talebi tablosu bağlı değil')
      && adminOperationsRepository.includes('buildSupportTickets')
      && adminOperationsRepository.includes('admin_moderation_action'),
  ],
  [
    'frontend operations api never exposes service role',
    platformApi.includes('/api/admin/operations')
      && platformApi.includes('/api/admin/operations/moderation')
      && platformOperationsTypes.includes('AdminOperationsSnapshot')
      && !platformApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  ],
  ['support page includes pipeline states', ['OPEN', 'PENDING', 'SOLVED', 'CLOSED'].every((copy) => supportPage.includes(copy))],
  ['support page states no fake support tickets', supportPage.includes('sahte kayıt gösterilmiyor') && supportPage.includes('Destek talebi kaynağı bağlı değil')],
  ['support page includes moderation actions', ['Uyarı talebini kaydet', 'Askıya alma talebini kaydet', 'İçerik kaldırma talebini kaydet'].every((copy) => supportPage.includes(copy))],
  ['support page includes broadcast channels', ['E-posta talebi', 'SMS alanı', 'Uygulama bildirimi alanı'].every((copy) => supportPage.includes(copy))],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        failures: failures.map(([name]) => name),
      },
      null,
      2,
    ),
  )
  process.exit(1)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: checks.length,
    },
    null,
    2,
  ),
)
