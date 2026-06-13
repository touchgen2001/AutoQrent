import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import { checkRateLimit, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import {
  createPublicGalleryReview,
  listPublicGalleryReviews,
} from '@/lib/server/panel-operations-repository'

export const runtime = 'nodejs'

const querySchema = z.object({ gallerySlug: z.string().trim().refine(hasSecurePublicRouteToken) })
const createSchema = querySchema.extend({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1200),
  website: z.string().trim().max(120).optional(),
})

export async function GET(request: Request) {
  const parsed = querySchema.safeParse({ gallerySlug: new URL(request.url).searchParams.get('gallerySlug') })
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Galeri kimliği geçersiz.' }, { status: 400 })
  return NextResponse.json({ ok: true, ...(await listPublicGalleryReviews(parsed.data.gallerySlug)) })
}

export async function POST(request: Request) {
  const blocked = trustedMutationOriginResponse(request)
  if (blocked) return blocked
  const ip = getClientIp(request)
  const rate = await checkRateLimit({ key: `public-review:${ip}`, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
  if (!rate.allowed) return NextResponse.json({ ok: false, message: 'Bugün için yorum gönderme limitine ulaştınız.' }, { status: 429 })

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || 'Yorum geçersiz.' }, { status: 400 })
  if (parsed.data.website) return NextResponse.json({ ok: true, message: 'Yorumunuz incelemeye alındı.' })

  await createPublicGalleryReview(parsed.data)
  return NextResponse.json({ ok: true, message: 'Yorumunuz galeri onayından sonra yayınlanacaktır.' })
}

