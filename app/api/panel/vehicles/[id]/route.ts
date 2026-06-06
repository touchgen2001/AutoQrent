import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { deletePanelVehicle, listPanelVehicles } from '@/lib/server/panel-repository'
import { findPlaceholderTextField } from '@/lib/server/panel-input-guard'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { getClientIp } from '@/lib/security/request-guards'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { deleteVehicleImageObjectsForGallery } from '@/lib/server/storage-images'
import {
  markUploadedAssetsAttached,
  markUploadedAssetsDeleted,
} from '@/lib/server/uploaded-assets'
import { updateVehicleSchema } from '@/lib/server/vehicle-input-schema'

export const runtime = 'nodejs'

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

type VehiclePhotoRow = {
  id: string
  photos: string[] | null
}

async function parseVehicleId(context: { params: Promise<unknown> }) {
  const resolved = await context.params
  return paramsSchema.safeParse(resolved)
}

export async function GET(_request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(_request)

    const parsed = await parseVehicleId(context)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Geçersiz araç kimliği.',
        },
        { status: 400 },
      )
    }

    const result = await listPanelVehicles(session.email)
    const item = result.items.find((vehicle) => vehicle.id === parsed.data.id)

    if (!item) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Araç bulunamadı.',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      source: result.source,
      item,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Araç detayı alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    if (!session.galleryId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Galeri kimliği bulunamadı.',
        },
        { status: 400 },
      )
    }

    const parsedParams = await parseVehicleId(context)
    if (!parsedParams.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Geçersiz araç kimliği.',
        },
        { status: 400 },
      )
    }

    const body = await request.json()
    const parsedBody = updateVehicleSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsedBody.error.issues[0]?.message ?? 'Geçersiz araç verisi.',
        },
        { status: 400 },
      )
    }

    const placeholderTextField = findPlaceholderTextField([
      { label: 'Marka', value: parsedBody.data.brand },
      { label: 'Model', value: parsedBody.data.model },
      { label: 'Paket', value: parsedBody.data.variant },
      { label: 'Yakıt', value: parsedBody.data.fuel },
      { label: 'Vites', value: parsedBody.data.transmission },
      { label: 'Renk', value: parsedBody.data.color },
      { label: 'Açıklama', value: parsedBody.data.description },
    ])

    if (placeholderTextField) {
      return NextResponse.json(
        {
          ok: false,
          message: `${placeholderTextField.label} alanında örnek/sahte değer kullanılamaz.`,
        },
        { status: 400 },
      )
    }

    requireSupabaseAdminConfig()
    const currentRows = parsedBody.data.photos
      ? await supabaseAdminFetch<VehiclePhotoRow[]>({
          path: '/rest/v1/vehicles',
          query: {
            select: 'id,photos',
            id: `eq.${parsedParams.data.id}`,
            gallery_id: `eq.${session.galleryId}`,
            limit: 1,
          },
        })
      : []
    const currentPhotos = currentRows[0]?.photos?.filter(Boolean) || []
    const nextPhotos = parsedBody.data.photos?.filter(Boolean) || []
    const removedPhotos = parsedBody.data.photos
      ? currentPhotos.filter((photo) => !nextPhotos.includes(photo))
      : []

    await supabaseAdminFetch<unknown>({
      method: 'PATCH',
      path: '/rest/v1/vehicles',
      query: {
        id: `eq.${parsedParams.data.id}`,
        gallery_id: `eq.${session.galleryId}`,
      },
      prefer: 'return=minimal',
      body: {
        brand: parsedBody.data.brand,
        model: parsedBody.data.model,
        variant: parsedBody.data.variant || '',
        year: parsedBody.data.year,
        price: parsedBody.data.price,
        km: parsedBody.data.mileage,
        fuel: parsedBody.data.fuel,
        transmission: parsedBody.data.transmission,
        color: parsedBody.data.color || '',
        description: parsedBody.data.description || '',
        ...(parsedBody.data.photos ? { photos: nextPhotos } : {}),
      },
    })

    if (parsedBody.data.photos && session.galleryId) {
      await markUploadedAssetsAttached({
        galleryId: session.galleryId,
        vehicleId: parsedParams.data.id,
        publicUrls: nextPhotos,
      })
    }

    if (removedPhotos.length > 0 && session.galleryId) {
      await deleteVehicleImageObjectsForGallery({
        galleryId: session.galleryId,
        publicUrls: removedPhotos,
        allowOwnedLegacyPanelPaths: true,
      })
      await markUploadedAssetsDeleted({
        galleryId: session.galleryId,
        publicUrls: removedPhotos,
        allowOwnedLegacyPanelPaths: true,
      })
    }

    const result = await listPanelVehicles(session.email)
    const item = result.items.find((vehicle) => vehicle.id === parsedParams.data.id)

    if (!item) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Araç güncellendi ancak detay bulunamadı.',
        },
        { status: 404 },
      )
    }

    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    await insertAuditLog({
      action: 'vehicle_update',
      entityType: 'vehicle',
      entityId: parsedParams.data.id,
      actorRole: 'owner',
      source: 'panel_api',
      ip,
      userAgent,
      metadata: {
        galleryId: session.galleryId,
        brand: item.brand,
        model: item.model,
        year: item.year,
      },
    })

    return NextResponse.json({
      ok: true,
      source: result.source,
      item,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Araç güncellenemedi. Lütfen tekrar deneyin.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const parsed = await parseVehicleId(context)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Geçersiz araç kimliği.',
        },
        { status: 400 },
      )
    }

    const deleteResult = await deletePanelVehicle(parsed.data.id, session.email)
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    await insertAuditLog({
      action: 'vehicle_delete',
      entityType: 'vehicle',
      entityId: parsed.data.id,
      actorRole: 'owner',
      source: 'panel_api',
      ip,
      userAgent,
      metadata: {
        galleryId: session.galleryId,
        deletedImages: deleteResult.deletedImages,
        deletedAssetRows: deleteResult.deletedAssetRows,
      },
    })

    return NextResponse.json({
      ok: true,
      deletedImages: deleteResult.deletedImages,
      deletedAssetRows: deleteResult.deletedAssetRows,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Araç silinemedi. Lütfen tekrar deneyin.',
      },
      { status: 500 },
    )
  }
}
