import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { buildSecurePublicSlug } from '@/lib/security/public-route-token'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { ensureTrialSubscriptionForGallery } from '@/lib/server/subscription-repository'
import { isSubscriptionPlanCode, type SubscriptionPlanCode } from '@/lib/subscription-plans'

export const PANEL_SESSION_COOKIE_NAME = 'autoqrent_panel_session'

const SESSION_VERSION = 1
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const ENCRYPTED_SESSION_COOKIE_VERSION = 'v2'
const SESSION_COOKIE_IV_BYTES = 12
const SESSION_COOKIE_AAD = Buffer.from('autoqrent_panel_session:v2', 'utf8')

type SupabaseAuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
}

type SupabaseAuthSession = {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  user?: SupabaseAuthUser
}

type SupabaseSignInResponse = {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  user?: SupabaseAuthUser
}

type SupabaseAdminCreateUserResponse = {
  id?: string
  email?: string
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
  user?: SupabaseAuthUser
}

type SupabaseAdminUserResponse =
  | {
      user?: SupabaseAuthUser
    }
  | SupabaseAuthUser

type GalleryRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  owner_email: string | null
}

type PanelSessionCookiePayload = {
  v: number
  userId: string
  email: string
  fullName: string
  galleryId: string
  galleryName: string
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type PanelSession = {
  userId: string
  email: string
  fullName: string
  galleryId: string
  galleryName: string
  accessToken: string
  refreshToken: string
  expiresAt: string
}

type RegisterInput = {
  galleryName: string
  fullName: string
  email: string
  phone: string
  password: string
  planCode?: SubscriptionPlanCode
}

type LoginInput = {
  email: string
  password: string
}

function toBase64Url(value: Buffer) {
  return value.toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url')
}

function getSessionSigningSecret() {
  return process.env.PANEL_SESSION_SECRET || null
}

function getSessionEncryptionKey(mode: 'strict' | 'soft' = 'soft') {
  const secret = getSessionSigningSecret()
  if (!secret) {
    if (mode === 'strict') {
      throw new Error('Oturum şifreleme anahtarı eksik. PANEL_SESSION_SECRET ayarlayın.')
    }
    return null
  }

  return createHash('sha256').update(`panel-session-cookie:${secret}`).digest()
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function getAuthAccessStatus(user: SupabaseAuthUser | null | undefined) {
  const value = user?.app_metadata?.accessStatus
  return typeof value === 'string' && value.trim() ? value.trim() : 'active'
}

function assertAuthUserCanUsePanel(user: SupabaseAuthUser | null | undefined) {
  if (getAuthAccessStatus(user) === 'suspended') {
    throw new Error('Bu hesap askıya alınmış. Panel erişimi için admin ile iletişime geçin.')
  }
}

function signSessionValue(signedValue: string, mode: 'strict' | 'soft' = 'soft') {
  const secret = getSessionSigningSecret()
  if (!secret) {
    if (mode === 'strict') {
      throw new Error('Oturum imza anahtarı eksik. PANEL_SESSION_SECRET ayarlayın.')
    }
    return null
  }

  return createHmac('sha256', secret).update(signedValue).digest('base64url')
}

function encodeSessionCookie(payload: PanelSessionCookiePayload) {
  const key = getSessionEncryptionKey('strict')
  if (!key) {
    throw new Error('Oturum şifreleme anahtarı oluşturulamadı.')
  }

  const iv = randomBytes(SESSION_COOKIE_IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(SESSION_COOKIE_AAD)

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  const envelope = [
    ENCRYPTED_SESSION_COOKIE_VERSION,
    toBase64Url(iv),
    toBase64Url(encrypted),
    toBase64Url(authTag),
  ].join('.')
  const signature = signSessionValue(envelope, 'strict')
  if (!signature) {
    throw new Error('Oturum imzası oluşturulamadı.')
  }
  return `${envelope}.${signature}`
}

function decodeSessionCookie(rawCookieValue: string | null | undefined): PanelSessionCookiePayload | null {
  if (!rawCookieValue) return null

  const [version, ivBase64, encryptedBase64, tagBase64, signature] = rawCookieValue.split('.')
  if (version !== ENCRYPTED_SESSION_COOKIE_VERSION || !ivBase64 || !encryptedBase64 || !tagBase64 || !signature) {
    return null
  }

  const envelope = [version, ivBase64, encryptedBase64, tagBase64].join('.')
  const expected = signSessionValue(envelope, 'soft')
  if (!expected || !safeEqual(expected, signature)) return null

  try {
    const key = getSessionEncryptionKey('soft')
    if (!key) return null

    const decipher = createDecipheriv('aes-256-gcm', key, fromBase64Url(ivBase64))
    decipher.setAAD(SESSION_COOKIE_AAD)
    decipher.setAuthTag(fromBase64Url(tagBase64))

    const decrypted = Buffer.concat([decipher.update(fromBase64Url(encryptedBase64)), decipher.final()])
    const parsed = JSON.parse(decrypted.toString('utf8')) as PanelSessionCookiePayload
    if (parsed.v !== SESSION_VERSION) return null
    if (!parsed.email || !parsed.userId || !parsed.galleryId || !parsed.accessToken || !parsed.refreshToken) {
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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return `9${digits}`
  return `90${digits}`
}

function isUserAlreadyRegisteredError(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('user_already_exists')
  )
}

function computeExpiresAtIso(session: SupabaseAuthSession) {
  if (typeof session.expires_at === 'number' && Number.isFinite(session.expires_at)) {
    return new Date(session.expires_at * 1000).toISOString()
  }

  if (typeof session.expires_in === 'number' && Number.isFinite(session.expires_in)) {
    return new Date(Date.now() + session.expires_in * 1000).toISOString()
  }

  return new Date(Date.now() + 60 * 60 * 1000).toISOString()
}

function getSupabaseAuthConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !anonKey) {
    throw new Error('Supabase auth yapılandırması eksik. SUPABASE_URL (veya NEXT_PUBLIC_SUPABASE_URL) ve NEXT_PUBLIC_SUPABASE_ANON_KEY ayarlayın.')
  }

  return { url, anonKey }
}

async function supabaseAuthRequest<T>(input: {
  path: string
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  accessToken?: string
}) {
  const { url, anonKey } = getSupabaseAuthConfig()

  const response = await fetch(`${url}${input.path}`, {
    method: input.method || 'GET',
    headers: {
      apikey: anonKey,
      ...(input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : {}),
      ...(input.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    cache: 'no-store',
  })

  const text = await response.text()
  const payload = text
    ? (JSON.parse(text) as
        | T
        | {
            message?: string
            msg?: string
            error_description?: string
            error?: string
            error_code?: string
          })
    : ({} as T)

  if (!response.ok) {
    const errorPayload = payload as {
      message?: string
      msg?: string
      error_description?: string
      error?: string
      error_code?: string
    }

    if (errorPayload?.error_code === 'email_address_invalid') {
      throw new Error('Geçerli bir e-posta adresi girin.')
    }

    if (errorPayload?.error_code === 'over_email_send_rate_limit') {
      throw new Error('Çok fazla e-posta isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin.')
    }

    const message =
      errorPayload?.message ||
      errorPayload?.msg ||
      errorPayload?.error_description ||
      errorPayload?.error ||
      `Kimlik doğrulama isteği başarısız oldu (${response.status}).`
    throw new Error(message)
  }

  return payload as T
}

function extractAdminAuthUser(response: SupabaseAdminUserResponse) {
  if ('user' in response && response.user) return response.user
  if ('id' in response && typeof response.id === 'string') return response
  return null
}

export async function verifyPanelSessionUser(session: PanelSession) {
  requireSupabaseAdminConfig()

  const response = await supabaseAdminFetch<SupabaseAdminUserResponse>({
    path: `/auth/v1/admin/users/${encodeURIComponent(session.userId)}`,
  })
  const user = extractAdminAuthUser(response)

  if (!user?.id) {
    throw new Error('Panel kullanıcısı bulunamadı.')
  }

  if (normalizeEmail(user.email || '') !== normalizeEmail(session.email)) {
    throw new Error('Panel oturumu kullanıcı bilgisiyle eşleşmiyor.')
  }

  assertAuthUserCanUsePanel(user)
  return user
}

async function findGalleryByOwnerEmail(ownerEmail: string) {
  const rows = await supabaseAdminFetch<GalleryRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,phone,email,owner_email',
      owner_email: `eq.${ownerEmail}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  return rows[0] || null
}

async function createGalleryForOwner(input: {
  ownerEmail: string
  galleryName: string
  phone: string
}) {
  const uniqueSlug = buildSecurePublicSlug(input.galleryName, 'galeri')

  const rows = await supabaseAdminFetch<GalleryRow[]>({
    method: 'POST',
    path: '/rest/v1/galleries',
    prefer: 'return=representation',
    body: [
      {
        name: input.galleryName,
        slug: uniqueSlug,
        phone: input.phone || null,
        email: input.ownerEmail,
        owner_email: input.ownerEmail,
      },
    ],
  })

  const row = rows[0]
  if (!row) {
    throw new Error('Galeri oluşturulamadı.')
  }

  return row
}

async function ensureOwnerGallery(input: {
  ownerEmail: string
  galleryName: string
  phone: string
}) {
  requireSupabaseAdminConfig()

  const existing = await findGalleryByOwnerEmail(input.ownerEmail)
  if (existing) return existing

  return createGalleryForOwner(input)
}

async function createConfirmedUserWithSupabaseAdmin(input: {
  email: string
  password: string
  fullName: string
  galleryName: string
  phone: string
  planCode: SubscriptionPlanCode
}): Promise<SupabaseAuthUser> {
  requireSupabaseAdminConfig()

  const created = await supabaseAdminFetch<SupabaseAdminCreateUserResponse>({
    method: 'POST',
    path: '/auth/v1/admin/users',
    body: {
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        fullName: input.fullName,
        galleryName: input.galleryName,
        phone: input.phone,
      },
      app_metadata: {
        accountRole: 'owner',
        accessStatus: 'active',
        subscriptionPlan: input.planCode,
        subscriptionStatus: 'trialing',
        subscriptionUpdatedAt: new Date().toISOString(),
      },
    },
  })

  const user = created?.user || {
    id: created?.id,
    email: created?.email,
    user_metadata: created?.user_metadata || null,
    app_metadata: created?.app_metadata || null,
  }

  if (!user?.id) {
    throw new Error('Kayıt kullanıcısı oluşturuldu ancak kimlik bilgisi alınamadı.')
  }

  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || null,
    app_metadata: user.app_metadata || null,
  }
}

function resolveFullName(input: {
  preferredFullName?: string
  user?: SupabaseAuthUser
}) {
  const preferred = input.preferredFullName?.trim()
  if (preferred) return preferred

  const metadataName = input.user?.user_metadata?.fullName
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim()
  }

  return 'Galeri Sahibi'
}

function buildSessionPayload(input: {
  authSession: SupabaseAuthSession
  user: SupabaseAuthUser
  fullName: string
  gallery: GalleryRow
}) {
  const email = normalizeEmail(input.user.email || '')
  if (!email) {
    throw new Error('Supabase kullanıcı e-posta bilgisi eksik.')
  }

  return {
    v: SESSION_VERSION,
    userId: input.user.id,
    email,
    fullName: input.fullName,
    galleryId: input.gallery.id,
    galleryName: input.gallery.name,
    accessToken: input.authSession.access_token,
    refreshToken: input.authSession.refresh_token,
    expiresAt: computeExpiresAtIso(input.authSession),
  } satisfies PanelSessionCookiePayload
}

export function setPanelSessionCookie(response: NextResponse, payload: PanelSession) {
  const cookieValue = encodeSessionCookie({
    v: SESSION_VERSION,
    userId: payload.userId,
    email: payload.email,
    fullName: payload.fullName,
    galleryId: payload.galleryId,
    galleryName: payload.galleryName,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresAt,
  })

  response.cookies.set(PANEL_SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearPanelSessionCookie(response: NextResponse) {
  response.cookies.set(PANEL_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

function toPublicSession(payload: PanelSessionCookiePayload): PanelSession {
  return {
    userId: payload.userId,
    email: payload.email,
    fullName: payload.fullName,
    galleryId: payload.galleryId,
    galleryName: payload.galleryName,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresAt,
  }
}

export function readPanelSessionFromRequest(request: Request) {
  return readPanelSessionFromCookieHeader(request.headers.get('cookie'))
}

export function readPanelSessionFromCookieHeader(cookieHeader: string | null | undefined) {
  const rawCookie = parseCookieValue(cookieHeader || null, PANEL_SESSION_COOKIE_NAME)
  const payload = decodeSessionCookie(rawCookie)
  return payload ? toPublicSession(payload) : null
}

export async function refreshPanelSession(input: {
  refreshToken: string
  previous: PanelSession
}) {
  const refreshed = await supabaseAuthRequest<SupabaseSignInResponse>({
    path: '/auth/v1/token?grant_type=refresh_token',
    method: 'POST',
    body: {
      refresh_token: input.refreshToken,
    },
  })

  const user = refreshed.user
  assertAuthUserCanUsePanel(user)
  const email = normalizeEmail(user?.email || input.previous.email)
  const gallery = await ensureOwnerGallery({
    ownerEmail: email,
    galleryName: input.previous.galleryName,
    phone: '',
  })
  await ensureTrialSubscriptionForGallery({
    galleryId: gallery.id,
    ownerEmail: email,
  })

  const payload = buildSessionPayload({
    authSession: refreshed,
    user: {
      id: user?.id || input.previous.userId,
      email,
      user_metadata: user?.user_metadata || null,
      app_metadata: user?.app_metadata || null,
    },
    fullName: resolveFullName({
      preferredFullName: input.previous.fullName,
      user,
    }),
    gallery,
  })

  return toPublicSession(payload)
}

export async function loginWithSupabase(input: LoginInput) {
  requireSupabaseAdminConfig()

  const email = normalizeEmail(input.email)

  const auth = await supabaseAuthRequest<SupabaseSignInResponse>({
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    body: {
      email,
      password: input.password,
    },
  })

  if (!auth.user?.id) {
    throw new Error('Giriş başarısız. Kullanıcı bilgisi alınamadı.')
  }
  assertAuthUserCanUsePanel(auth.user)

  const gallery = await ensureOwnerGallery({
    ownerEmail: email,
    galleryName: auth.user.user_metadata?.galleryName as string || 'Galeri',
    phone: '',
  })
  await ensureTrialSubscriptionForGallery({
    galleryId: gallery.id,
    ownerEmail: email,
  })

  const payload = buildSessionPayload({
    authSession: auth,
    user: {
      id: auth.user.id,
      email,
      user_metadata: auth.user.user_metadata || null,
      app_metadata: auth.user.app_metadata || null,
    },
    fullName: resolveFullName({ user: auth.user }),
    gallery,
  })

  return toPublicSession(payload)
}

export async function registerWithSupabase(input: RegisterInput) {
  requireSupabaseAdminConfig()

  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  const planCode = input.planCode && isSubscriptionPlanCode(input.planCode) && input.planCode !== 'enterprise'
    ? input.planCode
    : 'starter'

  let createdUser: SupabaseAuthUser | null = null
  try {
    createdUser = await createConfirmedUserWithSupabaseAdmin({
      email,
      password: input.password,
      fullName: input.fullName,
      galleryName: input.galleryName,
      phone,
      planCode,
    })
  } catch (error) {
    if (isUserAlreadyRegisteredError(error)) {
      throw new Error('Bu e-posta ile zaten bir hesap var. Lütfen giriş yapın.')
    }
    throw error
  }

  const authSession = await supabaseAuthRequest<SupabaseSignInResponse>({
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    body: {
      email,
      password: input.password,
    },
  })

  const user = authSession.user || createdUser
  if (!user?.id) {
    throw new Error('Kayıt oluşturuldu ancak kullanıcı bilgisi eksik.')
  }

  const gallery = await ensureOwnerGallery({
    ownerEmail: email,
    galleryName: input.galleryName,
    phone,
  })
  await ensureTrialSubscriptionForGallery({
    galleryId: gallery.id,
    ownerEmail: email,
    startDate: new Date(),
    planCode,
  })

  const payload = buildSessionPayload({
    authSession,
    user: {
      id: user.id,
      email,
      user_metadata: user.user_metadata || null,
      app_metadata: user.app_metadata || null,
    },
    fullName: resolveFullName({ preferredFullName: input.fullName, user }),
    gallery,
  })

  return toPublicSession(payload)
}

export async function sendPasswordRecoveryEmail(emailRaw: string) {
  const email = normalizeEmail(emailRaw)
  await supabaseAuthRequest<Record<string, unknown>>({
    path: '/auth/v1/recover',
    method: 'POST',
    body: { email },
  })
}

export function requirePanelSession(request: Request) {
  const session = readPanelSessionFromRequest(request)
  if (!session) {
    throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
  }

  return session
}
