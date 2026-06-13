import { NextResponse } from 'next/server'
import { z } from 'zod'

import { BILLING_INTERVALS, SUBSCRIPTION_PLAN_CODES } from '@/lib/subscription-plans'
import { getBillingProviderStatus } from '@/lib/server/billing-provider'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import {
  getSubscriptionContextForGallery,
  getSubscriptionPlanCatalog,
  updateGallerySubscriptionPlan,
} from '@/lib/server/subscription-repository'
import { fetchPanelGalleryOwnerEmail } from '@/lib/server/panel-team-repository'

export const runtime = 'nodejs'

const updateSchema = z.object({
  planCode: z.enum(SUBSCRIPTION_PLAN_CODES),
  billingInterval: z.enum(BILLING_INTERVALS).default('monthly'),
})

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const ownerEmail = await fetchPanelGalleryOwnerEmail(session.galleryId)
    if (!ownerEmail) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Abonelik için galeri sahibi bilgisi bulunamadı.',
        },
        { status: 404 },
      )
    }

    const subscription = await getSubscriptionContextForGallery({
      galleryId: session.galleryId,
      ownerEmail,
    })

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      catalog: getSubscriptionPlanCatalog(),
      subscription,
      paymentProvider: getBillingProviderStatus(),
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Abonelik bilgisi alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    if (session.role !== 'owner') {
      return NextResponse.json(
        {
          ok: false,
          message: 'Plan değiştirme yetkisi sadece hesap sahibindedir.',
        },
        { status: 403 },
      )
    }

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

    const ownerEmail = await fetchPanelGalleryOwnerEmail(session.galleryId)
    if (!ownerEmail) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Plan seçimi için galeri sahibi bilgisi bulunamadı.',
        },
        { status: 404 },
      )
    }

    const result = await updateGallerySubscriptionPlan({
      galleryId: session.galleryId,
      ownerEmail,
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
      paymentProvider: getBillingProviderStatus(),
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Plan seçimi kaydedilemedi.',
      },
      { status: 500 },
    )
  }
}
