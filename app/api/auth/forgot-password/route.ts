import { NextResponse } from 'next/server'
import { z } from 'zod'

import { trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { sendPasswordRecoveryEmail } from '@/lib/server/panel-auth'
import { mapPanelAuthError } from '@/lib/server/panel-auth-errors'

export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin.'),
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
          message: parsed.error.issues[0]?.message ?? 'Geçersiz e-posta adresi.',
        },
        { status: 400 },
      )
    }

    await sendPasswordRecoveryEmail(parsed.data.email)

    return NextResponse.json({
      ok: true,
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
    })
  } catch (error) {
    const mapped = mapPanelAuthError({
      error,
      fallbackMessage: 'Şifre sıfırlama isteği gönderilemedi.',
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
