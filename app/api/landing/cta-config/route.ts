import { NextResponse } from 'next/server'
import { hasSupabaseAdmin, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export const runtime = 'nodejs'

type LandingConfigRow = {
  landing_cta_mode: string | null
  landing_cta_forced_variant: string | null
}

function normalizeMode(mode: string | null | undefined): 'auto' | 'forced' {
  return mode === 'forced' ? 'forced' : 'auto'
}

function normalizeVariant(variant: string | null | undefined): 'A' | 'B' | null {
  if (variant === 'A' || variant === 'B') return variant
  return null
}

function defaultResponse() {
  return {
    ok: true as const,
    source: 'default' as const,
    mode: 'auto' as const,
    forcedVariant: null as null,
  }
}

export async function GET() {
  if (!hasSupabaseAdmin()) {
    return NextResponse.json(defaultResponse())
  }

  try {
    const rows = await supabaseAdminFetch<LandingConfigRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: 'landing_cta_mode,landing_cta_forced_variant',
        order: 'created_at.asc',
        limit: 1,
      },
    })

    const row = rows[0]
    if (!row) {
      return NextResponse.json(defaultResponse())
    }

    const mode = normalizeMode(row.landing_cta_mode)
    const forcedVariant = normalizeVariant(row.landing_cta_forced_variant)

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      mode,
      forcedVariant: mode === 'forced' ? forcedVariant : null,
    })
  } catch {
    return NextResponse.json(defaultResponse())
  }
}
