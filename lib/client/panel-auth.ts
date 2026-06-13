export type PanelClientSession = {
  userId: string
  email: string
  fullName: string
  galleryId: string
  galleryName: string
  role: 'owner' | 'sales' | 'viewer'
  expiresAt: string
}

type SessionApiResponse = {
  ok: boolean
  message?: string
  session?: PanelClientSession
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export async function getPanelAuthSession() {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })

    const data = await parseResponse<SessionApiResponse>(response)
    if (!response.ok || !data.ok || !data.session) return null
    return data.session
  } catch {
    return null
  }
}

export async function hasActivePanelSession() {
  const session = await getPanelAuthSession()
  return Boolean(session)
}

export async function registerPanelUser(input: {
  galleryName: string
  fullName: string
  email: string
  phone: string
  password: string
  planCode?: 'starter' | 'pro' | 'premium' | 'enterprise'
  billingInterval?: 'monthly' | 'yearly'
}) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = await parseResponse<SessionApiResponse>(response)
    if (!response.ok || !data.ok || !data.session) {
      return {
        ok: false as const,
        message: data.message || 'Kayıt işlemi tamamlanamadı.',
      }
    }

    return {
      ok: true as const,
      session: data.session,
    }
  } catch {
    return {
      ok: false as const,
      message: 'Ağ hatası nedeniyle kayıt işlemi tamamlanamadı.',
    }
  }
}

export async function loginPanelUser(input: { email: string; password: string }) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = await parseResponse<SessionApiResponse>(response)
    if (!response.ok || !data.ok || !data.session) {
      return {
        ok: false as const,
        message: data.message || 'E-posta veya şifre hatalı.',
      }
    }

    return {
      ok: true as const,
      session: data.session,
    }
  } catch {
    return {
      ok: false as const,
      message: 'Ağ hatası nedeniyle giriş yapılamadı.',
    }
  }
}

export async function requestPanelPasswordReset(input: { email: string }) {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = await parseResponse<{ ok?: boolean; message?: string }>(response)

    if (!response.ok || !data.ok) {
      return {
        ok: false as const,
        message: data.message || 'Şifre sıfırlama isteği gönderilemedi.',
      }
    }

    return {
      ok: true as const,
      message: data.message || 'Şifre sıfırlama bağlantısı gönderildi.',
    }
  } catch {
    return {
      ok: false as const,
      message: 'Ağ hatası nedeniyle şifre sıfırlama isteği gönderilemedi.',
    }
  }
}

export async function clearPanelAuthSession() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // best effort logout
  }
}
