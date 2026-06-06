import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { assertFeatureAccess } from '@/lib/server/subscription-repository'
import { subscriptionGateErrorResponse } from '@/lib/server/subscription-response'

export const runtime = 'nodejs'

type LandingConfigRow = {
  id: string
  landing_cta_mode: string | null
  landing_cta_forced_variant: string | null
  landing_cta_updated_at: string | null
}

const updateSchema = z.object({
  mode: z.enum(['auto', 'forced']),
  forcedVariant: z.enum(['A', 'B']).nullable().optional(),
})

function normalizeMode(mode: string | null | undefined): 'auto' | 'forced' {
  return mode === 'forced' ? 'forced' : 'auto'
}

function normalizeVariant(variant: string | null | undefined): 'A' | 'B' | null {
  if (variant === 'A' || variant === 'B') return variant
  return null
}

function mapConfigRow(row: LandingConfigRow) {
  const mode = normalizeMode(row.landing_cta_mode)
  const forcedVariant = normalizeVariant(row.landing_cta_forced_variant)

  return {
    galleryId: row.id,
    mode,
    forcedVariant: mode === 'forced' ? forcedVariant : null,
    updatedAt: row.landing_cta_updated_at,
  }
}

async function fetchLandingConfig(ownerEmail: string) {
  const rows = await supabaseAdminFetch<LandingConfigRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,landing_cta_mode,landing_cta_forced_variant,landing_cta_updated_at',
      owner_email: `eq.${ownerEmail}`,
      limit: 1,
    },
  })

  const row = rows[0]
  return row ? mapConfigRow(row) : null
}

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()
    await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'analytics.advanced',
    })

    const config = await fetchLandingConfig(session.email)
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Landing CTA ayarı için galeri kaydı bulunamadı.',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      config,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    const subscriptionErrorResponse = subscriptionGateErrorResponse(error)
    if (subscriptionErrorResponse) return subscriptionErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Açılış sayfası CTA ayarı alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()
    await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'analytics.advanced',
    })

    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz landing CTA ayarı.',
        },
        { status: 400 },
      )
    }

    const previous = await fetchLandingConfig(session.email)

    const forcedVariant = parsed.data.mode === 'forced'
      ? (parsed.data.forcedVariant ?? null)
      : null

    if (parsed.data.mode === 'forced' && !forcedVariant) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Zorunlu mod icin varyant secimi gereklidir.',
        },
        { status: 400 },
      )
    }

    if (!previous) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Landing CTA ayarı için galeri kaydı bulunamadı.',
        },
        { status: 404 },
      )
    }

    await supabaseAdminFetch<unknown>({
      method: 'PATCH',
      path: '/rest/v1/galleries',
      query: {
        id: `eq.${previous.galleryId}`,
      },
      body: {
        landing_cta_mode: parsed.data.mode,
        landing_cta_forced_variant: forcedVariant,
        landing_cta_updated_at: new Date().toISOString(),
      },
      prefer: 'return=minimal',
    })

    const config = await fetchLandingConfig(session.email)

    void insertAuditLog({
      action: 'landing_cta_config_update',
      entityType: 'marketing',
      entityId: `landing-cta-config:${previous.galleryId}`,
      source: 'panel_analytics',
      metadata: {
        galleryId: previous.galleryId,
        previousMode: previous?.mode ?? null,
        previousVariant: previous?.forcedVariant ?? null,
        nextMode: parsed.data.mode,
        nextVariant: forcedVariant,
      },
    })

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      config,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    const subscriptionErrorResponse = subscriptionGateErrorResponse(error)
    if (subscriptionErrorResponse) return subscriptionErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Açılış sayfası CTA ayarı kaydedilemedi.',
      },
      { status: 500 },
    )
  }
}
