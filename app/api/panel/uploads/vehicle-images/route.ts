import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { insertAuditLog, type AuditAction } from '@/lib/security/audit'
import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordOperationalEvent } from '@/lib/security/ops-monitor'
import { getClientIp } from '@/lib/security/request-guards'
import { requireSupabaseAdminConfig } from '@/lib/server/supabase-admin'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import type { PanelSession } from '@/lib/server/panel-auth'
import {
  ImageUploadValidationError,
  validateImageFileForUpload,
  type SafeImageScan,
  type SafeImageValidationResult,
} from '@/lib/server/safe-image-upload'
import {
  buildStoragePublicUrl,
  deleteVehicleImageObjectsForGallery,
  getVehicleImagesBucket,
} from '@/lib/server/storage-images'
import {
  createUploadedAssetRecord,
  getGalleryImageQuotaSnapshot,
  markUploadedAssetsDeleted,
} from '@/lib/server/uploaded-assets'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const UPLOAD_ROUTE = '/api/panel/uploads/vehicle-images'

type PreparedUpload = {
  file: File
  sha256: string
  scan: SafeImageValidationResult
}

type ImageAuditInput = {
  action: AuditAction
  session: PanelSession
  entityId: string
  metadata: Record<string, unknown>
  request: Request
}

function getSupabaseUploadConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin yapılandırması eksik.')
  }

  return {
    url,
    serviceRoleKey,
  }
}

function encodePathSegments(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

async function writeImageAudit({ action, session, entityId, metadata, request }: ImageAuditInput) {
  const auditResult = await insertAuditLog({
    action,
    entityType: 'system',
    entityId,
    actorEmail: session.email,
    actorRole: 'owner',
    source: 'panel_api',
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    metadata: {
      galleryId: session.galleryId,
      galleryName: session.galleryName,
      ...metadata,
    },
  }).catch((error) => ({
    ok: false,
    stored: false,
    error: error instanceof Error ? error.message : 'audit_write_failed',
  }))

  if (!auditResult.ok) {
    recordOperationalEvent({
      area: action === 'image_delete' ? 'storage_delete' : 'upload',
      route: UPLOAD_ROUTE,
      method: action === 'image_delete' ? 'DELETE' : 'POST',
      status: 500,
      ok: false,
      message: auditResult.error || 'image_audit_write_failed',
    })
  }
}

function recordUploadResponse(input: {
  method: 'POST' | 'DELETE'
  status: number
  ok: boolean
  message: string
  startedAt: number
  count?: number
}) {
  recordOperationalEvent({
    area: input.method === 'DELETE' ? 'storage_delete' : 'upload',
    route: UPLOAD_ROUTE,
    method: input.method,
    status: input.status,
    ok: input.ok,
    message: input.message,
    count: input.count,
    durationMs: Date.now() - input.startedAt,
  })
  recordApiTiming({
    route: UPLOAD_ROUTE,
    method: input.method,
    status: input.status,
    durationMs: Date.now() - input.startedAt,
    area: input.method === 'DELETE' ? 'storage_delete' : 'upload',
  })
}

async function rejectImageUpload(input: {
  request: Request
  session: PanelSession
  startedAt: number
  status: number
  reason: string
  message: string
  metadata?: Record<string, unknown>
}) {
  await writeImageAudit({
    action: 'image_reject',
    session: input.session,
    entityId: `${input.session.galleryId}:image_reject:${Date.now()}`,
    request: input.request,
    metadata: {
      reason: input.reason,
      status: input.status,
      ...input.metadata,
    },
  })
  recordUploadResponse({
    method: 'POST',
    status: input.status,
    ok: false,
    message: input.reason,
    startedAt: input.startedAt,
    count: typeof input.metadata?.fileCount === 'number' ? input.metadata.fileCount : undefined,
  })
  return NextResponse.json(
    {
      ok: false,
      message: input.message,
    },
    { status: input.status },
  )
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()
    const { url, serviceRoleKey } = getSupabaseUploadConfig()
    const imageLimits = getSecurityLimits().vehicleImageUploads

    if (!session.galleryId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Galeri kimliği bulunamadı.',
        },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files').filter((item): item is File => item instanceof File)

    if (files.length === 0) {
      return rejectImageUpload({
        request,
        session,
        startedAt,
        status: 400,
        reason: 'empty_file_list',
        message: 'En az bir görsel seçin.',
        metadata: {
          fileCount: 0,
        },
      })
    }

    if (files.length > imageLimits.maxFilesPerRequest) {
      return rejectImageUpload({
        request,
        session,
        startedAt,
        status: 400,
        reason: 'per_request_file_limit',
        message: `Tek seferde en fazla ${imageLimits.maxFilesPerRequest} görsel yükleyebilirsiniz.`,
        metadata: {
          fileCount: files.length,
          maxFilesPerRequest: imageLimits.maxFilesPerRequest,
        },
      })
    }

    const quotaSnapshot = await getGalleryImageQuotaSnapshot({
      galleryId: session.galleryId,
      dailyLimit: imageLimits.dailyLimit,
      totalActiveLimit: imageLimits.totalActiveLimit,
      dailyWindowHours: imageLimits.dailyWindowHours,
    })

    if (quotaSnapshot.dailyUsed + files.length > quotaSnapshot.dailyLimit) {
      return rejectImageUpload({
        request,
        session,
        startedAt,
        status: 429,
        reason: 'daily_upload_quota',
        message: `Günlük görsel yükleme sınırına ulaşıldı. Kalan hakkınız: ${quotaSnapshot.dailyRemaining}.`,
        metadata: {
          fileCount: files.length,
          quota: quotaSnapshot,
        },
      })
    }

    if (quotaSnapshot.totalActive + files.length > quotaSnapshot.totalActiveLimit) {
      return rejectImageUpload({
        request,
        session,
        startedAt,
        status: 429,
        reason: 'total_active_image_quota',
        message: `Galeri görsel arşiv sınırına ulaşıldı. Kalan aktif görsel hakkınız: ${quotaSnapshot.totalRemaining}.`,
        metadata: {
          fileCount: files.length,
          quota: quotaSnapshot,
        },
      })
    }

    const preparedUploads: PreparedUpload[] = []

    for (const file of files) {
      let validatedImage: SafeImageValidationResult

      try {
        validatedImage = await validateImageFileForUpload(file, {
          allowedKinds: ['jpeg', 'png', 'webp'],
          maxBytes: MAX_FILE_SIZE_BYTES,
          label: file.name || 'Görsel',
        })
      } catch (error) {
        if (error instanceof ImageUploadValidationError) {
          return rejectImageUpload({
            request,
            session,
            startedAt,
            status: 400,
            reason: 'security_validation_failed',
            message: error.message,
            metadata: {
              fileCount: files.length,
              fileName: file.name || 'vehicle-image',
              sizeBytes: file.size,
              contentType: file.type || 'unknown',
              validationMessage: error.message,
            },
          })
        }

        throw error
      }

      const sha256 = createHash('sha256').update(validatedImage.buffer).digest('hex')

      preparedUploads.push({
        file,
        sha256,
        scan: validatedImage,
      })
    }

    const uploadedItems: Array<{
      assetId: string
      path: string
      publicUrl: string
      name: string
      size: number
      mimeType: string
      securityScan: SafeImageScan
    }> = []

    for (const preparedUpload of preparedUploads) {
      const { file, scan: validatedImage, sha256 } = preparedUpload
      const extension = validatedImage.extension
      const objectPath = `panel/${session.galleryId}/vehicle-images/${Date.now()}-${randomUUID()}.${extension}`
      const publicUrl = buildStoragePublicUrl({
        baseUrl: url,
        bucket: getVehicleImagesBucket(),
        objectPath,
      })
      const uploadUrl = new URL(`${url}/storage/v1/object/${getVehicleImagesBucket()}/${encodePathSegments(objectPath)}`)
      uploadUrl.searchParams.set('upsert', 'false')

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          'content-type': validatedImage.contentType,
          'x-upsert': 'false',
        },
        body: validatedImage.buffer,
        cache: 'no-store',
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(errorText || `Görsel yüklenemedi: ${uploadResponse.status}`)
      }

      let assetId = ''
      try {
        const asset = await createUploadedAssetRecord({
          galleryId: session.galleryId,
          bucket: getVehicleImagesBucket(),
          objectPath,
          publicUrl,
          originalName: file.name,
          sizeBytes: validatedImage.buffer.length,
          sha256,
          scan: {
            kind: validatedImage.kind,
            contentType: validatedImage.contentType,
            extension: validatedImage.extension,
            width: validatedImage.width,
            height: validatedImage.height,
          },
        })
        assetId = asset.id
      } catch (metadataError) {
        await deleteVehicleImageObjectsForGallery({
          galleryId: session.galleryId,
          paths: [objectPath],
        }).catch(() => null)
        throw metadataError
      }

      uploadedItems.push({
        assetId,
        path: objectPath,
        publicUrl,
        name: file.name,
        size: file.size,
        mimeType: validatedImage.contentType,
        securityScan: {
          kind: validatedImage.kind,
          contentType: validatedImage.contentType,
          extension: validatedImage.extension,
          width: validatedImage.width,
          height: validatedImage.height,
        },
      })
    }

    const response = NextResponse.json({
      ok: true,
      source: 'supabase',
      items: uploadedItems,
      quota: {
        dailyRemaining: Math.max(quotaSnapshot.dailyRemaining - uploadedItems.length, 0),
        totalRemaining: Math.max(quotaSnapshot.totalRemaining - uploadedItems.length, 0),
      },
    })

    await writeImageAudit({
      action: 'image_upload',
      session,
      entityId: `${session.galleryId}:image_upload:${Date.now()}`,
      request,
      metadata: {
        count: uploadedItems.length,
        assetIds: uploadedItems.map((item) => item.assetId),
        objectPaths: uploadedItems.map((item) => item.path),
        sha256: preparedUploads.map((item) => item.sha256),
        quotaBefore: quotaSnapshot,
      },
    })

    recordUploadResponse({
      method: 'POST',
      status: 200,
      ok: true,
      message: 'upload_ok',
      count: uploadedItems.length,
      startedAt,
    })
    return response
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) {
      recordUploadResponse({
        method: 'POST',
        status: authErrorResponse.status,
        ok: false,
        message: 'upload_auth_failed',
        startedAt,
      })
      return authErrorResponse
    }

    if (error instanceof ImageUploadValidationError) {
      recordUploadResponse({
        method: 'POST',
        status: 400,
        ok: false,
        message: error.message,
        startedAt,
      })
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 400 },
      )
    }

    recordOperationalEvent({
      area: 'upload',
      route: UPLOAD_ROUTE,
      method: 'POST',
      status: 500,
      ok: false,
      message: error instanceof Error ? error.message : 'upload_failed',
      durationMs: Date.now() - startedAt,
    })
    recordApiError({
      route: UPLOAD_ROUTE,
      method: 'POST',
      status: 500,
      message: error instanceof Error ? error.message : 'upload_failed',
      area: 'upload',
    })
    recordApiTiming({
      route: UPLOAD_ROUTE,
      method: 'POST',
      status: 500,
      durationMs: Date.now() - startedAt,
      area: 'upload',
    })
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Görseller yüklenemedi.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  const startedAt = Date.now()
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()

    if (!session.galleryId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Galeri kimliği bulunamadı.',
        },
        { status: 400 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      paths?: string[]
      publicUrls?: string[]
    }

    const result = await deleteVehicleImageObjectsForGallery({
      galleryId: session.galleryId,
      paths: Array.isArray(body.paths) ? body.paths : [],
      publicUrls: Array.isArray(body.publicUrls) ? body.publicUrls : [],
    })
    const metadataResult = await markUploadedAssetsDeleted({
      galleryId: session.galleryId,
      paths: Array.isArray(body.paths) ? body.paths : [],
      publicUrls: Array.isArray(body.publicUrls) ? body.publicUrls : [],
    })

    const response = NextResponse.json({
      ok: true,
      deleted: result.deleted,
      metadataUpdated: metadataResult.updated,
    })

    await writeImageAudit({
      action: 'image_delete',
      session,
      entityId: `${session.galleryId}:image_delete:${Date.now()}`,
      request,
      metadata: {
        deleted: result.deleted,
        metadataUpdated: metadataResult.updated,
        objectPaths: result.paths,
        requestedPaths: Array.isArray(body.paths) ? body.paths.length : 0,
        requestedPublicUrls: Array.isArray(body.publicUrls) ? body.publicUrls.length : 0,
      },
    })

    recordUploadResponse({
      method: 'DELETE',
      status: 200,
      ok: true,
      message: 'storage_delete_ok',
      count: result.deleted,
      startedAt,
    })
    return response
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) {
      recordUploadResponse({
        method: 'DELETE',
        status: authErrorResponse.status,
        ok: false,
        message: 'storage_delete_auth_failed',
        startedAt,
      })
      return authErrorResponse
    }

    recordOperationalEvent({
      area: 'storage_delete',
      route: UPLOAD_ROUTE,
      method: 'DELETE',
      status: 500,
      ok: false,
      message: error instanceof Error ? error.message : 'vehicle_image_delete_failed',
      durationMs: Date.now() - startedAt,
    })
    recordApiError({
      route: UPLOAD_ROUTE,
      method: 'DELETE',
      status: 500,
      message: error instanceof Error ? error.message : 'vehicle_image_delete_failed',
      area: 'storage_delete',
    })
    recordApiTiming({
      route: UPLOAD_ROUTE,
      method: 'DELETE',
      status: 500,
      durationMs: Date.now() - startedAt,
      area: 'storage_delete',
    })
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Görsel silinemedi.',
      },
      { status: 500 },
    )
  }
}
