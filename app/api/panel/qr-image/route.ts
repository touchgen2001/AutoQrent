import QRCode from 'qrcode'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { injectBrandBadge } from '@/lib/qr-logo'
import { getTrustedMutationOrigins } from '@/lib/security/request-guards'
import { hasSecurePublicRouteToken, MAX_PUBLIC_ROUTE_SLUG_LENGTH } from '@/lib/security/public-route-token'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { assertFeatureAccess } from '@/lib/server/subscription-repository'
import { subscriptionGateErrorResponse } from '@/lib/server/subscription-response'

export const runtime = 'nodejs'

const querySchema = z.object({
  url: z.string().trim().url('Geçersiz QR linki.').max(512, 'QR linki çok uzun.'),
  size: z.coerce.number().int().min(96).max(1024).default(256),
})

function extractVehicleRouteId(url: URL) {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length !== 2 || segments[0] !== 'arac') return null

  const routeId = decodeURIComponent(segments[1] || '').trim().toLowerCase()
  if (!routeId || routeId.length > MAX_PUBLIC_ROUTE_SLUG_LENGTH) return null
  if (!hasSecurePublicRouteToken(routeId)) return null

  return routeId
}

function isAllowedQrUrl(request: Request, value: string) {
  try {
    const parsedUrl = new URL(value)
    if (!getTrustedMutationOrigins(request).has(parsedUrl.origin.toLowerCase())) return false
    if (parsedUrl.searchParams.get('src') !== 'qr') return false
    return Boolean(extractVehicleRouteId(parsedUrl))
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      url: url.searchParams.get('url') || '',
      size: url.searchParams.get('size') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz QR isteği.',
        },
        { status: 400 },
      )
    }

    if (!isAllowedQrUrl(request, parsed.data.url)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'QR sadece güvenli araç linkleri için üretilebilir.',
        },
        { status: 400 },
      )
    }

    await assertFeatureAccess({
      galleryId: session.galleryId,
      ownerEmail: session.email,
      feature: 'qr.generate',
    })

    // High error correction (30% recovery) so the centred brand badge never
    // breaks scannability.
    const baseSvg = await QRCode.toString(parsed.data.url, {
      type: 'svg',
      width: parsed.data.size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
    const svg = injectBrandBadge(baseSvg)

    return new Response(svg, {
      status: 200,
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'private, max-age=300',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    const subscriptionErrorResponse = subscriptionGateErrorResponse(error)
    if (subscriptionErrorResponse) return subscriptionErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'QR görseli üretilemedi.',
      },
      { status: 500 },
    )
  }
}
