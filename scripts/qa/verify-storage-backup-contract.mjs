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

const storageBackup = read('scripts/security/supabase-storage-backup.mjs')
const workflow = read('.github/workflows/monthly-supabase-backup.yml')
const predeploy = read('scripts/security/predeploy-check.mjs')
const packageJson = read('package.json')
const vercelIgnore = read('.vercelignore')

const checks = [
  ['storage backup script exists', storageBackup.includes('fetchUploadedAssets')],
  ['uses uploaded_assets metadata', storageBackup.includes('/rest/v1/uploaded_assets')],
  ['checks vehicle image bucket', storageBackup.includes("const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'vehicle-images'")],
  ['checks gallery scoped paths', storageBackup.includes('assetPathIsInGalleryScope')],
  ['checks storage metadata', storageBackup.includes('fetchObjectMetadata')],
  ['supports optional object download', storageBackup.includes('SUPABASE_STORAGE_BACKUP_DOWNLOAD')],
  ['verifies sha256 when downloading', storageBackup.includes('sha256 mismatch')],
  ['uses sequential processing', storageBackup.includes('for (const asset of assets)')],
  ['does not use Promise.all', !storageBackup.includes('Promise.all')],
  ['writes manifest checksum', storageBackup.includes('checksumPath') && storageBackup.includes('.sha256')],
  ['workflow runs storage backup', workflow.includes('supabase-storage-backup.mjs')],
  ['workflow uploads backup artifact', workflow.includes('actions/upload-artifact@v4')],
  ['predeploy checks storage backup', predeploy.includes('guard.storage_backup_uses_uploaded_assets')],
  ['package exposes storage backup command', packageJson.includes('security:backup:storage')],
  ['backups excluded from deploy package', vercelIgnore.includes('security/backups/')],
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
