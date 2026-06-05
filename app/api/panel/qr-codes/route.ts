import { NextResponse } from 'next/server'

import { listPanelQrVehicleSummaries, listRecentPanelQrScans } from '@/lib/server/panel-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const [vehicles, recentScans] = await Promise.all([
      listPanelQrVehicleSummaries(session.email),
      listRecentPanelQrScans(40, session.email),
    ])

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      vehicles: vehicles.items,
      recentScans: recentScans.items,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'QR verileri alinamadi.',
      },
      { status: 500 },
    )
  }
}
