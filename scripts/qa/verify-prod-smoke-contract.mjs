#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const prodSmoke = read('scripts/qa/prod-smoke-full.mjs')
const prodSmokeAuth = read('scripts/qa/prod-smoke-with-vercel-env.sh')
const workflow = read('.github/workflows/prod-smoke-monitor.yml')
const packageJson = read('package.json')
const predeploy = read('scripts/security/predeploy-check.mjs')

const checks = [
  ['prod smoke does not start local next server', !prodSmoke.includes('next start') && !prodSmoke.includes('next dev')],
  ['prod smoke avoids parallel promise fanout', !prodSmoke.includes('Promise.all')],
  ['prod smoke checks root and www health', prodSmoke.includes('root health') && prodSmoke.includes('www health')],
  [
    'prod smoke checks security headers',
    prodSmoke.includes('security headers present')
      && prodSmoke.includes('securityHeadersOk')
      && prodSmoke.includes('content-security-policy')
      && prodSmoke.includes('strict-transport-security')
      && prodSmoke.includes("frame-ancestors 'none'")
      && prodSmoke.includes("!csp.includes(\"'unsafe-eval'\")"),
  ],
  ['prod smoke checks auth boundaries', prodSmoke.includes('/api/auth/session') && prodSmoke.includes('/api/auth/login') && prodSmoke.includes('/api/auth/register')],
  [
    'prod smoke checks safe invalid credential copy',
    prodSmoke.includes('invalid login credentials use Turkish safe copy')
      && prodSmoke.includes('safeCredentialErrorOk')
      && prodSmoke.includes('E-posta veya şifre hatalı')
      && prodSmoke.includes('invalid login credentials'),
  ],
  [
    'prod smoke checks admin auth boundaries',
    prodSmoke.includes('/api/admin/session')
      && prodSmoke.includes('/api/admin/login')
      && prodSmoke.includes('/api/admin/users')
      && prodSmoke.includes('/api/admin/audit')
      && prodSmoke.includes('/api/admin/operations')
      && prodSmoke.includes('/api/admin/operations/moderation')
      && prodSmoke.includes('/api/admin/finance')
      && prodSmoke.includes('/api/admin/settings')
      && prodSmoke.includes('/api/admin/accounts')
      && prodSmoke.includes('/api/admin/accounts/demo-account')
      && prodSmoke.includes('/api/admin/users/demo-user/authorization')
      && prodSmoke.includes('/api/admin/users/demo-user/subscription')
      && prodSmoke.includes('/api/admin/users/demo-user/password-reset')
      && prodSmoke.includes('/api/admin/users/demo-user/email-verification')
      && prodSmoke.includes('/api/admin/users/demo-user/status')
      && prodSmoke.includes('/api/admin/users/demo-user/delete')
      && prodSmoke.includes('/api/admin/notifications'),
  ],
  ['prod smoke checks panel API protection', prodSmoke.includes('/api/panel/vehicles') && prodSmoke.includes('/api/panel/analytics/overview')],
  [
    'prod smoke checks real QR SVG generation',
    prodSmoke.includes('/api/panel/qr-image')
      && prodSmoke.includes('auth panel qr image generates real svg')
      && prodSmoke.includes('auth panel qr image rejects legacy route')
      && prodSmoke.includes('svgQrOk')
      && prodSmoke.includes('image/svg+xml'),
  ],
  [
    'prod smoke checks authenticated panel read surface',
    prodSmoke.includes('panelReadEndpoints')
      && prodSmoke.includes('/api/panel/alerts')
      && prodSmoke.includes('/api/panel/audit-logs?limit=5')
      && prodSmoke.includes('/api/panel/analytics/funnel?range=7days')
      && prodSmoke.includes('/api/panel/analytics/showroom?range=7days')
      && prodSmoke.includes('/api/panel/analytics/landing?range=7days')
      && prodSmoke.includes('/api/panel/analytics/landing-config')
      && prodSmoke.includes('panelEndpointCount'),
  ],
  [
    'prod smoke checks authenticated gallery showroom settings',
    prodSmoke.includes('panelSettingsShowroomOk')
      && prodSmoke.includes('auth panel settings exposes gallery showroom url')
      && prodSmoke.includes('publicShowroomUrl')
      && prodSmoke.includes('/showroom/${slug}'),
  ],
  ['prod smoke checks upload auth guard', prodSmoke.includes('/api/panel/uploads/vehicle-images') && prodSmoke.includes('unauth vehicle image upload protected')],
  ['prod smoke checks public route guard', prodSmoke.includes('/arac/demo') && prodSmoke.includes('/showroom/demo')],
  ['prod smoke checks QR event and lead invalid token guards', prodSmoke.includes('/api/public/vehicle-events') && prodSmoke.includes('/api/vehicle-lead')],
  [
    'prod smoke checks cross-site mutation blocking',
    prodSmoke.includes('cross-site auth login blocked')
      && prodSmoke.includes('cross-site contact blocked')
      && prodSmoke.includes('https://evil.example')
      && prodSmoke.includes("'sec-fetch-site': 'cross-site'"),
  ],
  ['prod smoke checks maintenance route protection', prodSmoke.includes('/api/cron/rotate-public-slugs?dryRun=1')],
  [
    'prod smoke supports required authenticated mode',
    prodSmoke.includes('SMOKE_TEST_EMAIL')
      && prodSmoke.includes('SMOKE_TEST_PASSWORD')
      && prodSmoke.includes('PROD_SMOKE_REQUIRE_AUTH')
      && prodSmoke.includes('missing_required_smoke_credentials'),
  ],
  [
    'prod authenticated smoke pulls vercel env without repo secret file',
    prodSmokeAuth.includes('vercel env pull')
      && prodSmokeAuth.includes('PROD_SMOKE_REQUIRE_AUTH=1')
      && prodSmokeAuth.includes('${TMPDIR:-/tmp}')
      && prodSmokeAuth.includes('trap cleanup EXIT')
      && prodSmokeAuth.includes('pnpm smoke:prod'),
  ],
  [
    'prod smoke checks encrypted panel cookie format',
    prodSmoke.includes('encryptedPanelCookieOk')
      && prodSmoke.includes('auth smoke encrypted panel cookie')
      && prodSmoke.includes("parts[0] === 'v2'")
      && prodSmoke.includes("!cookieValue.includes('access_token')")
      && prodSmoke.includes("!cookieValue.includes('refresh_token')"),
  ],
  ['package exposes full prod smoke script', packageJson.includes('"smoke:prod"') && packageJson.includes('scripts/qa/prod-smoke-full.mjs')],
  ['package exposes authenticated prod smoke script', packageJson.includes('"smoke:prod:auth"') && packageJson.includes('prod-smoke-with-vercel-env.sh')],
  ['workflow uses full prod smoke package', workflow.includes('pnpm smoke:prod')],
  ['predeploy requires prod smoke package', predeploy.includes('guard.prod_smoke_full_package')],
]

for (const [label, ok] of checks) {
  assert(ok, label)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: checks.map(([label]) => label),
    },
    null,
    2,
  ),
)
