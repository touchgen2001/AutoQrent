type SupabaseMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

type SupabaseFetchOptions = {
  method?: SupabaseMethod
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  prefer?: string
}

function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  if (serviceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY ile aynı olamaz.')
  }

  return {
    url: url.replace(/\/$/, ''),
    serviceRoleKey,
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${baseUrl}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  return url
}

export function hasSupabaseAdmin() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL))
}

export function requireSupabaseAdminConfig() {
  if (!hasSupabaseAdmin()) {
    throw new Error(
      'Supabase admin yapılandırması eksik. SUPABASE_URL (veya NEXT_PUBLIC_SUPABASE_URL) ve SUPABASE_SERVICE_ROLE_KEY ayarlayın.',
    )
  }
}

export async function supabaseAdminFetch<T>({
  method = 'GET',
  path,
  query,
  body,
  prefer,
}: SupabaseFetchOptions): Promise<T> {
  const config = getSupabaseAdminConfig()
  if (!config) {
    throw new Error('Supabase admin yapılandırması eksik.')
  }

  const url = buildUrl(config.url, path, query)
  const response = await fetch(url, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(text || `Supabase isteği başarısız oldu: ${response.status}`)
  }

  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}
