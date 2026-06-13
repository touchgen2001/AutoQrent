import { NextResponse } from 'next/server'
import { z } from 'zod'

import { insertAuditLog } from '@/lib/security/audit'
import {
  panelAuthErrorResponse,
  requirePanelPermissionOrThrow,
  requirePanelSessionOrThrow,
} from '@/lib/server/panel-auth-guard'
import { listDeletedPanelVehicles, restorePanelVehicle } from '@/lib/server/panel-repository'

export const runtime = 'nodejs'

const restoreSchema = z.object({ vehicleId: z.string().uuid() })

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'vehicles.delete')
    return NextResponse.json({ ok: true, items: await listDeletedPanelVehicles(session.email) })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Çöp kutusu alınamadı.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'vehicles.delete')
    const parsed = restoreSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, message: 'Araç kimliği geçersiz.' }, { status: 400 })
    await restorePanelVehicle(parsed.data.vehicleId, session.email)
    await insertAuditLog({
      action: 'vehicle_restore',
      entityType: 'vehicle',
      entityId: parsed.data.vehicleId,
      actorEmail: session.email,
      actorRole: session.role,
      source: 'panel_api',
      metadata: { galleryId: session.galleryId },
    })
    return NextResponse.json({ ok: true, items: await listDeletedPanelVehicles(session.email) })
  } catch (error) {
    const response = panelAuthErrorResponse(error)
    if (response) return response
    return NextResponse.json({ ok: false, message: 'Araç geri alınamadı.' }, { status: 500 })
  }
}

