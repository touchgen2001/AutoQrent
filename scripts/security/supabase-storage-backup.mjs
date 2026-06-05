#!/usr/bin/env node

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'vehicle-images'
const backupRoot = process.env.BACKUP_ROOT || 'security/backups/supabase'
const downloadObjects = process.env.SUPABASE_STORAGE_BACKUP_DOWNLOAD === '1'
const retentionDays = boundedInteger(process.env.BACKUP_RETENTION_DAYS, 60, 365)
const maxObjects = boundedInteger(process.env.SUPABASE_STORAGE_BACKUP_MAX_OBJECTS, 2000, 10000)
const maxBytes = boundedInteger(process.env.SUPABASE_STORAGE_BACKUP_MAX_BYTES, 2 * 1024 * 1024 * 1024, 10 * 1024 * 1024 * 1024)
const pageSize = Math.min(boundedInteger(process.env.SUPABASE_STORAGE_BACKUP_PAGE_SIZE, 200, 500), maxObjects)

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

if (serviceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY must be different from NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  process.exit(1)
}

function boundedInteger(value, fallback, max) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function encodePathSegments(objectPath) {
  return objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function storageUrl(objectPath) {
  return `${supabaseUrl}/storage/v1/object/${bucket}/${encodePathSegments(objectPath)}`
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function assetPathIsInGalleryScope(asset) {
  if (!asset.gallery_id || !asset.object_path) return false
  if (asset.bucket !== bucket) return false
  if (asset.object_path.includes('..')) return false
  return asset.object_path.startsWith(`panel/${asset.gallery_id}/vehicle-images/`)
}

function safeObjectBackupPath(objectsRoot, objectPath) {
  const parts = objectPath.split('/').filter(Boolean)
  if (parts.some((part) => part === '..')) {
    throw new Error(`Unsafe object path: ${objectPath}`)
  }

  const resolved = path.resolve(objectsRoot, ...parts)
  const root = path.resolve(objectsRoot)
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Object path escapes backup root: ${objectPath}`)
  }

  return resolved
}

async function supabaseFetch(apiPath, query) {
  const url = new URL(`${supabaseUrl}${apiPath}`)
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    cache: 'no-store',
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `Supabase request failed: ${response.status}`)
  }

  return text ? JSON.parse(text) : null
}

async function fetchUploadedAssets() {
  const assets = []

  while (assets.length < maxObjects) {
    const limit = Math.min(pageSize, maxObjects - assets.length)
    const page = await supabaseFetch('/rest/v1/uploaded_assets', {
      select: [
        'id',
        'gallery_id',
        'vehicle_id',
        'bucket',
        'object_path',
        'public_url',
        'mime_type',
        'size_bytes',
        'sha256',
        'scan_status',
        'status',
        'created_at',
        'attached_at',
        'deleted_at',
      ].join(','),
      bucket: `eq.${bucket}`,
      status: 'in.(attached,staged)',
      order: 'created_at.asc',
      limit,
      offset: assets.length,
    })

    if (!Array.isArray(page) || page.length === 0) break
    assets.push(...page)
    if (page.length < limit) break
  }

  return assets
}

async function fetchObjectMetadata(objectPath) {
  let response = await fetch(storageUrl(objectPath), {
    method: 'HEAD',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: 'no-store',
  })

  if (response.status === 405 || response.status === 400) {
    response = await fetch(storageUrl(objectPath), {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store',
    })
    await response.body?.cancel()
  }

  return {
    ok: response.ok,
    status: response.status,
    contentLength: response.headers.get('content-length'),
    contentType: response.headers.get('content-type'),
  }
}

async function downloadObject(objectPath) {
  const response = await fetch(storageUrl(objectPath), {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Storage download failed: ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function removeOldStorageBackups() {
  const root = path.resolve(projectRoot, backupRoot)
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000

  let entries = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('storage_')) continue
    const fullPath = path.join(root, entry.name)
    const stat = await fs.stat(fullPath).catch(() => null)
    if (stat && stat.mtimeMs < cutoffMs) {
      await fs.rm(fullPath, { recursive: true, force: true })
    }
  }
}

const createdAt = new Date().toISOString()
const backupDir = path.resolve(projectRoot, backupRoot, `storage_${timestamp()}`)
const objectsRoot = path.join(backupDir, 'objects')
const manifestPath = path.join(backupDir, 'manifest.json')
const checksumPath = `${manifestPath}.sha256`

await fs.mkdir(downloadObjects ? objectsRoot : backupDir, { recursive: true })
await removeOldStorageBackups()

const assets = await fetchUploadedAssets()
const failures = []
const manifestAssets = []
let checked = 0
let downloaded = 0
let downloadedBytes = 0

for (const asset of assets) {
  checked += 1
  const record = {
    id: asset.id,
    galleryId: asset.gallery_id,
    vehicleId: asset.vehicle_id,
    bucket: asset.bucket,
    objectPath: asset.object_path,
    publicUrl: asset.public_url,
    mimeType: asset.mime_type,
    sizeBytes: Number(asset.size_bytes || 0),
    sha256: asset.sha256,
    scanStatus: asset.scan_status,
    status: asset.status,
    createdAt: asset.created_at,
    attachedAt: asset.attached_at,
    storage: {
      exists: false,
      contentLength: null,
      contentType: null,
      downloaded: false,
      sha256Verified: false,
    },
  }

  try {
    if (!assetPathIsInGalleryScope(asset)) {
      throw new Error('asset path is outside gallery vehicle image scope')
    }

    const metadata = await fetchObjectMetadata(asset.object_path)
    record.storage.exists = metadata.ok
    record.storage.contentLength = metadata.contentLength
    record.storage.contentType = metadata.contentType

    if (!metadata.ok) {
      throw new Error(`storage object missing or unreadable: ${metadata.status}`)
    }

    const contentLength = metadata.contentLength ? Number(metadata.contentLength) : null
    if (contentLength !== null && Number.isFinite(contentLength) && contentLength !== record.sizeBytes) {
      throw new Error(`size mismatch: metadata=${record.sizeBytes} storage=${contentLength}`)
    }

    const contentType = (metadata.contentType || '').split(';')[0].trim().toLowerCase()
    if (contentType && asset.mime_type && contentType !== asset.mime_type) {
      throw new Error(`mime mismatch: metadata=${asset.mime_type} storage=${contentType}`)
    }

    if (downloadObjects) {
      if (downloadedBytes + record.sizeBytes > maxBytes) {
        throw new Error(`storage backup byte cap exceeded: ${maxBytes}`)
      }

      const bytes = await downloadObject(asset.object_path)
      const digest = sha256(bytes)
      if (asset.sha256 && digest !== asset.sha256) {
        throw new Error(`sha256 mismatch: metadata=${asset.sha256} backup=${digest}`)
      }

      const outputPath = safeObjectBackupPath(objectsRoot, asset.object_path)
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.writeFile(outputPath, bytes)
      downloaded += 1
      downloadedBytes += bytes.length
      record.storage.downloaded = true
      record.storage.sha256Verified = true
      record.storage.backupPath = path.relative(backupDir, outputPath)
    }
  } catch (error) {
    failures.push({
      id: asset.id,
      objectPath: asset.object_path,
      reason: error instanceof Error ? error.message : 'unknown failure',
    })
  }

  manifestAssets.push(record)
}

const manifest = {
  ok: failures.length === 0,
  createdAt,
  mode: downloadObjects ? 'download' : 'manifest',
  bucket,
  backupDir: path.relative(projectRoot, backupDir),
  limits: {
    maxObjects,
    maxBytes,
    retentionDays,
  },
  summary: {
    assetCount: assets.length,
    checked,
    downloaded,
    downloadedBytes,
    failures: failures.length,
  },
  failures,
  assets: manifestAssets,
}

const manifestJson = JSON.stringify(manifest, null, 2)
await fs.writeFile(manifestPath, manifestJson)
await fs.writeFile(checksumPath, `${sha256(Buffer.from(manifestJson))}\n`)

console.log(JSON.stringify({
  ok: manifest.ok,
  mode: manifest.mode,
  manifest: path.relative(projectRoot, manifestPath),
  checked,
  downloaded,
  downloadedBytes,
  failures: failures.length,
}, null, 2))

if (!manifest.ok) {
  process.exit(1)
}
