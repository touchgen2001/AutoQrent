import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { type AdminRole, adminRoles, roleLabels } from '@/lib/rbac'

export type AdminUser = {
  id: string
  name: string
  email: string
  username: string
  role: AdminRole
}

export type AdminSession = {
  user: AdminUser
  issuedAt: string
}

export type LoginResult =
  | {
      ok: true
      session: AdminSession
    }
  | {
      ok: false
      error: 'invalid_credentials' | 'missing_credentials'
    }

type AuthContextValue = {
  session: AdminSession | null
  isLoading: boolean
  login: (input: { email: string; password: string }) => Promise<LoginResult>
  logout: () => Promise<void>
}

type AdminApiSession = {
  username: string
  adminRole?: AdminRole
  source?: 'env' | 'database'
  accountId?: string | null
  issuedAt: string
  expiresAt: string
}

function resolveAdminApiUsername(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized.includes('@') ? normalized.split('@')[0] || normalized : normalized
}

function buildSessionFromApi(apiSession: AdminApiSession): AdminSession {
  const role = adminRoles.includes(apiSession.adminRole as AdminRole) ? (apiSession.adminRole as AdminRole) : 'SUPER_ADMIN'
  const username = apiSession.username.trim().toLowerCase()

  return {
    user: {
      id: apiSession.accountId || `admin-${username}`,
      name: apiSession.source === 'database' ? username : roleLabels[role],
      email: username,
      username,
      role,
    },
    issuedAt: apiSession.issuedAt,
  }
}

async function readAdminApiSession() {
  const response = await fetch('/api/admin/session', {
    credentials: 'include',
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; session?: AdminApiSession } | null
  if (!response.ok || payload?.ok !== true || !payload.session) return null
  return buildSessionFromApi(payload.session)
}

async function loginAdminApi(input: { usernameOrEmail: string; password: string }) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: resolveAdminApiUsername(input.usernameOrEmail),
      password: input.password,
    }),
  })
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; session?: AdminApiSession } | null
  if (!response.ok || payload?.ok !== true || !payload.session) return null
  return buildSessionFromApi(payload.session)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    void readAdminApiSession()
      .then((nextSession) => {
        if (active) setSession(nextSession)
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: { email: string; password: string }): Promise<LoginResult> => {
    const email = input.email.trim().toLowerCase()
    const password = input.password
    if (!email || !password) {
      return {
        ok: false,
        error: 'missing_credentials',
      }
    }

    const nextSession = await loginAdminApi({ usernameOrEmail: email, password }).catch(() => null)
    if (!nextSession) {
      return {
        ok: false,
        error: 'invalid_credentials',
      }
    }

    setSession(nextSession)
    return {
      ok: true,
      session: nextSession,
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      login,
      logout,
    }),
    [isLoading, login, logout, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.')
  }

  return context
}
