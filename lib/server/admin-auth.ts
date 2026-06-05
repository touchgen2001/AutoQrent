import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const ADMIN_SESSION_COOKIE_NAME = 'autoqrent_admin_session'

const SESSION_VERSION = 1
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8
const HEX_SHA256_PATTERN = /^[a-f0-9]{64}$/i

export type PlatformAdminRole = 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'SUPPORT_AGENT' | 'FINANCE_ADMIN'
export type AdminSessionSource = 'env' | 'database'

type AdminSessionCookiePayload = {
  v: number
  username: string
  role: 'admin'
  adminRole?: PlatformAdminRole
  source?: AdminSessionSource
  accountId?: string | null
  sessionRevokedAt?: string | null
  issuedAt: string
  expiresAt: string
}

export type AdminSession = {
  username: string
  role: 'admin'
  adminRole: PlatformAdminRole
  source: AdminSessionSource
  accountId: string | null
  sessionRevokedAt: string | null
  issuedAt: string
  expiresAt: string
}

type CreateAdminSessionOptions = {
  adminRole?: PlatformAdminRole
  source?: AdminSessionSource
  accountId?: string | null
  sessionRevokedAt?: string | null
}

type AdminCredentialInput = {
  username: string
  password: string
}

export type AdminCredentialResult =
  | {
      ok: true
      username: string
    }
  | {
      ok: false
      reason: 'invalid_credentials' | 'admin_auth_not_configured'
    }

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function getExpectedAdminUsername() {
  return normalizeUsername(process.env.ADMIN_USERNAME || 'admin')
}

function getAdminPasswordHash() {
  const value = (process.env.ADMIN_PASSWORD_SHA256 || '').trim()
  if (!HEX_SHA256_PATTERN.test(value)) return null
  return value.toLowerCase()
}

function getSessionSigningSecret() {
  return process.env.ADMIN_SESSION_SECRET || null
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function signSessionValue(payloadBase64: string, mode: 'strict' | 'soft' = 'soft') {
  const secret = getSessionSigningSecret()
  if (!secret) {
    if (mode === 'strict') {
      throw new Error('Admin oturum imza anahtarı eksik. ADMIN_SESSION_SECRET ayarlayın.')
    }
    return null
  }

  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

function encodeSessionCookie(payload: AdminSessionCookiePayload) {
  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = signSessionValue(payloadBase64, 'strict')
  if (!signature) {
    throw new Error('Admin oturum imzası oluşturulamadı.')
  }
  return `${payloadBase64}.${signature}`
}

function decodeSessionCookie(rawCookieValue: string | null | undefined): AdminSessionCookiePayload | null {
  if (!rawCookieValue) return null

  const [payloadBase64, signature] = rawCookieValue.split('.')
  if (!payloadBase64 || !signature) return null

  const expected = signSessionValue(payloadBase64, 'soft')
  if (!expected || !safeEqual(expected, signature)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(payloadBase64)) as AdminSessionCookiePayload
    const source = parsed.source || 'env'
    if (parsed.v !== SESSION_VERSION || parsed.role !== 'admin') {
      return null
    }

    if (source === 'env' && parsed.username !== getExpectedAdminUsername()) {
      return null
    }

    if (source === 'database' && !parsed.accountId) {
      return null
    }

    const expiresAt = Date.parse(parsed.expiresAt)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function parseCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null

  const chunks = cookieHeader.split(';')
  for (const chunk of chunks) {
    const [rawName, ...rest] = chunk.trim().split('=')
    if (rawName !== name) continue
    return decodeURIComponent(rest.join('='))
  }

  return null
}

export function verifyAdminCredentials(input: AdminCredentialInput): AdminCredentialResult {
  const expectedPasswordHash = getAdminPasswordHash()
  if (!expectedPasswordHash) {
    return {
      ok: false,
      reason: 'admin_auth_not_configured',
    }
  }

  const expectedUsername = getExpectedAdminUsername()
  const normalizedUsername = normalizeUsername(input.username)
  const passwordHash = createHash('sha256').update(input.password).digest('hex')

  if (!safeEqual(normalizedUsername, expectedUsername) || !safeEqual(passwordHash, expectedPasswordHash)) {
    return {
      ok: false,
      reason: 'invalid_credentials',
    }
  }

  return {
    ok: true,
    username: expectedUsername,
  }
}

export function createAdminSession(username: string, options: CreateAdminSessionOptions = {}): AdminSession {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000)

  return {
    username: normalizeUsername(username),
    role: 'admin',
    adminRole: options.adminRole || 'SUPER_ADMIN',
    source: options.source || 'env',
    accountId: options.accountId || null,
    sessionRevokedAt: options.sessionRevokedAt || null,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
}

export function setAdminSessionCookie(response: NextResponse, session: AdminSession) {
  const cookieValue = encodeSessionCookie({
    v: SESSION_VERSION,
    username: session.username,
    role: session.role,
    adminRole: session.adminRole,
    source: session.source,
    accountId: session.accountId,
    sessionRevokedAt: session.sessionRevokedAt,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  })

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function readAdminSessionFromCookieHeader(cookieHeader: string | null): AdminSession | null {
  const cookieValue = parseCookieValue(cookieHeader, ADMIN_SESSION_COOKIE_NAME)
  const payload = decodeSessionCookie(cookieValue)
  if (!payload) return null

  return {
    username: payload.username,
    role: payload.role,
    adminRole: payload.adminRole || 'SUPER_ADMIN',
    source: payload.source || 'env',
    accountId: payload.accountId || null,
    sessionRevokedAt: payload.sessionRevokedAt || null,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  }
}

export function readAdminSessionFromRequest(request: Request): AdminSession | null {
  return readAdminSessionFromCookieHeader(request.headers.get('cookie'))
}
