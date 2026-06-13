import { NextResponse } from 'next/server'

import {
  clearPanelSessionCookie,
  readPanelSessionFromRequest,
  refreshPanelSession,
  setPanelSessionCookie,
} from '@/lib/server/panel-auth'

export const runtime = 'nodejs'

const REFRESH_THRESHOLD_MS = 2 * 60 * 1000

export async function GET(request: Request) {
  try {
    const session = readPanelSessionFromRequest(request)
    if (!session) {
      const response = NextResponse.json(
        {
          ok: false,
          message: 'Oturum bulunamadı.',
        },
        { status: 401 },
      )
      clearPanelSessionCookie(response)
      return response
    }

    const expiresAtMs = Date.parse(session.expiresAt)
    const needsRefresh = Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() <= REFRESH_THRESHOLD_MS

    if (needsRefresh) {
      const refreshed = await refreshPanelSession({
        refreshToken: session.refreshToken,
        previous: session,
      })

      const response = NextResponse.json({
        ok: true,
        session: {
          userId: refreshed.userId,
          email: refreshed.email,
          fullName: refreshed.fullName,
          galleryId: refreshed.galleryId,
          galleryName: refreshed.galleryName,
          role: refreshed.role,
          expiresAt: refreshed.expiresAt,
        },
      })

      setPanelSessionCookie(response, refreshed)
      return response
    }

    return NextResponse.json({
      ok: true,
      session: {
        userId: session.userId,
        email: session.email,
        fullName: session.fullName,
        galleryId: session.galleryId,
        galleryName: session.galleryName,
        role: session.role,
        expiresAt: session.expiresAt,
      },
    })
  } catch {
    const response = NextResponse.json(
      {
        ok: false,
        message: 'Oturum doğrulanamadı.',
      },
      { status: 401 },
    )
    clearPanelSessionCookie(response)
    return response
  }
}
