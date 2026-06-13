import { randomBytes } from 'node:crypto'

export const PUBLIC_ROUTE_TOKEN_BYTES = 16
export const PUBLIC_ROUTE_TOKEN_HEX_LENGTH = PUBLIC_ROUTE_TOKEN_BYTES * 2
export const MAX_PUBLIC_ROUTE_SLUG_LENGTH = 120

const SECURE_TOKEN_SUFFIX_PATTERN = new RegExp(`-[a-f0-9]{${PUBLIC_ROUTE_TOKEN_HEX_LENGTH}}$`)
const SAFE_PUBLIC_SLUG_PATTERN = /^[a-z0-9-]+$/

export function createPublicRouteToken(bytes = PUBLIC_ROUTE_TOKEN_BYTES) {
  return randomBytes(bytes).toString('hex')
}

export function hasSecurePublicRouteToken(value: string) {
  const normalized = value.trim().toLowerCase()
  return (
    normalized.length <= MAX_PUBLIC_ROUTE_SLUG_LENGTH
    && SAFE_PUBLIC_SLUG_PATTERN.test(normalized)
    && SECURE_TOKEN_SUFFIX_PATTERN.test(normalized)
  )
}

export function slugifyPublicRouteBase(input: string, fallback = 'link') {
  const fallbackBase = fallback
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'link'

  const normalized = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || fallbackBase

  const maxBaseLength = Math.max(
    MAX_PUBLIC_ROUTE_SLUG_LENGTH - PUBLIC_ROUTE_TOKEN_HEX_LENGTH - 1,
    1,
  )
  const trimmed = normalized.slice(0, maxBaseLength).replace(/-+$/g, '')

  return trimmed || fallbackBase.slice(0, maxBaseLength) || 'link'
}

export function buildSecurePublicSlug(input: string, fallback = 'link') {
  return `${slugifyPublicRouteBase(input, fallback)}-${createPublicRouteToken()}`
}

export function ensureSecurePublicSlug(input: string, fallback = 'link') {
  const normalized = input.trim().toLowerCase()
  if (hasSecurePublicRouteToken(normalized)) return normalized
  return buildSecurePublicSlug(input, fallback)
}
