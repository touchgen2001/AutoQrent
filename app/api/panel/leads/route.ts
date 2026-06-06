import { NextResponse } from 'next/server'
import { listPanelLeads } from '@/lib/server/panel-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const result = await listPanelLeads(session.email)
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
        message: 'Müşteri talebi listesi alınamadı.',
      },
      { status: 500 },
    )
  }
}
