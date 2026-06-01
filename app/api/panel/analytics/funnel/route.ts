import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getLeadFunnelAnalytics } from '@/lib/server/analytics-repository'

export const runtime = 'nodejs'

const rangeSchema = z.enum(['7days', '30days', '90days', 'year'])

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const rawRange = url.searchParams.get('range') ?? '7days'
    const parsedRange = rangeSchema.safeParse(rawRange)

    if (!parsedRange.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsedRange.error.issues[0]?.message ?? 'Geçersiz tarih aralığı.',
        },
        { status: 400 },
      )
    }

    const funnel = await getLeadFunnelAnalytics(parsedRange.data)

    return NextResponse.json({
      ok: true,
      ...funnel,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Lead funnel analitiği alınamadı.',
      },
      { status: 500 },
    )
  }
}
