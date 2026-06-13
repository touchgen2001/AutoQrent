export type AdminAuthSession = {
  username: string
  role: 'admin'
  issuedAt: string
  expiresAt: string
}

type AdminAuthResponse =
  | {
      ok: true
      session: AdminAuthSession
    }
  | {
      ok: false
      error?: string
      retryAfterSeconds?: number
    }

async function parseAdminAuthResponse(response: Response): Promise<AdminAuthResponse> {
  const payload = (await response.json().catch(() => null)) as AdminAuthResponse | null
  if (payload) return payload

  return {
    ok: false,
    error: response.ok ? 'empty_response' : 'request_failed',
  }
}

export async function getAdminAuthSession(): Promise<AdminAuthSession | null> {
  const response = await fetch('/api/admin/session', {
    cache: 'no-store',
  })

  if (!response.ok) return null

  const payload = await parseAdminAuthResponse(response)
  return payload.ok ? payload.session : null
}

export async function loginAdminUser(input: {
  username: string
  password: string
}): Promise<AdminAuthResponse> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseAdminAuthResponse(response)
}

export async function clearAdminAuthSession() {
  await fetch('/api/admin/logout', {
    method: 'POST',
  })
}
