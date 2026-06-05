import { NextResponse } from 'next/server'
import { z } from 'zod'

import { trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { registerWithSupabase, setPanelSessionCookie } from '@/lib/server/panel-auth'
import { mapPanelAuthError } from '@/lib/server/panel-auth-errors'
import { SUBSCRIPTION_PLAN_CODES } from '@/lib/subscription-plans'

export const runtime = 'nodejs'

const schema = z.object({
  galleryName: z.string().trim().min(2, 'Galeri adı en az 2 karakter olmalı.').max(120),
  fullName: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalı.').max(120),
  email: z.string().trim().email('Geçerli bir e-posta girin.'),
  phone: z.string().trim().min(10, 'Geçerli bir telefon numarası girin.').max(30),
  password: z.string().trim().min(8, 'Şifre en az 8 karakter olmalı.').max(160),
  planCode: z.enum(SUBSCRIPTION_PLAN_CODES).optional(),
})

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz kayıt bilgileri.',
        },
        { status: 400 },
      )
    }

    const session = await registerWithSupabase(parsed.data)

    const response = NextResponse.json({
      ok: true,
      session: {
        userId: session.userId,
        email: session.email,
        fullName: session.fullName,
        galleryId: session.galleryId,
        galleryName: session.galleryName,
        expiresAt: session.expiresAt,
      },
    })

    setPanelSessionCookie(response, session)
    return response
  } catch (error) {
    const mapped = mapPanelAuthError({
      error,
      fallbackMessage: 'Kayıt oluşturulamadı.',
      defaultStatus: 400,
    })

    return NextResponse.json(
      {
        ok: false,
        message: mapped.message,
      },
      { status: mapped.status },
    )
  }
}
