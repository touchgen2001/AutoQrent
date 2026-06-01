import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { createPanelVehicle, listPanelVehicles } from '@/lib/server/panel-repository'
import { getClientIp } from '@/lib/security/request-guards'
import { findPlaceholderTextField, findPlaceholderUrlField } from '@/lib/server/panel-input-guard'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

const createVehicleSchema = z.object({
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
  photos: z.array(z.string().trim().url().max(1500)).max(30).optional(),
})

export async function GET(request: Request) {
  try {
    const session = requirePanelSessionOrThrow(request)
    const result = await listPanelVehicles(session.email)
    return NextResponse.json({
      ok: true,
      source: result.source,
      items: result.items,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Araç listesi alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = requirePanelSessionOrThrow(request)
    const body = await request.json()
    const parsed = createVehicleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz araç verisi.',
        },
        { status: 400 },
      )
    }

    const placeholderTextField = findPlaceholderTextField([
      { label: 'Marka', value: parsed.data.brand },
      { label: 'Model', value: parsed.data.model },
      { label: 'Paket', value: parsed.data.variant },
      { label: 'Yakıt', value: parsed.data.fuel },
      { label: 'Vites', value: parsed.data.transmission },
      { label: 'Renk', value: parsed.data.color },
      { label: 'Açıklama', value: parsed.data.description },
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

    const placeholderPhotoField = findPlaceholderUrlField(
      (parsed.data.photos || []).map((photo) => ({ label: 'Fotoğraf URL', value: photo })),
    )

    if (placeholderPhotoField) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Fotoğraf URL alanında örnek/test domain kullanılamaz.',
        },
        { status: 400 },
      )
    }

    const vehicle = await createPanelVehicle(parsed.data, session.email)
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    await insertAuditLog({
      action: 'vehicle_create',
      entityType: 'vehicle',
      entityId: vehicle.id,
      actorRole: 'owner',
      source: 'panel_api',
      ip,
      userAgent,
      metadata: {
        galleryId: session.galleryId,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
      },
    })

    return NextResponse.json({
      ok: true,
      item: vehicle,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Araç oluşturulamadı.',
      },
      { status: 500 },
    )
  }
}
