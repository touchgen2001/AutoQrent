import { NextResponse } from 'next/server'

import { trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { readAdminSessionFromRequest, type AdminSession, type PlatformAdminRole } from '@/lib/server/admin-auth'

export class AdminRouteAuthError extends Error {
  constructor(message = 'Admin oturumu gerekli.') {
    super(message)
    this.name = 'AdminRouteAuthError'
  }
}

export class AdminRouteForbiddenError extends Error {
  constructor(message = 'Bu admin işlemi için yetki yetersiz.') {
    super(message)
    this.name = 'AdminRouteForbiddenError'
  }
}

export function requireAdminSessionOrThrow(request: Request): AdminSession {
  if (trustedMutationOriginResponse(request)) {
    throw new AdminRouteForbiddenError('Bu admin isteği güvenlik nedeniyle engellendi.')
  }

  const session = readAdminSessionFromRequest(request)
  if (!session) {
    throw new AdminRouteAuthError()
  }

  return session
}

export function requireAdminRoleOrThrow(request: Request, allowedRoles: PlatformAdminRole[]): AdminSession {
  const session = requireAdminSessionOrThrow(request)
  if (!allowedRoles.includes(session.adminRole)) {
    throw new AdminRouteForbiddenError()
  }

  return session
}

export function adminRouteErrorResponse(error: unknown) {
  if (error instanceof AdminRouteAuthError) {
    return NextResponse.json(
      {
        ok: false,
        error: 'admin_session_required',
      },
      { status: 401 },
    )
  }

  if (error instanceof AdminRouteForbiddenError) {
    return NextResponse.json(
      {
        ok: false,
        error: 'admin_forbidden',
        message: error.message,
      },
      { status: 403 },
    )
  }

  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : 'admin_action_failed',
    },
    { status: 400 },
  )
}
