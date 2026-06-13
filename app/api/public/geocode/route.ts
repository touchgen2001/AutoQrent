import { NextResponse } from 'next/server'
import { z } from 'zod'

import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'

export const runtime = 'nodejs'

const requestSchema = z.object({
  query: z.string().trim().min(5, 'Adres en az 5 karakter olmalıdır.').max(240),
})

type NominatimSearchItem = {
  lat?: string
  lon?: string
  display_name?: string
}

function toNumber(value: string | undefined) {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isCoordinatePairValid(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  try {
    const ip = getClientIp(request)
    const rate = await checkRateLimit({
      key: `public-geocode:${ip}`,
      limit: 20,
      windowMs: 5 * 60 * 1000,
    })

    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Çok fazla konum isteği gönderdiniz. Lütfen biraz bekleyin.',
        },
        {
          status: 429,
          headers: {
            'retry-after': String(rate.retryAfterSeconds),
          },
        },
      )
    }

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz adres sorgusu.',
        },
        { status: 400 },
      )
    }

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
    nominatimUrl.searchParams.set('q', parsed.data.query)
    nominatimUrl.searchParams.set('format', 'jsonv2')
    nominatimUrl.searchParams.set('limit', '1')
    nominatimUrl.searchParams.set('countrycodes', 'tr')
    nominatimUrl.searchParams.set('addressdetails', '0')

    const response = await fetch(nominatimUrl, {
      method: 'GET',
      headers: {
        'accept-language': 'tr',
        'user-agent': 'Cebindegaleri/1.0 (support@cebindegaleri.com)',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Konum doğrulama isteği başarısız oldu: ${response.status}`)
    }

    const items = (await response.json()) as NominatimSearchItem[]
    const firstItem = items[0]

    const lat = toNumber(firstItem?.lat)
    const lng = toNumber(firstItem?.lon)

    if (lat === null || lng === null || !isCoordinatePairValid(lat, lng)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Bu adres için koordinat bulunamadı.',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      item: {
        latitude: lat,
        longitude: lng,
        displayName: firstItem?.display_name || parsed.data.query,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Konum sorgusu yapılamadı.',
      },
      { status: 500 },
    )
  }
}
