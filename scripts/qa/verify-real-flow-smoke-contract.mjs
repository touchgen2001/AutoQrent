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

const realFlowSmoke = read('scripts/qa/real-user-flow-smoke.mjs')
const qaCleanupHelper = read('lib/server/qa-test-data-cleanup.ts')
const qaCleanupRoute = read('app/api/cron/cleanup-qa-test-data/route.ts')
const packageJson = read('package.json')
const predeploy = read('scripts/security/predeploy-check.mjs')

const checks = [
  [
    'real user smoke requires explicit test-data opt-in',
    realFlowSmoke.includes("REAL_FLOW_ALLOW_TEST_DATA === 'YES'")
      && realFlowSmoke.includes('Bu script gercek kayit/arac/lead verisi olusturur'),
  ],
  [
    'real user smoke uses production-like panel flow',
    realFlowSmoke.includes('/api/auth/register')
      && realFlowSmoke.includes('/api/panel/settings')
      && realFlowSmoke.includes('/api/panel/uploads/vehicle-images')
      && realFlowSmoke.includes('/api/panel/vehicles')
      && realFlowSmoke.includes('/api/panel/qr-codes')
      && realFlowSmoke.includes('/api/vehicle-lead'),
  ],
  [
    'real user smoke verifies public QR and showroom pages',
    realFlowSmoke.includes('/arac/')
      && realFlowSmoke.includes('/showroom/')
      && realFlowSmoke.includes('/api/public/vehicle-events'),
  ],
  [
    'real user smoke verifies QR lead source in panel',
    realFlowSmoke.includes("source: 'qr'")
      && realFlowSmoke.includes("lead.source === 'qr'")
      && realFlowSmoke.includes('QR kaynakli lead panelde qr olarak gorunmedi'),
  ],
  [
    'real user smoke verifies public vehicle CTA audit event',
    realFlowSmoke.includes("eventType: 'whatsapp_click'")
      && realFlowSmoke.includes('public_vehicle_cta_click')
      && realFlowSmoke.includes('public_vehicle_event_api')
      && realFlowSmoke.includes('Public arac CTA eventi panel audit logda gorunmedi'),
  ],
  [
    'real user smoke verifies public showroom CTA audit event',
    realFlowSmoke.includes('/api/public/showroom-events')
      && realFlowSmoke.includes('public_showroom_cta_click')
      && realFlowSmoke.includes('public_showroom_event_api')
      && realFlowSmoke.includes('real_flow_showroom_whatsapp')
      && realFlowSmoke.includes('Public showroom CTA eventi panel audit logda gorunmedi'),
  ],
  [
    'real user smoke cleans vehicle and uploaded image by default',
    realFlowSmoke.includes("REAL_FLOW_CLEANUP_VEHICLE !== '0'")
      && realFlowSmoke.includes("method: 'DELETE'")
      && realFlowSmoke.includes('publicUrls: [photoUrl]'),
  ],
  [
    'real user smoke loads local env without printing secrets',
    realFlowSmoke.includes('loadDotEnvLocal()')
      && realFlowSmoke.includes("path.join(process.cwd(), '.env.local')")
      && !realFlowSmoke.includes("console.log(process.env.SUPABASE_SERVICE_ROLE_KEY"),
  ],
  [
    'real user smoke fully cleans safe qa gallery and auth account by default',
    realFlowSmoke.includes("REAL_FLOW_CLEANUP_QA_DATA !== '0'")
      && realFlowSmoke.includes('cleanupQaTestAccount')
      && realFlowSmoke.includes('safeQaEmailRe')
      && realFlowSmoke.includes('/auth/v1/admin/users')
      && realFlowSmoke.includes('/rest/v1/audit_logs')
      && realFlowSmoke.includes('deleteGalleryAuditLogs(gallery.id)')
      && realFlowSmoke.includes('should_soft_delete: false')
      && realFlowSmoke.includes('remainingGalleryCount')
      && realFlowSmoke.includes('remainingAuthUserCount'),
  ],
  [
    'real user smoke cleanup is finally guarded and sequential',
    realFlowSmoke.includes('finally')
      && realFlowSmoke.includes('flowError')
      && realFlowSmoke.includes('cleanupErrors')
      && realFlowSmoke.includes('for (const gallery of galleries)')
      && realFlowSmoke.includes('for (const user of authUsers)')
      && !realFlowSmoke.includes('Promise.all(galleries')
      && !realFlowSmoke.includes('Promise.all(authUsers'),
  ],
  [
    'real user smoke blocks unsafe service role configuration',
    realFlowSmoke.includes('serviceRoleKey === anonKey')
      && realFlowSmoke.includes('SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY ile ayni olamaz'),
  ],
  [
    'qa cleanup route is maintenance-secret protected',
    qaCleanupRoute.includes('MAINTENANCE_QA_CLEANUP_SECRET')
      && qaCleanupRoute.includes('authorization !== `Bearer ${cleanupSecret}`')
      && qaCleanupRoute.includes('QA cleanup endpoint devre dışı'),
  ],
  [
    'qa cleanup helper targets only safe akis owner emails',
    qaCleanupHelper.includes('QA_OWNER_EMAIL_PREFIX = \'akis-\'')
      && qaCleanupHelper.includes('QA_OWNER_EMAIL_DOMAIN = \'cebindegaleri.com\'')
      && qaCleanupHelper.includes('^akis-\\d{14}@cebindegaleri\\.com$'),
  ],
  [
    'qa cleanup helper removes matching auth users through admin API only',
    qaCleanupHelper.includes('/auth/v1/admin/users')
      && qaCleanupHelper.includes('filter: QA_OWNER_EMAIL_PREFIX')
      && qaCleanupHelper.includes('should_soft_delete: false')
      && qaCleanupHelper.includes('deleteAuthUser(user.id)'),
  ],
  [
    'qa cleanup helper keeps dry-run and sequential deletion',
    qaCleanupHelper.includes('dryRun')
      && qaCleanupHelper.includes('for (const gallery of safeTargets)')
      && qaCleanupHelper.includes('for (const user of authUsers)')
      && !qaCleanupHelper.includes('Promise.all(safeTargets')
      && !qaCleanupHelper.includes('Promise.all(authUsers')
      && qaCleanupHelper.includes("method: 'DELETE'")
      && qaCleanupHelper.includes('/rest/v1/galleries'),
  ],
  [
    'qa cleanup deletes storage objects before DB cascade',
    qaCleanupHelper.includes('deleteVehicleImageObjectsForGallery')
      && qaCleanupHelper.indexOf('deleteVehicleImageObjectsForGallery') < qaCleanupHelper.indexOf('deleteGalleryRow'),
  ],
  [
    'qa cleanup removes safe gallery audit log traces',
    qaCleanupHelper.includes('/rest/v1/audit_logs')
      && qaCleanupHelper.includes('deleteGalleryAuditLogs(gallery.id)')
      && qaCleanupHelper.includes("'metadata->>galleryId': `eq.${galleryId}`")
      && qaCleanupHelper.includes('auditLogs: auditLogs.length'),
  ],
  [
    'package exposes real-flow contract',
    packageJson.includes('"smoke:real-flow:contract"'),
  ],
  [
    'predeploy checks qa cleanup guard',
    predeploy.includes('guard.qa_test_data_cleanup_endpoint')
      && predeploy.includes('guard.qa_test_data_cleanup_safe_pattern'),
  ],
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
