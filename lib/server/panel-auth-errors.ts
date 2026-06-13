const AUTH_CONFIG_PATTERNS = [
  'Supabase auth configuration is missing',
  'Supabase admin configuration is missing',
  'Supabase auth yapılandırması eksik',
  'Supabase admin yapılandırması eksik',
  'Session signing secret is missing',
  'Session imza anahtarı eksik',
  'Oturum imza anahtarı eksik',
  'SUPABASE_SERVICE_ROLE_KEY must be different from NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY ile aynı olamaz',
]

const INVALID_CREDENTIAL_PATTERNS = [
  'invalid login credentials',
  'invalid credentials',
  'email not confirmed',
  'invalid grant',
]

const RATE_LIMIT_PATTERNS = [
  'too many requests',
  'rate limit',
  'over request rate limit',
]

function isAuthConfigError(message: string) {
  return AUTH_CONFIG_PATTERNS.some((pattern) => message.includes(pattern))
}

function matchesAny(message: string, patterns: string[]) {
  const normalized = message.toLowerCase()
  return patterns.some((pattern) => normalized.includes(pattern))
}

export function mapPanelAuthError(input: {
  error: unknown
  fallbackMessage: string
  defaultStatus: number
}) {
  if (!(input.error instanceof Error)) {
    return {
      status: input.defaultStatus,
      message: input.fallbackMessage,
    }
  }

  const message = input.error.message?.trim() || input.fallbackMessage
  if (isAuthConfigError(message)) {
    return {
      status: 503,
      message: 'Kimlik doğrulama servisi geçici olarak hazır değil. Lütfen daha sonra tekrar deneyin.',
    }
  }

  if (matchesAny(message, INVALID_CREDENTIAL_PATTERNS)) {
    return {
      status: 401,
      message: 'E-posta veya şifre hatalı. Bilgileri kontrol edip tekrar deneyin.',
    }
  }

  if (matchesAny(message, RATE_LIMIT_PATTERNS)) {
    return {
      status: 429,
      message: 'Çok fazla deneme yapıldı. Lütfen kısa süre sonra tekrar deneyin.',
    }
  }

  return {
    status: input.defaultStatus,
    message,
  }
}
