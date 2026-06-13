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

const opsMonitor = read('lib/security/ops-monitor.ts')
const uploadRoute = read('app/api/panel/uploads/vehicle-images/route.ts')
const storageImages = read('lib/server/storage-images.ts')
const vehicleEventsRoute = read('app/api/public/vehicle-events/route.ts')
const vehicleLeadRoute = read('app/api/vehicle-lead/route.ts')
const contactRoute = read('app/api/contact/route.ts')
const prodMonitor = read('scripts/monitor/prod-uptime-check.mjs')
const prodSmoke = read('scripts/qa/prod-smoke-full.mjs')
const prodWorkflow = read('.github/workflows/prod-smoke-monitor.yml')
const vercelCronMonitor = read('app/api/cron/production-monitor/route.ts')
const vercelConfig = read('vercel.json')
const criticalReporter = read('lib/server/critical-error-reporter.ts')
const packageJson = read('package.json')
const predeploy = read('scripts/security/predeploy-check.mjs')

const checks = [
  ['ops monitor stores operational events', opsMonitor.includes('operationalEvents')],
  ['ops monitor exposes upload errors', opsMonitor.includes('uploadErrors24h')],
  ['ops monitor exposes storage delete failures', opsMonitor.includes('storageDeleteFailures24h')],
  ['ops monitor exposes qr api errors', opsMonitor.includes('qrApiErrors24h')],
  ['ops monitor exposes lead api errors', opsMonitor.includes('leadApiErrors24h')],
  ['ops monitor exposes node leak failures', opsMonitor.includes('nodeLeakFailures24h')],
  ['upload route records upload events', uploadRoute.includes("area: 'upload'")],
  ['upload delete route records storage delete events', uploadRoute.includes("area: 'storage_delete'")],
  ['storage helper records delete failures', storageImages.includes("area: 'storage_delete'")],
  ['qr endpoint records qr area', vehicleEventsRoute.includes("area: 'qr'")],
  ['vehicle lead endpoint records lead area', vehicleLeadRoute.includes("area: 'lead'")],
  ['contact endpoint records contact area', contactRoute.includes("area: 'contact'")],
  ['prod monitor checks upload threshold', prodMonitor.includes('MONITOR_UPLOAD_ERROR_THRESHOLD')],
  ['prod monitor checks storage delete threshold', prodMonitor.includes('MONITOR_STORAGE_DELETE_FAILURE_THRESHOLD')],
  ['prod monitor checks qr threshold', prodMonitor.includes('MONITOR_QR_API_ERROR_THRESHOLD')],
  ['prod monitor checks lead threshold', prodMonitor.includes('MONITOR_LEAD_API_ERROR_THRESHOLD')],
  ['prod monitor checks contact threshold', prodMonitor.includes('MONITOR_CONTACT_API_ERROR_THRESHOLD')],
  ['prod smoke checks public guard and upload auth', prodSmoke.includes('/arac/demo') && prodSmoke.includes('/api/panel/uploads/vehicle-images')],
  ['workflow runs full prod smoke', prodWorkflow.includes('pnpm smoke:prod')],
  ['workflow checks node leaks', prodWorkflow.includes('check-node-leaks.sh prod-monitor-after')],
  ['Vercel cron provides runner-independent authenticated monitor', vercelConfig.includes('/api/cron/production-monitor') && vercelCronMonitor.includes('SMOKE_TEST_EMAIL') && vercelCronMonitor.includes('/api/panel/qr-codes')],
  ['Vercel cron is CRON_SECRET protected', vercelCronMonitor.includes('CRON_SECRET') && vercelCronMonitor.includes('authorization')],
  ['critical failures reach Sentry and optional webhook', criticalReporter.includes('Sentry.capture') && criticalReporter.includes('MONITOR_ALERT_WEBHOOK_URL')],
  ['package exposes node leak monitor', packageJson.includes('monitor:node-leaks')],
  ['predeploy checks ops monitoring', predeploy.includes('guard.ops_monitoring_upload_errors')],
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
