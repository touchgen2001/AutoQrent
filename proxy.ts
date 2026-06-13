import { NextResponse, type NextRequest } from 'next/server'

import {
  DEMO_SHOWROOM_SLUG,
  DEMO_VEHICLE_ROUTE_ID,
  isDemoShowroomSlug,
  isDemoVehicleRouteId,
} from '@/lib/demo-public-experience'
import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'

function isAllowedPublicVehicleSlug(slug: string) {
  return hasSecurePublicRouteToken(slug) || isDemoVehicleRouteId(slug)
}

function isAllowedPublicShowroomSlug(slug: string) {
  return hasSecurePublicRouteToken(slug) || isDemoShowroomSlug(slug)
}

function notFoundResponse() {
  return new NextResponse('Sayfa bulunamadı.', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}

function safeDecodeSlug(value: string) {
  try {
    return decodeURIComponent(value).trim().toLowerCase()
  } catch {
    return ''
  }
}

async function publicRouteExists(scope: 'arac' | 'showroom', slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return true

  const table = scope === 'arac' ? 'vehicles' : 'galleries'
  const url = new URL(`/rest/v1/${table}`, supabaseUrl)
  url.searchParams.set('select', 'id')
  url.searchParams.set('slug', `eq.${slug}`)
  url.searchParams.set('limit', '1')
  if (scope === 'arac') {
    url.searchParams.set('status', 'eq.active')
    url.searchParams.set('deleted_at', 'is.null')
  }

  try {
    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) return true
    const rows = await response.json() as Array<{ id?: string }>
    return rows.length > 0
  } catch {
    // A temporary database problem must not turn every valid QR into a 404.
    return true
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const [, scope, rawSlug, extraSegment] = pathname.split('/')

  if (!rawSlug || extraSegment) return NextResponse.next()

  const slug = safeDecodeSlug(rawSlug)

  if (scope === 'arac' && !isAllowedPublicVehicleSlug(slug)) {
    return notFoundResponse()
  }

  if (scope === 'showroom' && !isAllowedPublicShowroomSlug(slug)) {
    return notFoundResponse()
  }

  if (
    (scope === 'arac' || scope === 'showroom')
    && !isDemoVehicleRouteId(slug)
    && !isDemoShowroomSlug(slug)
    && !(await publicRouteExists(scope, slug))
  ) {
    return notFoundResponse()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/arac/:path*',
    '/showroom/:path*',
  ],
}

// Keep the demo route constants visible to the contract scripts that assert the
// long, tokenized demo URLs remain the only public demo bypasses.
void DEMO_SHOWROOM_SLUG
void DEMO_VEHICLE_ROUTE_ID
