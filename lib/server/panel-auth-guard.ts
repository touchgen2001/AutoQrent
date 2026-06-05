import { NextResponse } from 'next/server'

import { trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { readPanelSessionFromRequest, verifyPanelSessionUser, type PanelSession } from '@/lib/server/panel-auth'

export class PanelAuthError extends Error {
  constructor(message = 'Panel oturumu geçersiz veya süresi dolmuş.') {
    super(message)
    this.name = 'PanelAuthError'
  }
}

export class PanelForbiddenError extends Error {
  constructor(message = 'Bu panel işlemi güvenlik nedeniyle engellendi.') {
    super(message)
    this.name = 'PanelForbiddenError'
  }
}

export async function requirePanelSessionOrThrow(request: Request): Promise<PanelSession> {
  if (trustedMutationOriginResponse(request)) {
    throw new PanelForbiddenError()
  }

  const session = readPanelSessionFromRequest(request)
  if (!session) {
    throw new PanelAuthError()
  }

  try {
    await verifyPanelSessionUser(session)
  } catch (error) {
    throw new PanelAuthError(error instanceof Error ? error.message : undefined)
  }

  return session
}

export function panelAuthErrorResponse(error: unknown) {
  if (error instanceof PanelForbiddenError) {
    return NextResponse.json(
      {
        ok: false,
        error: 'panel_forbidden',
        message: error.message,
      },
      { status: 403 },
    )
  }

  if (error instanceof PanelAuthError) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message,
      },
      { status: 401 },
    )
  }

  return null
}
