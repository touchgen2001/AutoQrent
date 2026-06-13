import { NextResponse } from 'next/server'

import { trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { clearPanelSessionCookie } from '@/lib/server/panel-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const response = NextResponse.json({ ok: true })
  clearPanelSessionCookie(response)
  return response
}
