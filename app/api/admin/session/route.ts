import { NextResponse } from 'next/server'

import { readAdminSessionFromRequest } from '@/lib/server/admin-auth'

export async function GET(request: Request) {
  const session = readAdminSessionFromRequest(request)

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: 'admin_session_required',
      },
      { status: 401 },
    )
  }

  return NextResponse.json({
    ok: true,
    session,
  })
}
