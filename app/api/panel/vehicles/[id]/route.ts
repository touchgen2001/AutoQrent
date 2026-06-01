import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { deletePanelVehicle, listPanelVehicles } from '@/lib/server/panel-repository'
import { findPlaceholderTextField } from '@/lib/server/panel-input-guard'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { getClientIp } from '@/lib/security/request-guards'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

const updateVehicleSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  variant: z.string().trim().max(160).optional(),
  year: z.coerce.number().int().min(1980).max(2100),
  price: z.coerce.number().int().min(0),
  mileage: z.coerce.number().int().min(0),
  fuel: z.string().trim().min(1).max(80),
  transmission: z.string().trim().min(1).max(80),
  color: z.string().trim().max(80).optional(),
  description: z.string().trim().max(3000).optional(),
})

async function parseVehicleId(context: { params: Promise<unknown> }) {
  const resolved = await context.params
  return paramsSchema.safeParse(resolved)
}

export async function GET(_request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = requirePanelSessionOrThrow(_request)

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
        message: error instanceof Error ? error.message : 'Araç detayı alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = requirePanelSessionOrThrow(request)

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
      },
    })

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
        message: error instanceof Error ? error.message : 'Araç güncellenemedi.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = requirePanelSessionOrThrow(request)

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

    await deletePanelVehicle(parsed.data.id, session.email)
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
      },
    })

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Araç silinemedi.',
      },
      { status: 500 },
    )
  }
}
