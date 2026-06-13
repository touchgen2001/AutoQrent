import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getRegistrationFunnelAnalytics } from '@/lib/server/analytics-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { assertFeatureAccess } from '@/lib/server/subscription-repository'
import { subscriptionGateErrorResponse } from '@/lib/server/subscription-response'

export const runtime = 'nodejs'

const rangeSchema = z.enum(['7days', '30days', '90days', 'year'])

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'analytics.advanced',
    })

    const url = new URL(request.url)
    const parsedRange = rangeSchema.safeParse(url.searchParams.get('range') ?? '7days')
    if (!parsedRange.success) {
      return NextResponse.json(
        { ok: false, message: parsedRange.error.issues[0]?.message ?? 'Geçersiz tarih aralığı.' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ok: true,
      ...(await getRegistrationFunnelAnalytics(parsedRange.data)),
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    const subscriptionErrorResponse = subscriptionGateErrorResponse(error)
    if (subscriptionErrorResponse) return subscriptionErrorResponse

    return NextResponse.json(
      { ok: false, message: 'Kayıt akışı analitiği alınamadı.' },
      { status: 500 },
    )
  }
}
