import { NextResponse } from 'next/server'

import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordOperationalEvent } from '@/lib/security/ops-monitor'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { requireSupabaseAdminConfig } from '@/lib/server/supabase-admin'
import { getGalleryImageQuotaSnapshot } from '@/lib/server/uploaded-assets'
import type { PanelVehicleImageQuotaResponse } from '@/lib/panel-types'

export const runtime = 'nodejs'

const QUOTA_ROUTE = '/api/panel/uploads/vehicle-images/quota'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export async function GET(request: Request) {
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

    const imageLimits = getSecurityLimits().vehicleImageUploads
    const quotaSnapshot = await getGalleryImageQuotaSnapshot({
      galleryId: session.galleryId,
      dailyLimit: imageLimits.dailyLimit,
      totalActiveLimit: imageLimits.totalActiveLimit,
      dailyWindowHours: imageLimits.dailyWindowHours,
    })

    const payload: PanelVehicleImageQuotaResponse = {
      ok: true,
      source: 'supabase',
      galleryId: session.galleryId,
      quota: {
        ...quotaSnapshot,
        maxFilesPerRequest: imageLimits.maxFilesPerRequest,
        maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      },
    }

    recordOperationalEvent({
      area: 'upload',
      route: QUOTA_ROUTE,
      method: 'GET',
      status: 200,
      ok: true,
      message: 'image_quota_ok',
      durationMs: Date.now() - startedAt,
    })
    recordApiTiming({
      route: QUOTA_ROUTE,
      method: 'GET',
      status: 200,
      durationMs: Date.now() - startedAt,
      area: 'upload',
    })

    return NextResponse.json(payload)
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) {
      recordOperationalEvent({
        area: 'upload',
        route: QUOTA_ROUTE,
        method: 'GET',
        status: authErrorResponse.status,
        ok: false,
        message: 'image_quota_auth_failed',
        durationMs: Date.now() - startedAt,
      })
      recordApiTiming({
        route: QUOTA_ROUTE,
        method: 'GET',
        status: authErrorResponse.status,
        durationMs: Date.now() - startedAt,
        area: 'upload',
      })
      return authErrorResponse
    }

    recordOperationalEvent({
      area: 'upload',
      route: QUOTA_ROUTE,
      method: 'GET',
      status: 500,
      ok: false,
      message: error instanceof Error ? error.message : 'image_quota_failed',
      durationMs: Date.now() - startedAt,
    })
    recordApiError({
      route: QUOTA_ROUTE,
      method: 'GET',
      status: 500,
      message: error instanceof Error ? error.message : 'image_quota_failed',
      area: 'upload',
    })
    recordApiTiming({
      route: QUOTA_ROUTE,
      method: 'GET',
      status: 500,
      durationMs: Date.now() - startedAt,
      area: 'upload',
    })

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Görsel kotası alınamadı.',
      },
      { status: 500 },
    )
  }
}
