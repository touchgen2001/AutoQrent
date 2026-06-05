import { NextResponse } from 'next/server'

import { trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { clearAdminSessionCookie } from '@/lib/server/admin-auth'

export async function POST(request: Request) {
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const response = NextResponse.json({
    ok: true,
  })

  clearAdminSessionCookie(response)
  return response
}
