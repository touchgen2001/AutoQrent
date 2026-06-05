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

const migration = read('supabase/migrations/20260602022205_uploaded_assets_metadata.sql')
const uploadRoute = read('app/api/panel/uploads/vehicle-images/route.ts')
const vehicleRoute = read('app/api/panel/vehicles/[id]/route.ts')
const repository = read('lib/server/panel-repository.ts')
const helper = read('lib/server/uploaded-assets.ts')
const cronRoute = read('app/api/cron/cleanup-uploaded-assets/route.ts')
const vercelConfig = read('vercel.json')

const checks = [
  ['migration creates uploaded_assets', migration.includes('CREATE TABLE IF NOT EXISTS uploaded_assets')],
  ['migration stores sha256', migration.includes('sha256 TEXT NOT NULL')],
  ['migration forces rls', migration.includes('ALTER TABLE uploaded_assets FORCE ROW LEVEL SECURITY')],
  ['migration revokes anon auth', migration.includes('REVOKE ALL ON TABLE uploaded_assets FROM anon, authenticated')],
  ['migration grants service role', migration.includes('GRANT ALL ON TABLE uploaded_assets TO service_role')],
  ['helper scopes gallery path', helper.includes('normalizeGalleryVehicleImagePath')],
  ['upload records sha256', uploadRoute.includes("createHash('sha256')")],
  ['upload inserts metadata', uploadRoute.includes('createUploadedAssetRecord')],
  ['upload cleanup on metadata failure', uploadRoute.includes('metadataError')],
  ['direct delete marks metadata', uploadRoute.includes('markUploadedAssetsDeleted')],
  ['vehicle create attaches assets', repository.includes('markUploadedAssetsAttached')],
  ['vehicle delete marks assets deleted', repository.includes('deletedAssetRows')],
  ['vehicle edit reattaches assets', vehicleRoute.includes('markUploadedAssetsAttached')],
  ['vehicle edit marks removed assets', vehicleRoute.includes('markUploadedAssetsDeleted')],
  ['cleanup helper exists', helper.includes('cleanupStaleUploadedAssets')],
  ['cleanup only targets staged assets', helper.includes("status: 'eq.staged'")],
  ['cleanup marks orphaned assets', helper.includes("status: 'orphaned'")],
  ['cleanup endpoint requires cron secret', cronRoute.includes('CRON_SECRET')],
  ['cleanup endpoint checks authorization', cronRoute.includes('Bearer ${cronSecret}')],
  ['vercel cron registered', vercelConfig.includes('/api/cron/cleanup-uploaded-assets')],
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
