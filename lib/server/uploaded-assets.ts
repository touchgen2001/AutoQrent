import {
  deleteVehicleImageObjectsForGallery,
  getVehicleImagesBucket,
  normalizeGalleryVehicleImagePath,
} from '@/lib/server/storage-images'
import { supabaseAdminFetch } from '@/lib/server/supabase-admin'
import type { SafeImageScan } from '@/lib/server/safe-image-upload'

type UploadedAssetRow = {
  id: string
  gallery_id?: string
  bucket?: string
  object_path: string
  public_url?: string
  status?: string
  sha256?: string
  created_at?: string
}

export type GalleryImageQuotaSnapshot = {
  dailyLimit: number
  dailyUsed: number
  dailyRemaining: number
  dailyWindowHours: number
  dailyWindowStartedAt: string
  totalActiveLimit: number
  totalActive: number
  totalRemaining: number
}

type UploadedAssetInput = {
  galleryId: string
  bucket: string
  objectPath: string
  publicUrl: string
  originalName: string
  sizeBytes: number
  sha256: string
  scan: SafeImageScan
}

type CleanupFailure = {
  id: string
  objectPath: string
  reason: string
}

function nowIso() {
  return new Date().toISOString()
}

function positiveInteger(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value) || value === undefined) return fallback
  return Math.min(Math.max(Math.floor(value), 1), max)
}

function uniquePaths(input: {
  galleryId: string
  paths?: Array<string | null | undefined>
  publicUrls?: Array<string | null | undefined>
  allowOwnedLegacyPanelPaths?: boolean
}) {
  const paths = new Set<string>()

  for (const path of input.paths || []) {
    const normalized = normalizeGalleryVehicleImagePath({
      path,
      galleryId: input.galleryId,
      allowOwnedLegacyPanelPaths: input.allowOwnedLegacyPanelPaths,
    })
    if (normalized) paths.add(normalized)
  }

  for (const publicUrl of input.publicUrls || []) {
    const normalized = normalizeGalleryVehicleImagePath({
      publicUrl,
      galleryId: input.galleryId,
      allowOwnedLegacyPanelPaths: input.allowOwnedLegacyPanelPaths,
    })
    if (normalized) paths.add(normalized)
  }

  return [...paths]
}

export async function createUploadedAssetRecord(input: UploadedAssetInput) {
  const rows = await supabaseAdminFetch<UploadedAssetRow[]>({
    method: 'POST',
    path: '/rest/v1/uploaded_assets',
    prefer: 'return=representation',
    body: [
      {
        gallery_id: input.galleryId,
        bucket: input.bucket,
        object_path: input.objectPath,
        public_url: input.publicUrl,
        original_name: input.originalName || 'vehicle-image',
        mime_type: input.scan.contentType,
        extension: input.scan.extension,
        size_bytes: input.sizeBytes,
        width: input.scan.width,
        height: input.scan.height,
        sha256: input.sha256,
        scan_status: 'clean',
        status: 'staged',
        metadata: {
          validator: 'safe-image-upload',
          kind: input.scan.kind,
        },
      },
    ],
  })

  const asset = rows[0]
  if (!asset) {
    throw new Error('Yüklenen dosya metadatası kaydedilemedi.')
  }

  return asset
}

export async function getGalleryImageQuotaSnapshot(input: {
  galleryId: string
  dailyLimit: number
  totalActiveLimit: number
  dailyWindowHours?: number
  now?: Date
}): Promise<GalleryImageQuotaSnapshot> {
  const dailyLimit = positiveInteger(input.dailyLimit, 120, 5000)
  const totalActiveLimit = positiveInteger(input.totalActiveLimit, 1000, 20_000)
  const dailyWindowHours = positiveInteger(input.dailyWindowHours, 24, 168)
  const now = input.now || new Date()
  const dailyWindowStartedAt = new Date(now.getTime() - dailyWindowHours * 60 * 60 * 1000).toISOString()

  const baseQuery = {
    select: 'id',
    gallery_id: `eq.${input.galleryId}`,
    bucket: `eq.${getVehicleImagesBucket()}`,
    scan_status: 'eq.clean',
    status: 'in.(staged,attached)',
  }

  const dailyAssets = await supabaseAdminFetch<UploadedAssetRow[]>({
    path: '/rest/v1/uploaded_assets',
    query: {
      ...baseQuery,
      created_at: `gte.${dailyWindowStartedAt}`,
      limit: dailyLimit + 1,
    },
  })

  const totalActiveAssets = await supabaseAdminFetch<UploadedAssetRow[]>({
    path: '/rest/v1/uploaded_assets',
    query: {
      ...baseQuery,
      limit: totalActiveLimit + 1,
    },
  })

  const dailyUsed = dailyAssets.length
  const totalActive = totalActiveAssets.length

  return {
    dailyLimit,
    dailyUsed,
    dailyRemaining: Math.max(dailyLimit - dailyUsed, 0),
    dailyWindowHours,
    dailyWindowStartedAt,
    totalActiveLimit,
    totalActive,
    totalRemaining: Math.max(totalActiveLimit - totalActive, 0),
  }
}

export async function markUploadedAssetsAttached(input: {
  galleryId: string
  vehicleId: string
  paths?: Array<string | null | undefined>
  publicUrls?: Array<string | null | undefined>
}) {
  const paths = uniquePaths(input)
  let updated = 0
  const attachedAt = nowIso()

  for (const objectPath of paths) {
    const rows = await supabaseAdminFetch<UploadedAssetRow[]>({
      method: 'PATCH',
      path: '/rest/v1/uploaded_assets',
      query: {
        gallery_id: `eq.${input.galleryId}`,
        object_path: `eq.${objectPath}`,
        status: 'neq.deleted',
      },
      prefer: 'return=representation',
      body: {
        vehicle_id: input.vehicleId,
        status: 'attached',
        attached_at: attachedAt,
        deleted_at: null,
      },
    })
    updated += rows.length
  }

  return { updated, paths }
}

export async function markUploadedAssetsDeleted(input: {
  galleryId: string
  paths?: Array<string | null | undefined>
  publicUrls?: Array<string | null | undefined>
  allowOwnedLegacyPanelPaths?: boolean
}) {
  const paths = uniquePaths(input)
  let updated = 0
  const deletedAt = nowIso()

  for (const objectPath of paths) {
    const rows = await supabaseAdminFetch<UploadedAssetRow[]>({
      method: 'PATCH',
      path: '/rest/v1/uploaded_assets',
      query: {
        gallery_id: `eq.${input.galleryId}`,
        object_path: `eq.${objectPath}`,
      },
      prefer: 'return=representation',
      body: {
        status: 'deleted',
        deleted_at: deletedAt,
      },
    })
    updated += rows.length
  }

  return { updated, paths }
}

export async function cleanupStaleUploadedAssets(input: {
  olderThanHours?: number
  limit?: number
  now?: Date
} = {}) {
  const olderThanHours = positiveInteger(input.olderThanHours, 24, 168)
  const limit = positiveInteger(input.limit, 100, 100)
  const now = input.now || new Date()
  const cutoff = new Date(now.getTime() - olderThanHours * 60 * 60 * 1000).toISOString()

  const staleAssets = await supabaseAdminFetch<UploadedAssetRow[]>({
    path: '/rest/v1/uploaded_assets',
    query: {
      select: 'id,gallery_id,bucket,object_path,public_url,status,created_at',
      bucket: `eq.${getVehicleImagesBucket()}`,
      status: 'eq.staged',
      vehicle_id: 'is.null',
      created_at: `lt.${cutoff}`,
      order: 'created_at.asc',
      limit,
    },
  })

  const failures: CleanupFailure[] = []
  const assetsByGallery = new Map<string, UploadedAssetRow[]>()

  for (const asset of staleAssets) {
    const galleryId = asset.gallery_id || ''
    const normalizedPath = normalizeGalleryVehicleImagePath({
      galleryId,
      path: asset.object_path,
    })

    if (!galleryId || !normalizedPath) {
      failures.push({
        id: asset.id,
        objectPath: asset.object_path,
        reason: 'path_out_of_gallery_scope',
      })
      continue
    }

    const galleryAssets = assetsByGallery.get(galleryId) || []
    galleryAssets.push({ ...asset, object_path: normalizedPath })
    assetsByGallery.set(galleryId, galleryAssets)
  }

  let storageDeleted = 0
  let metadataUpdated = 0
  const cleanedAt = now.toISOString()

  for (const [galleryId, assets] of assetsByGallery) {
    try {
      const deleteResult = await deleteVehicleImageObjectsForGallery({
        galleryId,
        paths: assets.map((asset) => asset.object_path),
      })
      storageDeleted += deleteResult.deleted

      for (const asset of assets) {
        const rows = await supabaseAdminFetch<UploadedAssetRow[]>({
          method: 'PATCH',
          path: '/rest/v1/uploaded_assets',
          query: {
            id: `eq.${asset.id}`,
            gallery_id: `eq.${galleryId}`,
            status: 'eq.staged',
          },
          prefer: 'return=representation',
          body: {
            status: 'orphaned',
            deleted_at: cleanedAt,
          },
        })
        metadataUpdated += rows.length
      }
    } catch (error) {
      for (const asset of assets) {
        failures.push({
          id: asset.id,
          objectPath: asset.object_path,
          reason: error instanceof Error ? error.message : 'cleanup_failed',
        })
      }
    }
  }

  return {
    ok: failures.length === 0,
    cutoff,
    olderThanHours,
    limit,
    scanned: staleAssets.length,
    storageDeleted,
    metadataUpdated,
    failures,
  }
}
