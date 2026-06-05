#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const envLocalPath = path.join(projectRoot, '.env.local')
const ciMode =
  process.env.PREDEPLOY_ENV_SOURCE === 'process' ||
  process.env.CI === '1' ||
  process.env.CI === 'true' ||
  process.env.VERCEL === '1' ||
  Boolean(process.env.VERCEL_ENV)
const envSourceMode = ciMode ? 'process' : 'auto'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  const map = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq <= 0) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    map[key] = value
  }

  return map
}

function getEnvValue(key, envMap) {
  if (process.env[key]) return process.env[key]
  if (envSourceMode === 'process') return ''
  if (envMap[key]) return envMap[key]
  return ''
}

function fileContains(filePath, needle) {
  if (!fs.existsSync(filePath)) return false
  return fs.readFileSync(filePath, 'utf8').includes(needle)
}

function createCheck(id, ok, detail) {
  return { id, ok, detail }
}

const envMap = parseEnvFile(envLocalPath)

const supabaseUrl = getEnvValue('SUPABASE_URL', envMap) || getEnvValue('NEXT_PUBLIC_SUPABASE_URL', envMap)
const serviceRole = getEnvValue('SUPABASE_SERVICE_ROLE_KEY', envMap)
const anonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', envMap)
const adminSessionSecret = getEnvValue('ADMIN_SESSION_SECRET', envMap)
const panelSessionSecret = getEnvValue('PANEL_SESSION_SECRET', envMap)

const checks = []
checks.push(
  createCheck(
    'env.source_mode',
    true,
    envSourceMode === 'process'
      ? 'process env only (CI/VERCEL mode)'
      : '.env.local + process env (local mode)',
  ),
)
checks.push(createCheck('env.supabase_url', Boolean(supabaseUrl), 'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set'))
checks.push(createCheck('env.service_role_key', Boolean(serviceRole), 'SUPABASE_SERVICE_ROLE_KEY must be set'))
checks.push(createCheck('env.anon_key', Boolean(anonKey), 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'))
checks.push(createCheck('env.admin_session_secret', Boolean(adminSessionSecret), 'ADMIN_SESSION_SECRET must be set'))
checks.push(createCheck('env.panel_session_secret', Boolean(panelSessionSecret), 'PANEL_SESSION_SECRET must be set'))
checks.push(
  createCheck(
    'env.service_role_not_anon',
    Boolean(serviceRole && anonKey && serviceRole !== anonKey),
    'SUPABASE_SERVICE_ROLE_KEY must be different from NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ),
)

const migrationInit = path.join(projectRoot, 'supabase/migrations/20260530052435_init_schema.sql')
const migrationSecurity = path.join(projectRoot, 'supabase/migrations/20260531231500_security_hardening_and_audit_logs.sql')
const migrationLeads = path.join(projectRoot, 'supabase/migrations/20260601001500_panel_leads_and_vehicle_variant.sql')
const migrationUploadedAssets = path.join(projectRoot, 'supabase/migrations/20260602022205_uploaded_assets_metadata.sql')
const migrationAdminAccounts = path.join(projectRoot, 'supabase/migrations/20260603095234_admin_accounts_system.sql')
const migrationPublicShowroomTheme = path.join(projectRoot, 'supabase/migrations/20260605083000_gallery_public_showroom_theme.sql')
const wafRulesFile = path.join(projectRoot, 'security/cloudflare-waf-rules.json')
const monthlyBackupWorkflow = path.join(projectRoot, '.github/workflows/monthly-supabase-backup.yml')
const vercelConfig = path.join(projectRoot, 'vercel.json')
const vercelIgnore = path.join(projectRoot, '.vercelignore')

checks.push(createCheck('migration.init.exists', fs.existsSync(migrationInit), path.relative(projectRoot, migrationInit)))
checks.push(createCheck('migration.security.exists', fs.existsSync(migrationSecurity), path.relative(projectRoot, migrationSecurity)))
checks.push(createCheck('migration.leads.exists', fs.existsSync(migrationLeads), path.relative(projectRoot, migrationLeads)))
checks.push(createCheck('migration.uploaded_assets.exists', fs.existsSync(migrationUploadedAssets), path.relative(projectRoot, migrationUploadedAssets)))
checks.push(createCheck('migration.admin_accounts.exists', fs.existsSync(migrationAdminAccounts), path.relative(projectRoot, migrationAdminAccounts)))
checks.push(createCheck('migration.public_showroom_theme.exists', fs.existsSync(migrationPublicShowroomTheme), path.relative(projectRoot, migrationPublicShowroomTheme)))

checks.push(
  createCheck(
    'policy.qr_scans_auth_insert',
    fileContains(migrationSecurity, 'CREATE POLICY "Authenticated insert qr scans" ON qr_scans'),
    'qr_scans insert must require authenticated or service role access',
  ),
)
checks.push(
  createCheck(
    'monitoring.sentry_client_config',
    fs.existsSync(path.join(projectRoot, 'sentry.client.config.ts')),
    'sentry.client.config.ts must exist',
  ),
)
checks.push(
  createCheck(
    'monitoring.sentry_server_config',
    fs.existsSync(path.join(projectRoot, 'sentry.server.config.ts')),
    'sentry.server.config.ts must exist',
  ),
)
checks.push(
  createCheck(
    'monitoring.prod_workflow',
    fs.existsSync(path.join(projectRoot, '.github/workflows/prod-smoke-monitor.yml')),
    'production smoke + monitor workflow must exist',
  ),
)
checks.push(
  createCheck(
    'ops.monthly_backup_workflow',
    fs.existsSync(monthlyBackupWorkflow),
    '.github/workflows/monthly-supabase-backup.yml must exist',
  ),
)
checks.push(createCheck('ops.vercel_config_exists', fs.existsSync(vercelConfig), 'vercel.json must exist'))
checks.push(createCheck('ops.vercel_ignore_exists', fs.existsSync(vercelIgnore), '.vercelignore must exist'))
checks.push(
  createCheck(
    'waf.rules_template_exists',
    fs.existsSync(wafRulesFile),
    'security/cloudflare-waf-rules.json must exist',
  ),
)
checks.push(
  createCheck(
    'waf.rules_contact_path',
    fileContains(wafRulesFile, '/api/contact'),
    'WAF rules must include /api/contact',
  ),
)
checks.push(
  createCheck(
    'waf.rules_vehicle_events_path',
    fileContains(wafRulesFile, '/api/public/vehicle-events'),
    'WAF rules must include /api/public/vehicle-events',
  ),
)
checks.push(
  createCheck(
    'waf.rules_showroom_events_path',
    fileContains(wafRulesFile, '/api/public/showroom-events'),
    'WAF rules must include /api/public/showroom-events',
  ),
)
checks.push(
  createCheck(
    'waf.rules_auth_login_path',
    fileContains(wafRulesFile, '/api/auth/login'),
    'WAF rules must include /api/auth/login',
  ),
)
checks.push(
  createCheck(
    'policy.vehicle_views_auth_insert',
    fileContains(migrationSecurity, 'CREATE POLICY "Authenticated insert vehicle views" ON vehicle_views'),
    'vehicle_views insert must require authenticated or service role access',
  ),
)
checks.push(
  createCheck(
    'policy.leads_force_rls',
    fileContains(migrationLeads, 'ALTER TABLE leads FORCE ROW LEVEL SECURITY;'),
    'leads table must force RLS',
  ),
)
checks.push(
  createCheck(
    'policy.uploaded_assets_force_rls',
    fileContains(migrationUploadedAssets, 'ALTER TABLE uploaded_assets FORCE ROW LEVEL SECURITY;'),
    'uploaded_assets table must force RLS',
  ),
)
checks.push(
  createCheck(
    'policy.uploaded_assets_no_direct_client_access',
    fileContains(migrationUploadedAssets, 'REVOKE ALL ON TABLE uploaded_assets FROM anon, authenticated'),
    'uploaded_assets table must not be directly reachable by anon/authenticated clients',
  ),
)
checks.push(
  createCheck(
    'policy.admin_accounts_private_service_role',
    fileContains(migrationAdminAccounts, 'CREATE TABLE IF NOT EXISTS admin_accounts')
      && fileContains(migrationAdminAccounts, 'ALTER TABLE admin_accounts FORCE ROW LEVEL SECURITY')
      && fileContains(migrationAdminAccounts, 'REVOKE ALL ON TABLE admin_accounts FROM anon, authenticated')
      && fileContains(migrationAdminAccounts, 'CREATE POLICY "Service role manage admin accounts"'),
    'admin_accounts must be RLS-forced, hidden from anon/authenticated, and managed only by service role',
  ),
)

const criticalFiles = [
  'app/api/health/route.ts',
  'app/api/admin/login/route.ts',
  'app/api/admin/session/route.ts',
  'app/api/admin/logout/route.ts',
  'app/api/admin/audit/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/admin/finance/route.ts',
  'app/api/admin/operations/route.ts',
  'app/api/admin/operations/moderation/route.ts',
  'app/api/admin/settings/route.ts',
  'app/api/admin/accounts/route.ts',
  'app/api/admin/accounts/[accountId]/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/users/[userId]/delete/route.ts',
  'app/api/admin/users/[userId]/authorization/route.ts',
  'app/api/admin/users/[userId]/subscription/route.ts',
  'app/api/admin/users/[userId]/password-reset/route.ts',
  'app/api/admin/users/[userId]/email-verification/route.ts',
  'app/api/admin/users/[userId]/status/route.ts',
  'app/api/admin/notifications/route.ts',
  'app/api/panel/vehicles/route.ts',
  'app/api/panel/vehicles/[id]/route.ts',
  'app/api/public/vehicle-events/route.ts',
  'app/api/panel/qr-codes/route.ts',
  'app/api/panel/analytics/overview/route.ts',
  'app/api/panel/analytics/showroom/route.ts',
  'app/api/panel/uploads/gallery-logo/route.ts',
  'app/api/panel/uploads/vehicle-images/route.ts',
  'app/api/panel/uploads/vehicle-images/quota/route.ts',
  'app/api/public/showroom-events/route.ts',
  'app/api/cron/cleanup-uploaded-assets/route.ts',
  'app/api/cron/rotate-public-slugs/route.ts',
  'app/api/cron/cleanup-qa-test-data/route.ts',
  'app/admin/page.tsx',
  'app/admin/giris/page.tsx',
  'app/admin/kullanicilar/page.tsx',
  'app/admin/yetkilendirme/page.tsx',
  'app/admin/abonelikler/page.tsx',
  'app/admin/bildirimler/page.tsx',
  'app/panel/araclar/ekle/page.tsx',
  'app/panel/araclar/[id]/duzenle/page.tsx',
  'components/dashboard/vehicle-image-quota-card.tsx',
  'components/admin/admin-panel-shell.tsx',
  'components/admin/admin-action-controls.tsx',
  'apps/super-admin/src/components/platform/critical-action-confirmation.tsx',
  'app/api/panel/settings/route.ts',
  'app/api/panel/qr-image/route.ts',
  'app/panel/qr-kodlar/page.tsx',
  'app/panel/qr-kodlar/yazdir/page.tsx',
  'app/panel/ayarlar/page.tsx',
  'app/demo/page.tsx',
  'components/shared/qr-code-image.tsx',
  'lib/security/public-route-token.ts',
  'lib/vehicle-limits.ts',
  'lib/server/vehicle-input-schema.ts',
  'lib/server/safe-image-upload.ts',
  'lib/server/storage-images.ts',
  'lib/server/uploaded-assets.ts',
  'lib/server/panel-auth.ts',
  'lib/server/panel-auth-errors.ts',
  'lib/server/admin-auth.ts',
  'lib/server/admin-route-guard.ts',
  'lib/server/admin-audit-repository.ts',
  'lib/server/admin-dashboard-repository.ts',
  'lib/server/admin-finance-repository.ts',
  'lib/server/admin-operations-repository.ts',
  'lib/server/admin-settings-repository.ts',
  'lib/server/admin-accounts-repository.ts',
  'supabase/migrations/20260603095234_admin_accounts_system.sql',
  'supabase/migrations/20260605083000_gallery_public_showroom_theme.sql',
  'lib/server/admin-users-repository.ts',
  'lib/server/panel-repository.ts',
  'lib/server/public-slug-rotation.ts',
  'lib/server/qa-test-data-cleanup.ts',
  'lib/public-showroom.ts',
  'lib/public-showroom-theme.ts',
  'lib/public-catalog-types.ts',
  'lib/public-i18n.ts',
  'lib/public-vehicle-seo.ts',
  'components/public/public-vehicle-page-client.tsx',
  'lib/server/supabase-admin.ts',
  'lib/security/request-guards.ts',
  'lib/security/ops-monitor.ts',
  'scripts/monitor/prod-uptime-check.mjs',
  'scripts/qa/verify-image-quota-contract.mjs',
  'scripts/qa/verify-public-url-hardening-contract.mjs',
  'scripts/qa/verify-panel-quality-contract.mjs',
  'scripts/qa/verify-real-flow-smoke-contract.mjs',
  'scripts/qa/real-user-flow-smoke.mjs',
  'scripts/qa/prod-smoke-full.mjs',
  'scripts/qa/prod-smoke-with-vercel-env.sh',
  'scripts/qa/verify-prod-smoke-contract.mjs',
  'scripts/qa/verify-maintenance-endpoints-contract.mjs',
  'scripts/qa/verify-admin-panel-contract.mjs',
  'scripts/qa/verify-vehicle-input-limits.mjs',
  'scripts/qa/verify-retired-supabase-functions.mjs',
  'scripts/qa/verify-ops-monitoring-contract.mjs',
  'scripts/security/rotate-public-route-slugs.mjs',
  'scripts/security/supabase-backup.sh',
  'scripts/security/supabase-backup-verify.sh',
  'scripts/security/supabase-storage-backup.mjs',
  'scripts/security/supabase-restore.sh',
  'supabase/functions/create-vehicle/index.ts',
  'supabase/functions/create-b2b-request/index.ts',
  'supabase/functions/create-logistics-order/index.ts',
  'supabase/functions/qr-scan/index.ts',
]

for (const relPath of criticalFiles) {
  const absPath = path.join(projectRoot, relPath)
  checks.push(createCheck(`file.${relPath}`, fs.existsSync(absPath), 'must exist'))
}

checks.push(
  createCheck(
    'guard.vehicle_events_rate_limit',
    fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'checkRateLimit'),
    'vehicle-events endpoint must enforce rate limit',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_events_hash_ip_ua',
    fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'hashForStorage'),
    'vehicle-events endpoint should hash IP/User-Agent before DB write',
  ),
)
checks.push(
  createCheck(
    'guard.auth_login_rate_limit',
    fileContains(path.join(projectRoot, 'app/api/auth/login/route.ts'), 'auth-login:'),
    'auth login endpoint must enforce rate limit',
  ),
)
checks.push(
  createCheck(
    'guard.auth_errors_turkish_safe_copy',
    fileContains(path.join(projectRoot, 'lib/server/panel-auth-errors.ts'), 'invalid login credentials')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth-errors.ts'), 'invalid credentials')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth-errors.ts'), 'E-posta veya şifre hatalı')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth-errors.ts'), 'Çok fazla deneme yapıldı')
      && fileContains(path.join(projectRoot, 'app/api/auth/login/route.ts'), 'mapPanelAuthError')
      && fileContains(path.join(projectRoot, 'app/api/auth/register/route.ts'), 'mapPanelAuthError')
      && fileContains(path.join(projectRoot, 'app/api/auth/forgot-password/route.ts'), 'mapPanelAuthError')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'invalid login credentials use Turkish safe copy')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'safeCredentialErrorOk'),
    'Supabase auth errors must be mapped to safe Turkish user-facing copy instead of leaking raw provider messages',
  ),
)
checks.push(
  createCheck(
    'guard.real_qr_svg_generation',
    fileContains(path.join(projectRoot, 'package.json'), '"qrcode"')
      && fileContains(path.join(projectRoot, 'app/api/panel/qr-image/route.ts'), "QRCode.toString")
      && fileContains(path.join(projectRoot, 'app/api/panel/qr-image/route.ts'), "type: 'svg'")
      && fileContains(path.join(projectRoot, 'app/api/panel/qr-image/route.ts'), 'image/svg+xml')
      && fileContains(path.join(projectRoot, 'app/api/panel/qr-image/route.ts'), 'requirePanelSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/panel/qr-image/route.ts'), 'getTrustedMutationOrigins')
      && fileContains(path.join(projectRoot, 'app/api/panel/qr-image/route.ts'), 'hasSecurePublicRouteToken')
      && fileContains(path.join(projectRoot, 'components/shared/qr-code-image.tsx'), '/api/panel/qr-image')
      && fileContains(path.join(projectRoot, 'app/panel/qr-kodlar/page.tsx'), 'QrCodeImage')
      && fileContains(path.join(projectRoot, 'app/panel/qr-kodlar/yazdir/page.tsx'), 'QrCodeImage')
      && fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'publicUrl: absoluteUrl(`/arac/${routeId}?src=qr`)')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'auth panel qr image generates real svg')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'auth panel qr image rejects legacy route'),
    'panel QR cards and print templates must render real protected SVG QR codes for secure vehicle public URLs, not decorative QR icons',
  ),
)
checks.push(
  createCheck(
    'guard.qr_system_quality_contract',
    fileContains(path.join(projectRoot, 'package.json'), '"quality:qr-system"')
      && fileContains(path.join(projectRoot, 'package.json'), 'scripts/qa/verify-qr-system-contract.mjs')
      && fs.existsSync(path.join(projectRoot, 'scripts/qa/verify-qr-system-contract.mjs')),
    'QR standard SVG generation, secure route token, scan, lead, analytics, and prod smoke checks must stay covered by a dedicated quality contract',
  ),
)
checks.push(
  createCheck(
    'guard.trusted_mutation_origin',
    fileContains(path.join(projectRoot, 'lib/security/request-guards.ts'), 'trustedMutationOriginResponse')
      && fileContains(path.join(projectRoot, 'lib/security/request-guards.ts'), 'isTrustedMutationOrigin')
      && fileContains(path.join(projectRoot, 'lib/security/request-guards.ts'), 'sec-fetch-site')
      && fileContains(path.join(projectRoot, 'lib/security/request-guards.ts'), "error: 'untrusted_origin'")
      && fileContains(path.join(projectRoot, 'lib/server/admin-route-guard.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth-guard.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/auth/login/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/auth/register/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/auth/forgot-password/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/auth/logout/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/admin/login/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/admin/logout/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/contact/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/vehicle-lead/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/public/geocode/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/landing/cta-events/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'app/api/audit/route.ts'), 'trustedMutationOriginResponse(request)')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'cross-site auth login blocked')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'cross-site contact blocked'),
    'mutating browser-facing endpoints must block untrusted cross-site Origin/Referer/Sec-Fetch-Site requests',
  ),
)
checks.push(
  createCheck(
    'guard.security_response_headers',
    fileContains(path.join(projectRoot, 'next.config.mjs'), 'Content-Security-Policy')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'scriptSources')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'if (!isProduction)')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), "'unsafe-eval'")
      && fileContains(path.join(projectRoot, 'next.config.mjs'), "default-src 'self'")
      && fileContains(path.join(projectRoot, 'next.config.mjs'), "object-src 'none'")
      && fileContains(path.join(projectRoot, 'next.config.mjs'), "frame-ancestors 'none'")
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'Strict-Transport-Security')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'max-age=63072000; includeSubDomains; preload')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'X-Content-Type-Options')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'nosniff')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'Permissions-Policy')
      && fileContains(path.join(projectRoot, 'next.config.mjs'), 'Cross-Origin-Opener-Policy')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'security headers present')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'securityHeadersOk')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), "!csp.includes(\"'unsafe-eval'\")"),
    'production responses must carry CSP, HSTS, nosniff, frame, referrer, permissions, and COOP/CORP security headers with smoke coverage',
  ),
)
checks.push(
  createCheck(
    'guard.admin_panel_username_password_auth',
    fileContains(path.join(projectRoot, 'lib/server/admin-auth.ts'), 'ADMIN_PASSWORD_SHA256')
      && fileContains(path.join(projectRoot, 'lib/server/admin-auth.ts'), 'timingSafeEqual')
      && fileContains(path.join(projectRoot, 'lib/server/admin-auth.ts'), 'return process.env.ADMIN_SESSION_SECRET || null')
      && !fileContains(path.join(projectRoot, 'lib/server/admin-auth.ts'), 'process.env.ADMIN_SESSION_SECRET || process.env.PANEL_SESSION_SECRET')
      && !fileContains(path.join(projectRoot, 'lib/server/admin-auth.ts'), 'process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY')
      && fileContains(path.join(projectRoot, 'lib/server/admin-auth.ts'), "ADMIN_SESSION_COOKIE_NAME = 'autoqrent_admin_session'")
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'return process.env.PANEL_SESSION_SECRET || null')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'safeEqual(expected, signature)')
      && !fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'process.env.PANEL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY')
      && fileContains(path.join(projectRoot, 'app/api/admin/login/route.ts'), 'admin-login:')
      && fileContains(path.join(projectRoot, 'app/api/admin/login/route.ts'), 'username')
      && fileContains(path.join(projectRoot, 'app/admin/giris/page.tsx'), 'Kullanıcı adı')
      && !fileContains(path.join(projectRoot, 'app/admin/giris/page.tsx'), 'type="email"')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/session')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/login')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/dashboard')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/audit')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/operations')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/settings')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/accounts')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-admin-panel-contract.mjs'), 'admin auth uses isolated cookie'),
    'admin panel must use username/password auth with hashed env password, isolated cookie, rate limit, robots block, and smoke coverage',
  ),
)
checks.push(
  createCheck(
    'guard.panel_session_cookie_encrypted',
    fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'createCipheriv')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'createDecipheriv')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), "'aes-256-gcm'")
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), "ENCRYPTED_SESSION_COOKIE_VERSION = 'v2'")
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'randomBytes(SESSION_COOKIE_IV_BYTES)')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'cipher.setAAD(SESSION_COOKIE_AAD)')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'cipher.getAuthTag()')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'decipher.setAuthTag')
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'return `${envelope}.${signature}`')
      && !fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'payloadBase64'),
    'panel session cookie must encrypt access/refresh tokens instead of storing readable signed base64 JSON',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_no_legacy_mock_platform_api',
    !fs.existsSync(path.join(projectRoot, 'apps/super-admin/src/lib/mock-platform-api.ts'))
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-tenant-types.ts'), 'tenantPaymentStatuses')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-tenant-types.ts'), 'TenantCreateInput')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), '@/lib/platform-tenant-types')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/tenant-management-page.tsx'), '@/lib/platform-tenant-types')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'mock-platform-api')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/tenant-management-page.tsx'), 'mock-platform-api'),
    'super admin frontend must not ship the legacy mock platform api or fake tenant/user records',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_route_code_splitting',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'Suspense')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'RouteLoadingState')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), "import('@/pages/dashboard-page')")
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), "import('@/pages/tenant-management-page')")
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), "import('@/pages/admin-accounts-page')")
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), '<RouteComponent />'),
    'super admin routes must stay page-lazy to avoid a single oversized browser bundle',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_route_intent_preload',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'preloadRoute')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'routePreloadCache')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'onNavigateIntent={preloadRoute}')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/layout/super-admin-layout.tsx'), 'onNavigateIntent')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/layout/super-admin-layout.tsx'), 'onPointerEnter')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/layout/super-admin-layout.tsx'), 'onFocus'),
    'super admin navigation should preload page chunks on hover/focus without eager loading every route',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_api_request_timeout',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'DEFAULT_ADMIN_API_TIMEOUT_MS')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'AbortController')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'buildTimeoutMessage')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'window.setTimeout')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'window.clearTimeout')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'buildRequestHeaders')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), "credentials: 'include'"),
    'super admin api client must timeout and abort slow admin requests without dropping the session cookie',
  ),
)
checks.push(
  createCheck(
    'guard.admin_critical_action_reason_confirmation',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/components/platform/critical-action-confirmation.tsx'), 'confirmationPhrase')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/platform/critical-action-confirmation.tsx'), 'İşlem sebebi')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'CriticalActionConfirmation')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'criticalReason')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/tenant-management-page.tsx'), 'CriticalActionConfirmation')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/tenant-management-page.tsx'), 'hasCriticalTenantFormChange')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'AdminActionReasonInput')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/status/route.ts'), 'reason: z.string().trim().min(12).max(500)')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/authorization/route.ts'), 'reason: z.string().trim().min(12).max(500)')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/subscription/route.ts'), 'reason: z.string().trim().min(12).max(500)')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/delete/route.ts'), 'reason: z.string().trim().min(12).max(500)')
      && fileContains(path.join(projectRoot, 'app/api/admin/tenants/[tenantId]/route.ts'), 'reason_required')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), 'reason: input.reason')
      && fileContains(path.join(projectRoot, 'lib/server/admin-tenants-repository.ts'), 'reason: input.reason || null')
      && fileContains(path.join(projectRoot, 'components/admin/admin-action-controls.tsx'), 'MIN_ADMIN_ACTION_REASON_LENGTH')
      && fileContains(path.join(projectRoot, 'components/admin/admin-action-controls.tsx'), 'AdminActionReasonField'),
    'critical admin mutations must require explicit confirmation and an audit-log reason across super-admin UI, legacy admin UI, API routes, and repositories',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_dashboard_chart_code_splitting',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/dashboard-page.tsx'), "import('@/components/platform/dashboard-trend-grid')")
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/dashboard-page.tsx'), 'ChartsLoadingGrid')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/dashboard-page.tsx'), "from 'recharts'")
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/platform/dashboard-trend-grid.tsx'), "from 'recharts'")
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/platform/dashboard-trend-grid.tsx'), 'ResponsiveContainer'),
    'super admin dashboard charts must stay lazy-loaded so Recharts is not part of the initial dashboard chunk',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_bundle_budget_gate',
    fileContains(path.join(projectRoot, 'scripts/qa/verify-super-admin-bundle-budget.mjs'), 'dashboard-page-')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-super-admin-bundle-budget.mjs'), 'dashboard-trend-grid-')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-super-admin-bundle-budget.mjs'), 'public/super-admin/assets')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-super-admin-bundle-budget.mjs'), 'entryRaw')
      && fileContains(path.join(projectRoot, 'package.json'), 'super-admin:bundle-budget')
      && fileContains(path.join(projectRoot, 'vercel.json'), 'pnpm super-admin:bundle-budget'),
    'super admin deploy must enforce bundle budgets after public bundle generation',
  ),
)
checks.push(
  createCheck(
    'guard.admin_users_management_real_data',
    fileContains(path.join(projectRoot, 'app/api/admin/users/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/route.ts'), 'adminRouteErrorResponse')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), '/auth/v1/admin/users')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), '/rest/v1/galleries')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), '/rest/v1/vehicles')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), '/rest/v1/leads')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), '/auth/v1/recover')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), 'email_confirm')
      && fileContains(path.join(projectRoot, 'lib/server/admin-users-repository.ts'), 'ban_duration')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/password-reset/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/email-verification/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/status/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/admin/page.tsx'), 'Admin Yönetim Merkezi')
      && fileContains(path.join(projectRoot, 'app/admin/kullanicilar/page.tsx'), 'Kullanıcılar')
      && fileContains(path.join(projectRoot, 'app/admin/page.tsx'), 'AdminPanelShell')
      && fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), 'bg-sidebar')
      && fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), 'sticky top-0 z-30 h-16')
      && fileContains(path.join(projectRoot, 'app/admin/_lib/page-data.ts'), 'listAdminManagedUsers')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-admin-panel-contract.mjs'), 'admin users repository reads galleries vehicles leads'),
    'admin management panel must show registered users from real Supabase auth/gallery/vehicle/lead data behind admin auth',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_users_real_data',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'platformApi.listUsers')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'platformApi.resetUserPassword')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'platformApi.verifyUserEmail')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'platformApi.setUserStatus')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/user-management-page.tsx'), 'mockPlatformApi')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), '/api/admin/users')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-user-types.ts'), 'derivePlatformUserStatus')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users/demo-user/password-reset')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users/demo-user/email-verification')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users/demo-user/status'),
    'super admin users module must use protected live Supabase admin API actions without mock data or service-role exposure',
  ),
)
checks.push(
  createCheck(
    'guard.admin_dashboard_real_data',
    fileContains(path.join(projectRoot, 'app/api/admin/dashboard/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/dashboard/route.ts'), 'getAdminDashboardSnapshot')
      && fileContains(path.join(projectRoot, 'lib/server/admin-dashboard-repository.ts'), '/auth/v1/admin/users')
      && fileContains(path.join(projectRoot, 'lib/server/admin-dashboard-repository.ts'), '/rest/v1/galleries')
      && fileContains(path.join(projectRoot, 'lib/server/admin-dashboard-repository.ts'), '/rest/v1/vehicles')
      && fileContains(path.join(projectRoot, 'lib/server/admin-dashboard-repository.ts'), '/rest/v1/qr_scans')
      && fileContains(path.join(projectRoot, 'lib/server/admin-dashboard-repository.ts'), '/rest/v1/leads')
      && fileContains(path.join(projectRoot, 'lib/server/admin-dashboard-repository.ts'), '/rest/v1/audit_logs')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/dashboard-page.tsx'), 'platformApi.getDashboardSnapshot')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/components/platform/dashboard-trend-grid.tsx'), 'QR kullanım trendi')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/dashboard-page.tsx'), 'mockPlatformApi.getDashboardSnapshot')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY'),
    'super admin dashboard must use protected live Supabase admin API without exposing service role to the browser',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_audit_real_data',
    fileContains(path.join(projectRoot, 'app/api/admin/audit/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/audit/route.ts'), 'getAdminAuditSnapshot')
      && fileContains(path.join(projectRoot, 'lib/server/admin-audit-repository.ts'), '/rest/v1/audit_logs')
      && fileContains(path.join(projectRoot, 'lib/server/admin-audit-repository.ts'), 'buildMetadataPreview')
      && fileContains(path.join(projectRoot, 'lib/server/admin-audit-repository.ts'), 'Mock audit satırı')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'platformApi.getAuditSnapshot')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'Sahte satır gösterilmiyor')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'Component: AuditLogPage')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/audit')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY'),
    'super admin audit module must use protected live Supabase audit_logs API without mock data or service-role exposure',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_audit_safe_detail_drawer',
    fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'AuditDetailDrawer')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'sanitizeAuditMetadata')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'readAuditReason')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'Hassas alanlar maskeli')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/audit-log-page.tsx'), 'Sebep:')
      && fileContains(path.join(projectRoot, 'lib/server/admin-audit-repository.ts'), 'sanitizeMetadataForPreview')
      && fileContains(path.join(projectRoot, 'lib/server/admin-audit-repository.ts'), 'isSensitiveMetadataKey'),
    'super admin audit detail view must show real metadata with reason surfaced and sensitive keys redacted',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_finance_real_data',
    fileContains(path.join(projectRoot, 'app/api/admin/finance/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/finance/route.ts'), 'getAdminFinanceSnapshot')
      && fileContains(path.join(projectRoot, 'lib/server/admin-finance-repository.ts'), '/auth/v1/admin/users')
      && fileContains(path.join(projectRoot, 'lib/server/admin-finance-repository.ts'), '/rest/v1/galleries')
      && fileContains(path.join(projectRoot, 'lib/server/admin-finance-repository.ts'), '/rest/v1/audit_logs')
      && fileContains(path.join(projectRoot, 'lib/server/admin-finance-repository.ts'), 'REVENUE_METADATA_KEYS')
      && fileContains(path.join(projectRoot, 'lib/server/admin-finance-repository.ts'), 'Paket fiyatı uydurulmaz')
      && fileContains(path.join(projectRoot, 'lib/server/admin-finance-repository.ts'), 'mock veri')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/finance-page.tsx'), 'platformApi.getFinanceSnapshot')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'Component: FinancePage')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/finance')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY'),
    'super admin finance module must use protected live Supabase admin API and must not infer revenue from fake package prices',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_settings_real_config',
    fileContains(path.join(projectRoot, 'app/api/admin/settings/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/settings/route.ts'), 'getAdminSettingsSnapshot')
      && fileContains(path.join(projectRoot, 'lib/server/admin-settings-repository.ts'), 'process.env')
      && fileContains(path.join(projectRoot, 'lib/server/admin-settings-repository.ts'), 'maskValue')
      && fileContains(path.join(projectRoot, 'lib/server/admin-settings-repository.ts'), 'SUPABASE_SERVICE_ROLE_KEY')
      && fileContains(path.join(projectRoot, 'lib/server/admin-settings-repository.ts'), 'ADMIN_PASSWORD_SHA256')
      && fileContains(path.join(projectRoot, 'lib/server/admin-settings-repository.ts'), 'Gizli değerler tarayıcıya')
      && fileContains(path.join(projectRoot, 'lib/server/admin-settings-repository.ts'), 'sahte ayar')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/settings-page.tsx'), 'platformApi.getSettingsSnapshot')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/settings-page.tsx'), 'Gizli değer yazma kapalı')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'Component: SettingsPage')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/settings')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY'),
    'super admin settings module must use protected live runtime config and must not expose secret values to the browser',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_accounts_real_config',
    fileContains(path.join(projectRoot, 'app/api/admin/accounts/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/accounts/route.ts'), 'requireAdminRoleOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/accounts/route.ts'), 'getAdminAccountsSnapshot')
      && fileContains(path.join(projectRoot, 'app/api/admin/accounts/route.ts'), 'createAdminAccount')
      && fileContains(path.join(projectRoot, 'app/api/admin/accounts/[accountId]/route.ts'), 'updateAdminAccount')
      && fileContains(path.join(projectRoot, 'app/api/admin/accounts/[accountId]/route.ts'), 'softDeleteAdminAccount')
      && fileContains(path.join(projectRoot, 'lib/server/admin-accounts-repository.ts'), 'ADMIN_PASSWORD_SHA256')
      && fileContains(path.join(projectRoot, 'lib/server/admin-accounts-repository.ts'), 'ADMIN_SESSION_COOKIE_NAME')
      && fileContains(path.join(projectRoot, 'lib/server/admin-accounts-repository.ts'), '/rest/v1/admin_accounts')
      && fileContains(path.join(projectRoot, 'lib/server/admin-accounts-repository.ts'), '/rest/v1/audit_logs')
      && fileContains(path.join(projectRoot, 'lib/server/admin-accounts-repository.ts'), 'scrypt:v1')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/admin-accounts-page.tsx'), 'platformApi.getAdminAccountsSnapshot')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/admin-accounts-page.tsx'), 'platformApi.createAdminAccount')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/admin-accounts-page.tsx'), 'platformApi.updateAdminAccount')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/admin-accounts-page.tsx'), 'platformApi.deleteAdminAccount')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/App.tsx'), 'Component: AdminAccountsPage')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/accounts')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/accounts/demo-account')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY'),
    'super admin accounts module must manage DB-backed admin accounts without fake admin CRUD or secret exposure',
  ),
)
checks.push(
  createCheck(
    'guard.super_admin_operations_real_data',
    fileContains(path.join(projectRoot, 'app/api/admin/operations/route.ts'), 'requireAdminSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/admin/operations/route.ts'), 'getAdminOperationsSnapshot')
      && fileContains(path.join(projectRoot, 'app/api/admin/operations/moderation/route.ts'), 'recordAdminModerationAction')
      && fileContains(path.join(projectRoot, 'lib/server/admin-operations-repository.ts'), '/rest/v1/audit_logs')
      && fileContains(path.join(projectRoot, 'lib/server/admin-operations-repository.ts'), '/rest/v1/galleries')
      && fileContains(path.join(projectRoot, 'lib/server/admin-operations-repository.ts'), 'Destek talebi tablosu bağlı değil')
      && fileContains(path.join(projectRoot, 'lib/server/admin-operations-repository.ts'), 'tickets: []')
      && fileContains(path.join(projectRoot, 'lib/server/admin-operations-repository.ts'), 'admin_moderation_action')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/support-operations-page.tsx'), 'platformApi.getOperationsSnapshot')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/support-operations-page.tsx'), 'platformApi.recordModerationAction')
      && fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/support-operations-page.tsx'), 'platformApi.sendBroadcast')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/pages/support-operations-page.tsx'), 'mockOperationsApi')
      && !fs.existsSync(path.join(projectRoot, 'apps/super-admin/src/lib/mock-operations-api.ts'))
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/operations')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/operations/moderation')
      && !fileContains(path.join(projectRoot, 'apps/super-admin/src/lib/platform-api.ts'), 'SUPABASE_SERVICE_ROLE_KEY'),
    'super admin operations module must use protected live audit/notification APIs without mock data or service-role exposure',
  ),
)
checks.push(
  createCheck(
    'guard.admin_category_actions',
    fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), '/admin/kullanicilar')
      && fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), '/admin/yetkilendirme')
      && fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), '/admin/abonelikler')
      && fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), '/admin/bildirimler')
      && !fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), '/panel')
      && !fileContains(path.join(projectRoot, 'components/admin/admin-panel-shell.tsx'), '/api/health')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/delete/route.ts'), 'confirmEmail')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/authorization/route.ts'), 'ADMIN_ACCOUNT_ROLES')
      && fileContains(path.join(projectRoot, 'app/api/admin/users/[userId]/subscription/route.ts'), 'ADMIN_SUBSCRIPTION_PLANS')
      && fileContains(path.join(projectRoot, 'app/api/admin/notifications/route.ts'), "z.enum(['single', 'bulk'])")
      && fileContains(path.join(projectRoot, 'lib/server/panel-auth-guard.ts'), 'verifyPanelSessionUser'),
    'admin actions must be split into sidebar categories and guard stale/suspended panel sessions',
  ),
)
checks.push(
  createCheck(
    'guard.public_route_token_helper',
    fileContains(path.join(projectRoot, 'lib/security/public-route-token.ts'), "randomBytes(bytes).toString('hex')")
      && fileContains(path.join(projectRoot, 'lib/security/public-route-token.ts'), 'PUBLIC_ROUTE_TOKEN_BYTES = 16')
      && fileContains(path.join(projectRoot, 'lib/security/public-route-token.ts'), 'hasSecurePublicRouteToken'),
    'public route helper must use 16 bytes of cryptographically random entropy and detect existing secure slugs',
  ),
)
checks.push(
  createCheck(
    'guard.public_slug_rotation_script',
    fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), "ROTATE_PUBLIC_ROUTE_SLUGS_CONFIRM === 'YES'")
      && fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), "table: 'galleries'")
      && fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), "table: 'vehicles'")
      && fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), 'for (const row of rows)')
      && fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), 'verifySecureSlugs')
      && !fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), 'Promise.all(rows'),
    'existing public gallery and vehicle slugs must be rotatable with an explicit confirmation gate and sequential updates',
  ),
)
checks.push(
  createCheck(
    'guard.public_slug_rotation_endpoint',
    fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), "MAINTENANCE_SLUG_ROTATE_ENABLED === 'YES'")
      && fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), 'MAINTENANCE_SLUG_ROTATE_SECRET')
      && fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), 'authorization !== `Bearer ${rotateSecret}`')
      && fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), 'rotateExistingPublicRouteSlugs')
      && fileContains(path.join(projectRoot, 'lib/server/public-slug-rotation.ts'), "table: 'galleries'")
      && fileContains(path.join(projectRoot, 'lib/server/public-slug-rotation.ts'), "table: 'vehicles'")
      && fileContains(path.join(projectRoot, 'lib/server/public-slug-rotation.ts'), 'for (const row of rows)')
      && fileContains(path.join(projectRoot, 'lib/server/public-slug-rotation.ts'), 'verifySecureSlugs'),
    'production public slug rotation must be exposed only through a secret-protected maintenance endpoint with sequential updates',
  ),
)
checks.push(
  createCheck(
    'guard.maintenance_slug_rotation_double_lock',
    fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), "MAINTENANCE_SLUG_ROTATE_ENABLED === 'YES'")
      && fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), 'Public slug rotate endpoint devre dışı')
      && fileContains(path.join(projectRoot, 'app/api/cron/rotate-public-slugs/route.ts'), "action: 'public_slug_rotation'")
      && fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), "ROTATE_PUBLIC_ROUTE_SLUGS_CONFIRM === 'YES'")
      && fileContains(path.join(projectRoot, 'scripts/security/rotate-public-route-slugs.mjs'), "source: 'rotate_public_slugs_script'")
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/cron/rotate-public-slugs?dryRun=1')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-maintenance-endpoints-contract.mjs'), 'rotate endpoint requires explicit enable flag'),
    'public slug maintenance must be double-locked, audited, and covered by production smoke',
  ),
)
checks.push(
  createCheck(
    'guard.qa_test_data_cleanup_endpoint',
    fileContains(path.join(projectRoot, 'app/api/cron/cleanup-qa-test-data/route.ts'), 'MAINTENANCE_QA_CLEANUP_SECRET')
      && fileContains(path.join(projectRoot, 'app/api/cron/cleanup-qa-test-data/route.ts'), 'authorization !== `Bearer ${cleanupSecret}`')
      && fileContains(path.join(projectRoot, 'app/api/cron/cleanup-qa-test-data/route.ts'), 'QA cleanup endpoint devre dışı')
      && fileContains(path.join(projectRoot, 'app/api/cron/cleanup-qa-test-data/route.ts'), 'dryRun')
      && fileContains(path.join(projectRoot, 'app/api/cron/cleanup-qa-test-data/route.ts'), 'cleanupQaTestData'),
    'production QA cleanup must be exposed only through a disabled-by-default secret maintenance endpoint with dry-run support',
  ),
)
checks.push(
  createCheck(
    'guard.qa_test_data_cleanup_safe_pattern',
    fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), "QA_OWNER_EMAIL_PREFIX = 'akis-'")
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), "QA_OWNER_EMAIL_DOMAIN = 'cebindegaleri.com'")
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), '^akis-\\d{14}@cebindegaleri\\.com$')
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), 'for (const gallery of safeTargets)')
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), 'for (const user of authUsers)')
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), 'deleteVehicleImageObjectsForGallery')
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), '/auth/v1/admin/users')
      && fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), 'should_soft_delete: false')
      && !fileContains(path.join(projectRoot, 'lib/server/qa-test-data-cleanup.ts'), 'Promise.all(safeTargets'),
    'QA cleanup must only target safe akis smoke-test galleries/auth users, delete sequentially, and clear storage objects before gallery cascade',
  ),
)
checks.push(
  createCheck(
    'guard.public_vehicle_secure_route_token',
    fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), "buildSecurePublicSlug(`${input.brand}-${input.model}-${input.year}`, 'arac')")
      && !fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), "Date.now().toString().slice(-6)")
      && fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'getQrCodeFromRouteId'),
    'new public vehicle/QR routes must use cryptographically random route tokens, not timestamp suffixes',
  ),
)
checks.push(
  createCheck(
    'guard.public_showroom_secure_route_token',
    fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), "buildSecurePublicSlug(input.galleryName, 'galeri')")
      && fileContains(path.join(projectRoot, 'app/api/panel/settings/route.ts'), "ensureSecurePublicSlug(parsed.data.slug, 'galeri')")
      && fileContains(path.join(projectRoot, 'lib/public-showroom.ts'), 'if (!hasSecurePublicRouteToken(normalized)) return null')
      && fileContains(path.join(projectRoot, 'lib/public-showroom.ts'), 'fetchPublicGalleryRows(normalized)')
      && fileContains(path.join(projectRoot, 'lib/public-showroom.ts'), 'slug: `eq.${slug}`')
      && !fileContains(path.join(projectRoot, 'lib/public-showroom.ts'), 'id: `eq.${normalized}`')
      && fileContains(path.join(projectRoot, 'app/panel/ayarlar/page.tsx'), 'cebindegaleri.com/showroom/')
      && !fileContains(path.join(projectRoot, 'app/demo/page.tsx'), '/showroom/demo-galeri')
      && !fileContains(path.join(projectRoot, 'app/demo/page.tsx'), '/arac/demo-arac'),
    'new public showroom routes and panel slug updates must use secure route tokens, not short fake/demo slugs',
  ),
)
checks.push(
  createCheck(
    'guard.auth_registration_no_timestamp_showroom_slug',
    !fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), "Date.now().toString().slice(-6)")
      && !fileContains(path.join(projectRoot, 'lib/server/panel-auth.ts'), 'galeri-${Date.now().toString(36)}'),
    'registration must not generate showroom slugs from timestamps',
  ),
)
checks.push(
  createCheck(
    'guard.public_vehicle_no_uuid_route_lookup',
    fileContains(path.join(projectRoot, 'lib/public-vehicle-seo.ts'), 'slug: `eq.${normalized}`')
      && !fileContains(path.join(projectRoot, 'lib/public-vehicle-seo.ts'), 'id: `eq.${normalized}`')
      && fileContains(path.join(projectRoot, 'lib/public-vehicle-seo.ts'), 'stockId: routeId')
      && fileContains(path.join(projectRoot, 'lib/public-vehicle-seo.ts'), 'if (!hasSecurePublicRouteToken(normalized)) return null'),
    'public vehicle pages must resolve by route token only and must not expose internal vehicle UUID',
  ),
)
checks.push(
  createCheck(
    'guard.public_vehicle_events_route_token_only',
    fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'vehicleRouteId')
      && !fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'z.string().uuid')
      && fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'refine(hasSecurePublicRouteToken')
      && fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), 'MAX_PUBLIC_ROUTE_SLUG_LENGTH')
      && fileContains(path.join(projectRoot, 'components/public/public-vehicle-page-client.tsx'), 'vehicleRouteId: vehicle.routeId'),
    'public vehicle event tracking must use route token instead of client-submitted vehicle UUID',
  ),
)
checks.push(
  createCheck(
    'guard.public_route_guard_rejects_legacy_slugs',
    fileContains(path.join(projectRoot, 'lib/public-showroom.ts'), 'if (!hasSecurePublicRouteToken(normalized)) return null')
      && fileContains(path.join(projectRoot, 'lib/public-vehicle-seo.ts'), 'if (!hasSecurePublicRouteToken(normalized)) return null')
      && fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'if (!hasSecurePublicRouteToken(normalized)) return null')
      && fileContains(path.join(projectRoot, 'app/api/vehicle-lead/route.ts'), 'refine(hasSecurePublicRouteToken')
      && fileContains(path.join(projectRoot, 'app/api/vehicle-lead/route.ts'), 'MAX_PUBLIC_ROUTE_SLUG_LENGTH'),
    'public vehicle/showroom/lead flows must reject legacy short slugs before lookup',
  ),
)
checks.push(
  createCheck(
    'guard.prod_smoke_full_package',
    fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/health')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/auth/session')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/session')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/login')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/audit')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/operations')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/operations/moderation')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/finance')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/settings')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/accounts')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users/demo-user/authorization')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users/demo-user/subscription')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/users/demo-user/delete')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/admin/notifications')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/uploads/vehicle-images')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/alerts')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/audit-logs?limit=5')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/analytics/funnel?range=7days')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/analytics/showroom?range=7days')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/analytics/landing?range=7days')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/panel/analytics/landing-config')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'PROD_SMOKE_REQUIRE_AUTH')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'encryptedPanelCookieOk')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'auth smoke encrypted panel cookie')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), "parts[0] === 'v2'")
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), "!cookieValue.includes('access_token')")
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), "!cookieValue.includes('refresh_token')")
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-prod-smoke-contract.mjs'), 'prod smoke checks encrypted panel cookie format')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-with-vercel-env.sh'), 'vercel env pull')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-with-vercel-env.sh'), 'PROD_SMOKE_REQUIRE_AUTH=1')
      && fileContains(path.join(projectRoot, 'package.json'), '"smoke:prod:auth"')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/public/vehicle-events')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/api/vehicle-lead')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), '/arac/demo')
      && !fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'Promise.all')
      && !fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'next start')
      && fileContains(path.join(projectRoot, 'package.json'), '"smoke:prod"')
      && fileContains(path.join(projectRoot, '.github/workflows/prod-smoke-monitor.yml'), 'pnpm smoke:prod'),
    'production smoke must verify live health, auth, panel, upload, QR, lead, and public guard without local server fanout',
  ),
)
checks.push(
  createCheck(
    'guard.panel_quality_no_fake_vehicle_placeholder',
    fileContains(path.join(projectRoot, 'components/shared/vehicle-image-frame.tsx'), 'Görsel yok')
      && fileContains(path.join(projectRoot, 'app/panel/qr-kodlar/page.tsx'), 'validSelectedVehicleIds.length > 0 ?')
      && fileContains(path.join(projectRoot, 'app/panel/qr-kodlar/page.tsx'), 'isAllFilteredSelected')
      && fileContains(path.join(projectRoot, 'app/panel/ayarlar/page.tsx'), "placeholder='0530 XXX XX XX'")
      && fileContains(path.join(projectRoot, 'app/onboarding/page.tsx'), 'placeholder="0530 XXX XX XX"')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-panel-quality-contract.mjs'), 'filesWithFakePlaceholder.length === 0')
      && !fileContains(path.join(projectRoot, 'components/shared/vehicle-card.tsx'), '/placeholder.jpg')
      && !fileContains(path.join(projectRoot, 'components/public/public-vehicle-page-client.tsx'), '/placeholder.jpg')
      && !fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), '/placeholder.jpg')
      && !fileContains(path.join(projectRoot, 'app/panel/analitik/page.tsx'), '/placeholder.jpg')
      && !fileContains(path.join(projectRoot, 'app/panel/araclar/page.tsx'), '/placeholder.jpg')
      && !fileContains(path.join(projectRoot, 'app/panel/araclar/[id]/page.tsx'), '/placeholder.jpg'),
    'panel/public vehicle surfaces must not use fake placeholder vehicle images or selected-empty QR print links',
  ),
)
checks.push(
  createCheck(
    'guard.panel_gallery_showroom_entry',
    fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'getPanelGalleryShowroomSummary')
      && fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'ensureGallerySecureSlug')
      && fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'publicShowroomUrl: absoluteUrl(showroomPath)')
      && fileContains(path.join(projectRoot, 'app/api/panel/settings/route.ts'), 'publicShowroomUrl: absoluteUrl(`/showroom/${safeSlug}`)')
      && fileContains(path.join(projectRoot, 'app/api/panel/settings/route.ts'), 'if (!hasSecurePublicRouteToken(safeSlug))')
      && fileContains(path.join(projectRoot, 'app/panel/page.tsx'), 'getPanelGalleryShowroomSummary(session.email)')
      && fileContains(path.join(projectRoot, 'app/panel/page.tsx'), 'Herkese Açık Galeri Sayfanız')
      && fileContains(path.join(projectRoot, 'app/panel/page.tsx'), 'Galeri Sayfamı Aç')
      && fileContains(path.join(projectRoot, 'components/dashboard/sidebar.tsx'), 'Galeri Sayfam')
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), 'DealerLogoMark')
      && fileContains(path.join(projectRoot, 'lib/public-i18n.ts'), 'Public galeri sitesi')
      && fileContains(path.join(projectRoot, 'lib/public-i18n.ts'), 'Araç bilgileri')
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), 'dealer.websiteUrl')
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), 'usePublicLocale()')
      && fileContains(path.join(projectRoot, 'components/public/public-vehicle-page-client.tsx'), 'usePublicLocale()')
      && fileContains(path.join(projectRoot, 'components/shared/public-language-switcher.tsx'), 'navigator.languages')
      && fileContains(path.join(projectRoot, 'components/shared/public-language-switcher.tsx'), 'PUBLIC_LOCALE_STORAGE_KEY')
      && fileContains(path.join(projectRoot, 'components/public/public-vehicle-page-client.tsx'), 'env(safe-area-inset-bottom)')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'auth panel settings exposes gallery showroom url')
      && fileContains(path.join(projectRoot, 'scripts/qa/prod-smoke-full.mjs'), 'panelSettingsShowroomOk')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-panel-quality-contract.mjs'), 'panel exposes each gallery public showroom entry'),
    'every logged-in gallery must have a protected panel entry to its own localized public showroom page with secure slug auto-healing and real gallery details',
  ),
)
checks.push(
  createCheck(
    'guard.panel_showroom_conversion_analytics',
    fileContains(path.join(projectRoot, 'app/api/panel/analytics/showroom/route.ts'), 'getShowroomCtaAnalytics')
      && fileContains(path.join(projectRoot, 'app/api/panel/analytics/showroom/route.ts'), 'requirePanelSessionOrThrow')
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), 'public_showroom_cta_click')
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), 'public_vehicle_cta_click')
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), 'lead_form_open')
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), 'lead_form_submit')
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), "source: 'eq.showroom'")
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), "readMetadataValue(row.metadata, 'source') !== 'showroom'")
      && fileContains(path.join(projectRoot, 'lib/server/analytics-repository.ts'), "'metadata->>galleryId'")
      && fileContains(path.join(projectRoot, 'app/panel/analitik/page.tsx'), '/api/panel/analytics/showroom')
      && fileContains(path.join(projectRoot, 'app/panel/analitik/page.tsx'), 'Galeri sayfası dönüşüm')
      && fileContains(path.join(projectRoot, 'app/panel/analitik/page.tsx'), 'Sahte veri gösterilmiyor')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-panel-quality-contract.mjs'), 'panel analytics reports public showroom conversion from real audit and lead data'),
    'panel analytics must report public showroom conversion only from real audit_logs and showroom leads',
  ),
)
checks.push(
  createCheck(
    'guard.public_showroom_lead_theme_conversion',
    fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), 'handleShowroomLeadSubmit')
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), '/api/vehicle-lead')
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), "source: 'showroom'")
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), "recordShowroomEvent('lead_form_open'")
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), "recordShowroomEvent('lead_form_submit'")
      && fileContains(path.join(projectRoot, 'components/showroom/showroom-page-client.tsx'), 'var(--showroom-accent)')
      && fileContains(path.join(projectRoot, 'app/panel/ayarlar/page.tsx'), 'Herkese Açık Sayfa Tema ve Logo')
      && fileContains(path.join(projectRoot, 'app/panel/ayarlar/page.tsx'), 'publicThemeStorageReady')
      && fileContains(path.join(projectRoot, 'app/api/panel/settings/route.ts'), 'publicTheme: z.object')
      && fileContains(path.join(projectRoot, 'app/api/panel/settings/route.ts'), 'public_showroom_note')
      && fileContains(path.join(projectRoot, 'lib/public-showroom-theme.ts'), 'normalizePublicShowroomTheme')
      && fileContains(path.join(projectRoot, 'lib/public-showroom-theme.ts'), 'isSafePublicAccentColor')
      && fileContains(path.join(projectRoot, 'lib/public-showroom.ts'), 'THEME_GALLERY_SELECT')
      && fileContains(path.join(projectRoot, 'supabase/migrations/20260605083000_gallery_public_showroom_theme.sql'), 'public_theme')
      && fileContains(path.join(projectRoot, 'supabase/migrations/20260605083000_gallery_public_showroom_theme.sql'), 'public_accent_color')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-panel-quality-contract.mjs'), 'public showroom lead form posts real selected vehicle lead to panel')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-panel-quality-contract.mjs'), 'panel settings controls public showroom theme without fake metrics'),
    'public showroom must convert real selected-vehicle leads and allow gallery-owned safe theme/logo presentation without fake metrics',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_integer_input_limits',
    fileContains(path.join(projectRoot, 'lib/vehicle-limits.ts'), 'VEHICLE_INTEGER_LIMITS')
      && fileContains(path.join(projectRoot, 'lib/vehicle-limits.ts'), 'parseVehicleIntegerFields')
      && fileContains(path.join(projectRoot, 'lib/server/vehicle-input-schema.ts'), "vehicleIntegerSchema('mileage')")
      && fileContains(path.join(projectRoot, 'app/api/panel/vehicles/route.ts'), 'createVehicleSchema')
      && fileContains(path.join(projectRoot, 'app/api/panel/vehicles/[id]/route.ts'), 'updateVehicleSchema')
      && fileContains(path.join(projectRoot, 'app/panel/araclar/ekle/page.tsx'), 'parseVehicleIntegerFields')
      && fileContains(path.join(projectRoot, 'app/panel/araclar/[id]/duzenle/page.tsx'), 'parseVehicleIntegerFields')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-vehicle-input-limits.mjs'), '45433545432435460')
      && fileContains(path.join(projectRoot, 'package.json'), '"quality:vehicle-inputs"')
      && !fileContains(path.join(projectRoot, 'app/api/panel/vehicles/route.ts'), 'z.coerce.number().int().min(0)')
      && !fileContains(path.join(projectRoot, 'app/api/panel/vehicles/[id]/route.ts'), 'z.coerce.number().int().min(0)'),
    'vehicle create/update must reject out-of-range year, price, and mileage before Supabase integer overflow errors can leak',
  ),
)
checks.push(
  createCheck(
    'guard.legacy_supabase_functions_retired',
    fileContains(path.join(projectRoot, 'package.json'), '"security:supabase-functions"')
      && fileContains(path.join(projectRoot, 'scripts/qa/verify-retired-supabase-functions.mjs'), 'legacy_edge_function_retired')
      && ['create-vehicle', 'create-b2b-request', 'create-logistics-order', 'qr-scan'].every((functionName) => {
        const functionPath = path.join(projectRoot, `supabase/functions/${functionName}/index.ts`)
        return fileContains(functionPath, 'legacy_edge_function_retired')
          && fileContains(functionPath, 'status: 410')
          && !fileContains(functionPath, 'createClient')
          && !fileContains(functionPath, 'SUPABASE_SERVICE_ROLE_KEY')
          && !fileContains(functionPath, 'SUPABASE_ANON_KEY')
          && !fileContains(functionPath, 'user_metadata')
          && !fileContains(functionPath, 'Number(year)')
          && !fileContains(functionPath, 'Number(price)')
          && !fileContains(functionPath, 'Number(km)')
          && !fileContains(functionPath, '.from("vehicles")')
          && !fileContains(functionPath, '.from("qr_scans")')
      }),
    'legacy Supabase Edge Functions must stay retired so they cannot bypass the hardened Next panel/public APIs',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_safe_image_validator',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'validateImageFileForUpload'),
    'vehicle image uploads must validate image signature before storage upload',
  ),
)
checks.push(
  createCheck(
    'guard.gallery_logo_safe_image_validator',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/gallery-logo/route.ts'), 'validateImageFileForUpload'),
    'gallery logo uploads must validate image signature before storage upload',
  ),
)
checks.push(
  createCheck(
    'guard.image_upload_svg_blocked',
    !fileContains(path.join(projectRoot, 'app/api/panel/uploads/gallery-logo/route.ts'), 'image/svg+xml'),
    'server-side logo upload must not accept SVG without sanitizer',
  ),
)
checks.push(
  createCheck(
    'guard.image_upload_no_full_binary_signature_scan',
    fileContains(path.join(projectRoot, 'lib/server/safe-image-upload.ts'), 'assertNoBlockedFileHeader')
      && !fileContains(path.join(projectRoot, 'lib/server/safe-image-upload.ts'), 'buffer.indexOf(signature)')
      && fileContains(
        path.join(projectRoot, 'scripts/qa/verify-image-upload-security.mjs'),
        'archive-like bytes inside valid metadata',
      ),
    'image upload validator must reject archive/executable file headers and trailing data without scanning every image byte for archive-like false positives',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_user_delete_cleans_storage',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'deleteVehicleImageObjectsForGallery'),
    'user removed vehicle images must be deleted from Supabase Storage',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_records_metadata',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'createUploadedAssetRecord'),
    'accepted vehicle image uploads must be recorded in uploaded_assets',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_records_sha256',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), "createHash('sha256')"),
    'accepted vehicle image uploads must store a sha256 digest',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_daily_quota',
    fileContains(path.join(projectRoot, 'lib/security/limits.ts'), 'VEHICLE_IMAGE_DAILY_UPLOAD_LIMIT')
      && fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'daily_upload_quota')
      && fileContains(path.join(projectRoot, 'lib/server/uploaded-assets.ts'), 'getGalleryImageQuotaSnapshot'),
    'vehicle image uploads must enforce gallery daily upload quota before Storage write',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_total_quota',
    fileContains(path.join(projectRoot, 'lib/security/limits.ts'), 'VEHICLE_IMAGE_TOTAL_ACTIVE_LIMIT')
      && fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'total_active_image_quota'),
    'vehicle image uploads must enforce gallery total active image quota',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_duplicate_photos_allowed',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), "createHash('sha256')")
      && !fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'duplicate_sha256')
      && !fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'duplicate_in_request')
      && !fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), 'findGalleryAssetBySha256')
      && !fileContains(path.join(projectRoot, 'lib/server/uploaded-assets.ts'), 'findGalleryAssetBySha256')
      && !fileContains(path.join(projectRoot, 'app/panel/araclar/ekle/page.tsx'), 'MIN_REQUIRED_IMAGES')
      && fileContains(path.join(projectRoot, 'app/panel/araclar/ekle/page.tsx'), 'Fotoğraf yüklemek opsiyoneldir'),
    'vehicle image uploads must allow duplicate clean photos and vehicle creation must not require a minimum photo count',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_audit_logs',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), "action: 'image_upload'")
      && fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), "action: 'image_reject'")
      && fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), "action: 'image_delete'")
      && fileContains(path.join(projectRoot, 'lib/security/audit.ts'), "'image_upload'"),
    'image upload/delete/reject actions must be written to audit logs',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_quota_endpoint',
    fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/quota/route.ts'), 'requirePanelSessionOrThrow')
      && fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/quota/route.ts'), 'getGalleryImageQuotaSnapshot'),
    'panel must expose authenticated live vehicle image quota endpoint',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_upload_quota_visible_in_panel',
    fileContains(path.join(projectRoot, 'app/panel/araclar/ekle/page.tsx'), 'VehicleImageQuotaCard')
      && fileContains(path.join(projectRoot, 'app/panel/araclar/[id]/duzenle/page.tsx'), 'VehicleImageQuotaCard')
      && fileContains(path.join(projectRoot, 'components/dashboard/vehicle-image-quota-card.tsx'), 'Supabase yüklenen görsel kayıtları'),
    'panel add/edit vehicle screens must show live image quota without fake metrics',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_edit_uploads_secure_images',
    fileContains(path.join(projectRoot, 'app/panel/araclar/[id]/duzenle/page.tsx'), '/api/panel/uploads/vehicle-images')
      && fileContains(path.join(projectRoot, 'app/panel/araclar/[id]/duzenle/page.tsx'), 'stagedPhotoPaths'),
    'vehicle edit screen must use the same secure upload endpoint and cleanup staged removals',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_delete_cleans_storage',
    fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'deleteVehicleImageObjectsForGallery'),
    'vehicle deletion must delete owned image objects from Supabase Storage',
  ),
)
checks.push(
  createCheck(
    'guard.vehicle_delete_marks_asset_metadata',
    fileContains(path.join(projectRoot, 'lib/server/panel-repository.ts'), 'markUploadedAssetsDeleted'),
    'vehicle deletion must mark uploaded_assets rows as deleted',
  ),
)
checks.push(
  createCheck(
    'guard.uploaded_assets_cleanup_helper',
    fileContains(path.join(projectRoot, 'lib/server/uploaded-assets.ts'), 'cleanupStaleUploadedAssets'),
    'staged uploaded assets must have a cleanup helper',
  ),
)
checks.push(
  createCheck(
    'guard.uploaded_assets_cleanup_orphans',
    fileContains(path.join(projectRoot, 'lib/server/uploaded-assets.ts'), "status: 'orphaned'"),
    'expired staged uploaded assets must be marked as orphaned after storage cleanup',
  ),
)
checks.push(
  createCheck(
    'guard.uploaded_assets_cleanup_cron_auth',
    fileContains(path.join(projectRoot, 'app/api/cron/cleanup-uploaded-assets/route.ts'), 'CRON_SECRET')
      && fileContains(path.join(projectRoot, 'app/api/cron/cleanup-uploaded-assets/route.ts'), 'Bearer ${cronSecret}'),
    'uploaded assets cleanup cron endpoint must require CRON_SECRET bearer auth',
  ),
)
checks.push(
  createCheck(
    'ops.uploaded_assets_cleanup_cron_registered',
    fileContains(vercelConfig, '/api/cron/cleanup-uploaded-assets'),
    'vercel.json must register the uploaded assets cleanup cron',
  ),
)
checks.push(
  createCheck(
    'guard.storage_backup_uses_uploaded_assets',
    fileContains(path.join(projectRoot, 'scripts/security/supabase-storage-backup.mjs'), '/rest/v1/uploaded_assets'),
    'storage backup must read uploaded_assets metadata',
  ),
)
checks.push(
  createCheck(
    'guard.storage_backup_checks_hashes',
    fileContains(path.join(projectRoot, 'scripts/security/supabase-storage-backup.mjs'), 'sha256 mismatch'),
    'storage backup must verify sha256 when object downloads are enabled',
  ),
)
checks.push(
  createCheck(
    'guard.storage_backup_no_parallel_downloads',
    !fileContains(path.join(projectRoot, 'scripts/security/supabase-storage-backup.mjs'), 'Promise.all'),
    'storage backup must not launch parallel object downloads',
  ),
)
checks.push(
  createCheck(
    'ops.monthly_backup_runs_storage_backup',
    fileContains(monthlyBackupWorkflow, 'supabase-storage-backup.mjs'),
    'monthly backup workflow must run storage backup and integrity check',
  ),
)
checks.push(
  createCheck(
    'guard.backups_not_deployed',
    fileContains(vercelIgnore, 'security/backups/'),
    'local backup artifacts must be excluded from Vercel deployment package',
  ),
)
checks.push(
  createCheck(
    'guard.ops_monitoring_upload_errors',
    fileContains(path.join(projectRoot, 'lib/security/ops-monitor.ts'), 'uploadErrors24h')
      && fileContains(path.join(projectRoot, 'app/api/panel/uploads/vehicle-images/route.ts'), "area: 'upload'"),
    'upload errors must be visible in ops monitor',
  ),
)
checks.push(
  createCheck(
    'guard.ops_monitoring_storage_delete_failures',
    fileContains(path.join(projectRoot, 'lib/security/ops-monitor.ts'), 'storageDeleteFailures24h')
      && fileContains(path.join(projectRoot, 'lib/server/storage-images.ts'), "area: 'storage_delete'"),
    'storage delete failures must be visible in ops monitor',
  ),
)
checks.push(
  createCheck(
    'guard.ops_monitoring_qr_api_errors',
    fileContains(path.join(projectRoot, 'lib/security/ops-monitor.ts'), 'qrApiErrors24h')
      && fileContains(path.join(projectRoot, 'app/api/public/vehicle-events/route.ts'), "area: 'qr'"),
    'QR API errors must be visible in ops monitor',
  ),
)
checks.push(
  createCheck(
    'guard.ops_monitoring_lead_api_errors',
    fileContains(path.join(projectRoot, 'lib/security/ops-monitor.ts'), 'leadApiErrors24h')
      && fileContains(path.join(projectRoot, 'app/api/vehicle-lead/route.ts'), "area: 'lead'"),
    'vehicle lead API errors must be visible in ops monitor',
  ),
)
checks.push(
  createCheck(
    'ops.prod_monitor_checks_business_errors',
    fileContains(path.join(projectRoot, 'scripts/monitor/prod-uptime-check.mjs'), 'MONITOR_UPLOAD_ERROR_THRESHOLD')
      && fileContains(path.join(projectRoot, 'scripts/monitor/prod-uptime-check.mjs'), 'MONITOR_STORAGE_DELETE_FAILURE_THRESHOLD')
      && fileContains(path.join(projectRoot, 'scripts/monitor/prod-uptime-check.mjs'), 'MONITOR_QR_API_ERROR_THRESHOLD')
      && fileContains(path.join(projectRoot, 'scripts/monitor/prod-uptime-check.mjs'), 'MONITOR_LEAD_API_ERROR_THRESHOLD'),
    'production monitor must check upload/storage/QR/lead error thresholds',
  ),
)
checks.push(
  createCheck(
    'ops.prod_workflow_checks_node_leaks',
    fileContains(path.join(projectRoot, '.github/workflows/prod-smoke-monitor.yml'), 'check-node-leaks.sh prod-monitor-after')
      && fileContains(path.join(projectRoot, 'package.json'), 'monitor:node-leaks'),
    'production monitor workflow must check node leaks',
  ),
)

const failed = checks.filter((check) => !check.ok)
const summary = {
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
}

console.log(JSON.stringify(summary, null, 2))

if (failed.length > 0) {
  process.exit(1)
}
