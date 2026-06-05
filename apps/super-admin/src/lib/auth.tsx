import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { type AdminRole, adminRoles, roleLabels } from '@/lib/rbac'

const SESSION_STORAGE_KEY = 'cebindegaleri_super_admin_session_v1'

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
  login: (input: { email: string; password: string }) => Promise<LoginResult>
  logout: () => void
  switchRoleForPreview: (role: AdminRole) => void
}

type AdminApiSession = {
  username: string
  adminRole?: AdminRole
  source?: 'env' | 'database'
  accountId?: string | null
  issuedAt: string
  expiresAt: string
}

const seededAdmins: AdminUser[] = [
  {
    id: 'super-admin',
    name: 'Cebindegaleri Süper Admin',
    email: 'super.admin@cebindegaleri.local',
    username: 'admin',
    role: 'SUPER_ADMIN',
  },
  {
    id: 'platform-admin',
    name: 'Platform Yöneticisi',
    email: 'platform.admin@cebindegaleri.local',
    username: 'platform',
    role: 'PLATFORM_ADMIN',
  },
  {
    id: 'support-agent',
    name: 'Destek Uzmanı',
    email: 'support.agent@cebindegaleri.local',
    username: 'support',
    role: 'SUPPORT_AGENT',
  },
  {
    id: 'finance-admin',
    name: 'Finans Yöneticisi',
    email: 'finance.admin@cebindegaleri.local',
    username: 'finance',
    role: 'FINANCE_ADMIN',
  },
]

const rolePasswordEnv: Record<AdminRole, string | undefined> = {
  SUPER_ADMIN: import.meta.env.VITE_SUPER_ADMIN_PASSWORD,
  PLATFORM_ADMIN: import.meta.env.VITE_PLATFORM_ADMIN_PASSWORD,
  SUPPORT_AGENT: import.meta.env.VITE_SUPPORT_AGENT_PASSWORD,
  FINANCE_ADMIN: import.meta.env.VITE_FINANCE_ADMIN_PASSWORD,
}

function getLocalShellPassword(role: AdminRole) {
  return rolePasswordEnv[role] || '608528'
}

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AdminSession
    if (!parsed.user?.email || !adminRoles.includes(parsed.user.role)) return null
    return parsed
  } catch {
    return null
  }
}

function persistSession(session: AdminSession | null) {
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

function resolveSeededAdmin(email: string) {
  const normalized = email.trim().toLowerCase()
  return seededAdmins.find((admin) => admin.email === normalized || admin.username === normalized) || null
}

function resolveAdminApiUsername(value: string) {
  const normalized = value.trim().toLowerCase()
  const admin = resolveSeededAdmin(normalized)
  if (admin) return admin.username
  return normalized.includes('@') ? 'admin' : normalized
}

function buildSessionFromApi(apiSession: AdminApiSession, fallbackInput: string): AdminSession {
  const role = adminRoles.includes(apiSession.adminRole as AdminRole) ? (apiSession.adminRole as AdminRole) : 'SUPER_ADMIN'
  const seeded = seededAdmins.find((admin) => admin.role === role)
  const username = apiSession.username || fallbackInput.trim().toLowerCase()

  return {
    user: {
      id: apiSession.accountId || `admin-${username}`,
      name: apiSession.source === 'database' ? username : seeded?.name || roleLabels[role],
      email: apiSession.source === 'database' ? `${username}@admin.cebindegaleri.local` : seeded?.email || 'admin@cebindegaleri.local',
      username,
      role,
    },
    issuedAt: apiSession.issuedAt,
  }
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
  return buildSessionFromApi(payload.session, input.usernameOrEmail)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => readStoredSession())

  const login = useCallback(async (input: { email: string; password: string }): Promise<LoginResult> => {
    const email = input.email.trim().toLowerCase()
    const password = input.password.trim()
    if (!email || !password) {
      return {
        ok: false,
        error: 'missing_credentials',
      }
    }

    const admin = resolveSeededAdmin(email)

    const apiSession = await loginAdminApi({ usernameOrEmail: email, password })
    if (apiSession) {
      const nextSession = admin && apiSession.user.username === 'admin' ? { ...apiSession, user: admin } : apiSession
      setSession(nextSession)
      persistSession(nextSession)

      return {
        ok: true,
        session: nextSession,
      }
    }

    if (import.meta.env.PROD || !admin || password !== getLocalShellPassword(admin.role)) {
      return {
        ok: false,
        error: 'invalid_credentials',
      }
    }

    const nextSession = {
      user: admin,
      issuedAt: new Date().toISOString(),
    }
    setSession(nextSession)
    persistSession(nextSession)

    return {
      ok: true,
      session: nextSession,
    }
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    persistSession(null)
  }, [])

  const switchRoleForPreview = useCallback((role: AdminRole) => {
    setSession((current) => {
      if (!current) return current

      const nextSession = {
        ...current,
        user: {
          ...current.user,
          role,
          name: roleLabels[role],
        },
        issuedAt: new Date().toISOString(),
      }
      persistSession(nextSession)
      return nextSession
    })
  }, [])

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
      switchRoleForPreview,
    }),
    [login, logout, session, switchRoleForPreview],
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

export function getSeededAdmins() {
  return seededAdmins
}
