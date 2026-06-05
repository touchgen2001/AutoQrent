const PLACEHOLDER_TOKEN_REGEX = /^(ornek|örnek|example|test|dummy|deneme|xxx+)$/i
const PLACEHOLDER_DOMAIN_REGEX = /(^|\.)(ornek|örnek|example|test|dummy|demo)(\.|$)/i

type GuardField = {
  label: string
  value?: string | null
}

function toTrimmedValue(value?: string | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export function containsPlaceholderText(value: string) {
  return PLACEHOLDER_TOKEN_REGEX.test(value)
}

export function hasPlaceholderHostname(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    return hasPlaceholderDomain(url.hostname)
  } catch {
    return false
  }
}

export function hasPlaceholderDomain(domain: string) {
  return PLACEHOLDER_DOMAIN_REGEX.test(domain.trim().toLowerCase())
}

export function hasPlaceholderEmailDomain(email: string) {
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1)
  return hasPlaceholderDomain(domain)
}

export function findPlaceholderTextField(fields: GuardField[]) {
  return fields.find((field) => {
    const value = toTrimmedValue(field.value)
    return value ? containsPlaceholderText(value) : false
  }) || null
}

export function findPlaceholderUrlField(fields: GuardField[]) {
  return fields.find((field) => {
    const value = toTrimmedValue(field.value)
    return value ? hasPlaceholderHostname(value) : false
  }) || null
}
