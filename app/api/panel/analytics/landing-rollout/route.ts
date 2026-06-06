import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { getLandingCtaAnalytics } from '@/lib/server/analytics-repository'
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

type LandingSummary = Awaited<ReturnType<typeof getLandingCtaAnalytics>>['summary']

const requestSchema = z.object({
  action: z.enum(['apply_winner', 'set_auto']),
  range: z.enum(['7days', '30days', '90days', 'year']).default('30days'),
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

async function patchLandingConfig(input: {
  galleryId: string
  mode: 'auto' | 'forced'
  forcedVariant: 'A' | 'B' | null
}) {
  await supabaseAdminFetch<unknown>({
    method: 'PATCH',
    path: '/rest/v1/galleries',
    query: {
      id: `eq.${input.galleryId}`,
    },
    body: {
      landing_cta_mode: input.mode,
      landing_cta_forced_variant: input.forcedVariant,
      landing_cta_updated_at: new Date().toISOString(),
    },
    prefer: 'return=minimal',
  })
}

function resolveBlockedReason(summary: LandingSummary) {
  if (!summary.minimumSampleReached) return 'insufficient_sample'
  if (!summary.minimumDurationReached) return 'insufficient_duration'
  if (!summary.minimumSessionReached) return 'insufficient_sessions'
  if (summary.confidence === 'low') return 'insufficient_confidence'
  if (!summary.winnerVariant) return 'missing_winner'
  return 'rollout_blocked'
}

export async function POST(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()
    await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'analytics.advanced',
    })

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz rollout isteği.',
        },
        { status: 400 },
      )
    }

    const existingConfig = await fetchLandingConfig(session.email)
    if (!existingConfig) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Rollout için galeri ayarı bulunamadı.',
        },
        { status: 404 },
      )
    }

    if (parsed.data.action === 'set_auto') {
      await patchLandingConfig({
        galleryId: existingConfig.galleryId,
        mode: 'auto',
        forcedVariant: null,
      })

      const config = await fetchLandingConfig(session.email)

      void insertAuditLog({
        action: 'landing_cta_config_update',
        entityType: 'marketing',
        entityId: `landing-cta-config:${existingConfig.galleryId}`,
        source: 'panel_rollout',
        metadata: {
          galleryId: existingConfig.galleryId,
          action: 'set_auto',
          previousMode: existingConfig.mode,
          previousVariant: existingConfig.forcedVariant,
          nextMode: 'auto',
          nextVariant: null,
        },
      })

      return NextResponse.json({
        ok: true,
        source: 'supabase',
        action: 'set_auto',
        config,
      })
    }

    const analytics = await getLandingCtaAnalytics(parsed.data.range, session.email)
    const summary = analytics.summary

    if (!summary.winnerVariant) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Kazanan varyant bulunamadı. Rollout uygulanamıyor.',
          reason: 'missing_winner',
        },
        { status: 409 },
      )
    }

    if (!summary.rolloutEligible) {
      const blockedReason = resolveBlockedReason(summary)
      return NextResponse.json(
        {
          ok: false,
          message: 'Rollout kriterleri sağlanmadı. Örneklem, süre, oturum ve güven seviyesini tamamlayın.',
          reason: blockedReason,
          summary,
        },
        { status: 409 },
      )
    }

    await patchLandingConfig({
      galleryId: existingConfig.galleryId,
      mode: 'forced',
      forcedVariant: summary.winnerVariant,
    })

    const config = await fetchLandingConfig(session.email)

    void insertAuditLog({
      action: 'landing_cta_config_update',
      entityType: 'marketing',
      entityId: `landing-cta-config:${existingConfig.galleryId}`,
      source: 'panel_rollout',
      metadata: {
        galleryId: existingConfig.galleryId,
        action: 'apply_winner',
        range: parsed.data.range,
        previousMode: existingConfig.mode,
        previousVariant: existingConfig.forcedVariant,
        nextMode: 'forced',
        nextVariant: summary.winnerVariant,
        summary,
      },
    })

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      action: 'apply_winner',
      appliedVariant: summary.winnerVariant,
      confidence: summary.confidence,
      range: parsed.data.range,
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
        message: 'Açılış sayfası yayını uygulanamadı.',
      },
      { status: 500 },
    )
  }
}
