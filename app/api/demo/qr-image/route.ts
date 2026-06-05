import QRCode from 'qrcode'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { DEMO_SHOWROOM_SLUG, isDemoVehicleRouteId } from '@/lib/demo-public-experience'

export const runtime = 'nodejs'

const querySchema = z.object({
  url: z.string().trim().url('Gecersiz demo QR linki.').max(512, 'Demo QR linki cok uzun.'),
  size: z.coerce.number().int().min(96).max(512).default(220),
})

function isAllowedDemoQrUrl(value: string) {
  try {
    const parsed = new URL(value)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const routeId = segments.length === 2 && segments[0] === 'arac'
      ? decodeURIComponent(segments[1] || '').trim().toLowerCase()
      : ''

    return (
      isDemoVehicleRouteId(routeId)
      && parsed.searchParams.get('src') === 'qr'
      && parsed.searchParams.get('ref') === DEMO_SHOWROOM_SLUG
    )
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    url: url.searchParams.get('url') || '',
    size: url.searchParams.get('size') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Gecersiz demo QR istegi.',
      },
      { status: 400 },
    )
  }

  if (!isAllowedDemoQrUrl(parsed.data.url)) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Demo QR sadece demo arac linki icin uretilebilir.',
      },
      { status: 400 },
    )
  }

  const svg = await QRCode.toString(parsed.data.url, {
    type: 'svg',
    width: parsed.data.size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
      'x-content-type-options': 'nosniff',
    },
  })
}

