import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/request-guards'
import { findPlaceholderTextField } from '@/lib/server/panel-input-guard'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { createPanelVehicle } from '@/lib/server/panel-repository'
import { assertFeatureAccess } from '@/lib/server/subscription-repository'
import { subscriptionGateErrorResponse } from '@/lib/server/subscription-response'
import { createVehicleSchema } from '@/lib/server/vehicle-input-schema'

export const runtime = 'nodejs'

const bulkImportSchema = z.object({
  items: z.array(createVehicleSchema).min(1).max(100),
})

export async function POST(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const parsed = bulkImportSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? 'Toplu araç verisi geçersiz.' },
        { status: 400 },
      )
    }

    for (const [index, item] of parsed.data.items.entries()) {
      const placeholder = findPlaceholderTextField([
        { label: 'Marka', value: item.brand },
        { label: 'Model', value: item.model },
        { label: 'Paket', value: item.variant },
        { label: 'Açıklama', value: item.description },
      ])
      if (placeholder) {
        return NextResponse.json(
          { ok: false, message: `${index + 2}. satırdaki ${placeholder.label} alanında örnek/sahte değer kullanılamaz.` },
          { status: 400 },
        )
      }
    }

    const subscription = await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'vehicles.bulk_import',
    })
    const remaining = subscription.usage.vehicles.remaining
    if (remaining !== null && parsed.data.items.length > remaining) {
      return NextResponse.json(
        { ok: false, message: `Paketinizde ${remaining} araçlık yer kaldı. Dosyadaki araç sayısını azaltın.` },
        { status: 402 },
      )
    }

    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const imported = []
    const errors: Array<{ row: number; message: string }> = []

    for (const [index, item] of parsed.data.items.entries()) {
      try {
        const vehicle = await createPanelVehicle(item, session.email)
        imported.push(vehicle)
        await insertAuditLog({
          action: 'vehicle_create',
          entityType: 'vehicle',
          entityId: vehicle.id,
          actorRole: 'owner',
          source: 'panel_bulk_import',
          ip,
          userAgent,
          metadata: {
            galleryId: session.galleryId,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            bulkImport: true,
          },
        })
      } catch {
        errors.push({ row: index + 2, message: 'Araç oluşturulamadı.' })
      }
    }

    return NextResponse.json({
      ok: imported.length > 0,
      importedCount: imported.length,
      failedCount: errors.length,
      items: imported,
      errors,
      message: errors.length > 0
        ? `${imported.length} araç aktarıldı, ${errors.length} satır aktarılamadı.`
        : `${imported.length} araç başarıyla aktarıldı.`,
    }, { status: imported.length > 0 ? 200 : 500 })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    const subscriptionErrorResponse = subscriptionGateErrorResponse(error)
    if (subscriptionErrorResponse) return subscriptionErrorResponse
    return NextResponse.json({ ok: false, message: 'Toplu araç aktarımı tamamlanamadı.' }, { status: 500 })
  }
}
