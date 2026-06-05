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

const uploadRoute = read('app/api/panel/uploads/vehicle-images/route.ts')
const quotaRoute = read('app/api/panel/uploads/vehicle-images/quota/route.ts')
const addVehiclePage = read('app/panel/araclar/ekle/page.tsx')
const editVehiclePage = read('app/panel/araclar/[id]/duzenle/page.tsx')
const quotaCard = read('components/dashboard/vehicle-image-quota-card.tsx')
const uploadedAssets = read('lib/server/uploaded-assets.ts')
const limits = read('lib/security/limits.ts')
const audit = read('lib/security/audit.ts')
const auditRepository = read('lib/server/audit-repository.ts')
const auditApi = read('app/api/panel/audit-logs/route.ts')
const auditPage = read('app/panel/audit-logs/page.tsx')
const predeploy = read('scripts/security/predeploy-check.mjs')

const checks = [
  ['limits expose daily upload quota', limits.includes('VEHICLE_IMAGE_DAILY_UPLOAD_LIMIT')],
  ['limits expose total active quota', limits.includes('VEHICLE_IMAGE_TOTAL_ACTIVE_LIMIT')],
  ['limits expose per request quota', limits.includes('VEHICLE_IMAGE_MAX_FILES_PER_REQUEST')],
  ['uploaded assets stores sha256 for audit and backup', uploadedAssets.includes('sha256: input.sha256')],
  ['uploaded assets can calculate quota snapshot', uploadedAssets.includes('getGalleryImageQuotaSnapshot')],
  ['quota queries only active clean assets', uploadedAssets.includes("status: 'in.(staged,attached)'") && uploadedAssets.includes("scan_status: 'eq.clean'")],
  ['upload route reads central image limits', uploadRoute.includes('getSecurityLimits().vehicleImageUploads')],
  ['upload route checks daily quota before storage write', uploadRoute.includes('daily_upload_quota') && uploadRoute.indexOf('daily_upload_quota') < uploadRoute.indexOf('storage/v1/object')],
  ['upload route checks total active quota before storage write', uploadRoute.includes('total_active_image_quota') && uploadRoute.indexOf('total_active_image_quota') < uploadRoute.indexOf('storage/v1/object')],
  [
    'upload route allows duplicate clean photos while preserving sha256 metadata',
    uploadRoute.includes("createHash('sha256')")
      && uploadRoute.includes('sha256')
      && !uploadRoute.includes('duplicate_in_request')
      && !uploadRoute.includes('duplicate_sha256')
      && !uploadRoute.includes('findGalleryAssetBySha256'),
  ],
  ['upload route writes image upload audit', uploadRoute.includes("action: 'image_upload'")],
  ['upload route writes image reject audit', uploadRoute.includes("action: 'image_reject'")],
  ['upload route writes image delete audit', uploadRoute.includes("action: 'image_delete'")],
  ['quota endpoint requires panel session', quotaRoute.includes('requirePanelSessionOrThrow')],
  ['quota endpoint uses live uploaded assets snapshot', quotaRoute.includes('getGalleryImageQuotaSnapshot') && quotaRoute.includes("source: 'supabase'")],
  ['quota endpoint exposes file limits', quotaRoute.includes('maxFilesPerRequest') && quotaRoute.includes('maxFileSizeBytes')],
  ['quota card states live Supabase source', quotaCard.includes('Supabase yüklenen görsel kayıtları')],
  ['add vehicle page displays quota card', addVehiclePage.includes('VehicleImageQuotaCard') && addVehiclePage.includes('/api/panel/uploads/vehicle-images/quota')],
  ['add vehicle page prechecks real quota', addVehiclePage.includes('imageQuota.dailyRemaining') && addVehiclePage.includes('imageQuota.totalRemaining')],
  ['add vehicle page does not require a minimum photo count', !addVehiclePage.includes('MIN_REQUIRED_IMAGES') && addVehiclePage.includes('Fotoğraf yüklemek opsiyoneldir')],
  ['edit vehicle page supports secure photo upload', editVehiclePage.includes('/api/panel/uploads/vehicle-images') && editVehiclePage.includes('handleFileInputChange')],
  ['edit vehicle page displays quota card', editVehiclePage.includes('VehicleImageQuotaCard') && editVehiclePage.includes('/api/panel/uploads/vehicle-images/quota')],
  ['edit vehicle page cleans removed staged uploads', editVehiclePage.includes('stagedPhotoPaths') && editVehiclePage.includes("method: 'DELETE'")],
  ['audit type includes image actions', audit.includes("'image_upload'") && audit.includes("'image_delete'") && audit.includes("'image_reject'")],
  ['audit repository maps image actions', auditRepository.includes("'image_upload'") && auditRepository.includes("'image_delete'") && auditRepository.includes("'image_reject'")],
  ['audit API allows image action filters', auditApi.includes("'image_upload'") && auditApi.includes("'image_delete'") && auditApi.includes("'image_reject'")],
  ['audit page labels image actions', auditPage.includes('Görsel Yükleme') && auditPage.includes('Görsel Reddetme')],
  ['predeploy checks image quota and duplicate-photo policy', predeploy.includes('guard.vehicle_upload_daily_quota') && predeploy.includes('guard.vehicle_upload_duplicate_photos_allowed')],
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
