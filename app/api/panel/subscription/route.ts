import { NextResponse } from 'next/server'
import { z } from 'zod'

import { BILLING_INTERVALS, SUBSCRIPTION_PLAN_CODES } from '@/lib/subscription-plans'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import {
  getSubscriptionContextForGallery,
  getSubscriptionPlanCatalog,
  updateGallerySubscriptionPlan,
} from '@/lib/server/subscription-repository'

export const runtime = 'nodejs'

const updateSchema = z.object({
  planCode: z.enum(SUBSCRIPTION_PLAN_CODES),
  billingInterval: z.enum(BILLING_INTERVALS).default('monthly'),
})

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const subscription = await getSubscriptionContextForGallery({
      galleryId: session.galleryId,
      ownerEmail: session.email,
    })

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      catalog: getSubscriptionPlanCatalog(),
      subscription,
      paymentProvider: {
        connected: false,
        provider: null,
        message: 'Ödeme sağlayıcısı henüz bağlı değil. Plan seçimi kaydedilir; otomatik tahsilat yapılmaz.',
      },
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Abonelik bilgisi alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const parsed = updateSchema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz plan seçimi.',
        },
        { status: 400 },
      )
    }

    const result = await updateGallerySubscriptionPlan({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      planCode: parsed.data.planCode,
      billingInterval: parsed.data.billingInterval,
    })

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      quoteRequired: result.quoteRequired,
      message: result.message,
      catalog: getSubscriptionPlanCatalog(),
      subscription: result.context,
      paymentProvider: {
        connected: false,
        provider: null,
        message: 'Ödeme sağlayıcısı henüz bağlı değil. Tahsilat entegrasyonu sonraki fazda bağlanmalıdır.',
      },
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Plan seçimi kaydedilemedi.',
      },
      { status: 500 },
    )
  }
}
