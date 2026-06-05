import { NextResponse } from 'next/server'
import { getPanelAlerts } from '@/lib/server/alerts-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const result = await getPanelAlerts(session.email, session.userId)
    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Canlı uyarılar alınamadı.',
      },
      { status: 500 },
    )
  }
}
