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

const rotateRoute = read('app/api/cron/rotate-public-slugs/route.ts')
const rotateScript = read('scripts/security/rotate-public-route-slugs.mjs')
const prodSmoke = read('scripts/qa/prod-smoke-full.mjs')
const audit = read('lib/security/audit.ts')
const panelTypes = read('lib/panel-types.ts')
const auditRepository = read('lib/server/audit-repository.ts')
const auditApi = read('app/api/panel/audit-logs/route.ts')
const auditPage = read('app/panel/audit-logs/page.tsx')
const predeploy = read('scripts/security/predeploy-check.mjs')
const packageJson = read('package.json')

const checks = [
  ['rotate endpoint requires explicit enable flag', rotateRoute.includes("MAINTENANCE_SLUG_ROTATE_ENABLED === 'YES'")],
  ['rotate endpoint still requires bearer secret', rotateRoute.includes('MAINTENANCE_SLUG_ROTATE_SECRET') && rotateRoute.includes('authorization !== `Bearer ${rotateSecret}`')],
  ['rotate endpoint writes audit only for real rotation', rotateRoute.includes("action: 'public_slug_rotation'") && rotateRoute.includes('if (!dryRun)')],
  ['local rotate script remains confirmation gated', rotateScript.includes("ROTATE_PUBLIC_ROUTE_SLUGS_CONFIRM === 'YES'") && rotateScript.includes('dryRun')],
  ['local rotate script is sequential', rotateScript.includes('for (const row of rows)') && !rotateScript.includes('Promise.all(rows')],
  ['local rotate script writes audit for real rotation', rotateScript.includes("action: 'public_slug_rotation'") && rotateScript.includes("source: 'rotate_public_slugs_script'")],
  ['audit types include public slug rotation', audit.includes("'public_slug_rotation'") && panelTypes.includes("'public_slug_rotation'")],
  ['audit listing maps public slug rotation', auditRepository.includes("'public_slug_rotation'") && auditApi.includes("'public_slug_rotation'")],
  ['audit page labels public slug rotation', auditPage.includes('Public Link Rotasyonu')],
  ['prod smoke verifies rotation endpoint remains protected', prodSmoke.includes('/api/cron/rotate-public-slugs?dryRun=1')],
  ['package exposes maintenance contract', packageJson.includes('"security:maintenance"')],
  ['predeploy checks maintenance endpoint hardening', predeploy.includes('guard.maintenance_slug_rotation_double_lock')],
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
