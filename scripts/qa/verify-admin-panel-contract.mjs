#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8')
}

function exists(relPath) {
  return fs.existsSync(path.join(projectRoot, relPath))
}

const adminAuth = read('lib/server/admin-auth.ts')
const adminLoginRoute = read('app/api/admin/login/route.ts')
const adminUsersRoute = read('app/api/admin/users/route.ts')
const adminAuthorizationRoute = read('app/api/admin/users/[userId]/authorization/route.ts')
const adminSubscriptionRoute = read('app/api/admin/users/[userId]/subscription/route.ts')
const adminDeleteRoute = read('app/api/admin/users/[userId]/delete/route.ts')
const adminNotificationsRoute = read('app/api/admin/notifications/route.ts')
const adminLoginPage = read('app/admin/giris/page.tsx')
const adminPage = read('app/admin/page.tsx')
const adminUsersPage = read('app/admin/kullanicilar/page.tsx')
const adminAuthorizationPage = read('app/admin/yetkilendirme/page.tsx')
const adminSubscriptionsPage = read('app/admin/abonelikler/page.tsx')
const adminNotificationsPage = read('app/admin/bildirimler/page.tsx')
const adminPanelShell = read('components/admin/admin-panel-shell.tsx')
const adminClient = read('lib/client/admin-auth.ts')
const adminUsersRepository = read('lib/server/admin-users-repository.ts')
const adminActionControls = read('components/admin/admin-action-controls.tsx')
const panelAuthGuard = read('lib/server/panel-auth-guard.ts')
const panelAuth = read('lib/server/panel-auth.ts')
const panelAuthErrors = read('lib/server/panel-auth-errors.ts')
const prodSmoke = read('scripts/qa/prod-smoke-full.mjs')
const predeploy = read('scripts/security/predeploy-check.mjs')
const packageJson = read('package.json')
const robots = read('app/robots.ts')

const providedPassword = ['ca', '123', '321'].join('')
const sourceScope = [
  adminAuth,
  adminLoginRoute,
  adminUsersRoute,
  adminAuthorizationRoute,
  adminSubscriptionRoute,
  adminDeleteRoute,
  adminNotificationsRoute,
  adminLoginPage,
  adminPage,
  adminUsersPage,
  adminAuthorizationPage,
  adminSubscriptionsPage,
  adminNotificationsPage,
  adminPanelShell,
  adminClient,
  adminUsersRepository,
  adminActionControls,
  panelAuthGuard,
  panelAuth,
  panelAuthErrors,
  prodSmoke,
  predeploy,
  packageJson,
  robots,
].join('\n')

const checks = [
  ['admin auth uses isolated cookie', adminAuth.includes("ADMIN_SESSION_COOKIE_NAME = 'autoqrent_admin_session'")],
  ['admin auth does not reuse panel session cookie', !adminAuth.includes('autoqrent_panel_session')],
  ['admin auth requires ADMIN_PASSWORD_SHA256', adminAuth.includes('ADMIN_PASSWORD_SHA256')],
  [
    'admin auth requires isolated ADMIN_SESSION_SECRET',
    adminAuth.includes('return process.env.ADMIN_SESSION_SECRET || null')
      && !adminAuth.includes('process.env.ADMIN_SESSION_SECRET || process.env.PANEL_SESSION_SECRET')
      && !adminAuth.includes('process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY'),
  ],
  [
    'panel auth requires isolated PANEL_SESSION_SECRET',
    panelAuth.includes('return process.env.PANEL_SESSION_SECRET || null')
      && !panelAuth.includes('process.env.PANEL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY'),
  ],
  [
    'panel auth compares session signatures with timingSafeEqual',
    panelAuth.includes('timingSafeEqual') && panelAuth.includes('safeEqual(expected, signature)'),
  ],
  [
    'panel auth encrypts session cookie payload',
    panelAuth.includes('createCipheriv')
      && panelAuth.includes('createDecipheriv')
      && panelAuth.includes("'aes-256-gcm'")
      && panelAuth.includes("ENCRYPTED_SESSION_COOKIE_VERSION = 'v2'")
      && panelAuth.includes('randomBytes(SESSION_COOKIE_IV_BYTES)')
      && panelAuth.includes('cipher.setAAD(SESSION_COOKIE_AAD)')
      && panelAuth.includes('cipher.getAuthTag()')
      && panelAuth.includes('decipher.setAuthTag')
      && panelAuth.includes("return `${envelope}.${signature}`")
      && !panelAuth.includes('payloadBase64'),
  ],
  ['admin auth compares secrets with timingSafeEqual', adminAuth.includes('timingSafeEqual')],
  ['admin auth hashes submitted password', adminAuth.includes("createHash('sha256').update(input.password)")],
  ['admin auth has no plaintext provided password', !sourceScope.includes(providedPassword)],
  ['admin login route uses username not email', adminLoginRoute.includes('username') && !adminLoginRoute.includes('email')],
  ['admin login route rate-limits admin-login key', adminLoginRoute.includes('admin-login:')],
  ['admin login route records failed attempts', adminLoginRoute.includes('recordLoginFailure')],
  ['admin session route exists', exists('app/api/admin/session/route.ts')],
  ['admin logout route exists', exists('app/api/admin/logout/route.ts')],
  ['admin users route exists', exists('app/api/admin/users/route.ts')],
  ['admin users route requires admin session', adminUsersRoute.includes('requireAdminSessionOrThrow') && adminUsersRoute.includes('adminRouteErrorResponse')],
  ['admin user delete route exists', exists('app/api/admin/users/[userId]/delete/route.ts')],
  ['admin user delete route requires exact email confirmation', adminDeleteRoute.includes('confirmEmail') && adminUsersRepository.includes('Silme işlemi için kullanıcı e-postasını birebir yazmanız gerekiyor.')],
  ['admin authorization route exists', exists('app/api/admin/users/[userId]/authorization/route.ts')],
  ['admin authorization route writes app metadata', adminAuthorizationRoute.includes('ADMIN_ACCOUNT_ROLES') && adminUsersRepository.includes('accountRole') && adminUsersRepository.includes('accessStatus')],
  ['admin subscription route exists', exists('app/api/admin/users/[userId]/subscription/route.ts')],
  ['admin subscription route writes app metadata', adminSubscriptionRoute.includes('ADMIN_SUBSCRIPTION_PLANS') && adminUsersRepository.includes('subscriptionPlan') && adminUsersRepository.includes('subscriptionStatus')],
  ['admin notifications route exists', exists('app/api/admin/notifications/route.ts')],
  ['admin notifications support single and bulk', adminNotificationsRoute.includes("z.enum(['single', 'bulk'])") && adminActionControls.includes('Toplu Bildirim Kaydet') && adminActionControls.includes('Tekil Bildirim Kaydet')],
  ['admin users repository uses auth admin endpoint', adminUsersRepository.includes('/auth/v1/admin/users')],
  ['admin users repository reads galleries vehicles leads', adminUsersRepository.includes('/rest/v1/galleries') && adminUsersRepository.includes('/rest/v1/vehicles') && adminUsersRepository.includes('/rest/v1/leads')],
  ['admin page is category overview', adminPage.includes('Admin Yönetim Merkezi') && adminPage.includes('/admin/kullanicilar') && adminPage.includes('/admin/bildirimler')],
  ['admin users category renders registered users management', adminUsersPage.includes('Kullanıcılar') && adminUsersPage.includes('AdminDeleteUserControl')],
  ['admin authorization category renders controls', adminAuthorizationPage.includes('AdminAuthorizationControl')],
  ['admin subscriptions category renders controls', adminSubscriptionsPage.includes('AdminSubscriptionControl')],
  ['admin notifications category renders composer', adminNotificationsPage.includes('AdminNotificationComposer')],
  ['admin sidebar removes gallery panel and health links', !adminPanelShell.includes('/panel') && !adminPanelShell.includes('/api/health') && !adminPanelShell.includes('Galeri Paneli') && !adminPanelShell.includes('Sistem Sağlığı')],
  ['admin page uses gallery panel shell theme', adminPage.includes('AdminPanelShell') && adminPanelShell.includes('bg-sidebar') && adminPanelShell.includes('sticky top-0 z-30 h-16')],
  ['admin page avoids standalone cream public theme', !adminPage.includes("bg-[#f7f4ef]")],
  ['admin pages are server-protected through shared helper', adminPage.includes('getAdminPageData') && read('app/admin/_lib/page-data.ts').includes("redirect('/admin/giris')")],
  ['panel auth guard rechecks auth user state', panelAuthGuard.includes('verifyPanelSessionUser') && panelAuth.includes('accessStatus') && panelAuth.includes('askıya alınmış')],
  [
    'panel auth maps Supabase credential errors to Turkish copy',
    panelAuthErrors.includes('invalid login credentials')
      && panelAuthErrors.includes('E-posta veya şifre hatalı')
      && panelAuthErrors.includes('Çok fazla deneme yapıldı'),
  ],
  ['admin login page uses username label', adminLoginPage.includes('Kullanıcı adı')],
  ['admin login page is not email input', !adminLoginPage.includes('type="email"')],
  ['client helper uses admin endpoints', adminClient.includes('/api/admin/login') && adminClient.includes('/api/admin/session')],
  ['robots blocks admin pages', robots.includes("'/admin/'") && robots.includes("'/admin/giris'")],
  ['prod smoke checks admin auth', prodSmoke.includes('/api/admin/session') && prodSmoke.includes('/api/admin/login') && prodSmoke.includes('/api/admin/users')],
  ['package exposes admin contract', packageJson.includes('"security:admin"')],
  ['predeploy guards admin panel', predeploy.includes('guard.admin_panel_username_password_auth')],
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
