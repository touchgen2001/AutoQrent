import {
  type AdminAccessStatus,
  type AdminAccountRole,
  type AdminSubscriptionPlan,
  type AdminSubscriptionStatus,
  isAdminAccessStatus,
  isAdminAccountRole,
  isAdminSubscriptionPlan,
  isAdminSubscriptionStatus,
} from '@/lib/admin-user-types'
import { insertAuditLog } from '@/lib/security/audit'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { normalizeSubscriptionPlanCode, normalizeSubscriptionStatus } from '@/lib/subscription-plans'

type AuthUserRow = {
  id: string
  email?: string | null
  phone?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
  confirmed_at?: string | null
  email_confirmed_at?: string | null
  banned_until?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
}

type AuthUsersResponse =
  | {
      users?: AuthUserRow[]
      data?: {
        users?: AuthUserRow[]
      }
      total?: number
      page?: number
      per_page?: number
    }
  | AuthUserRow[]

type AuthUserResponse =
  | {
      user?: AuthUserRow
    }
  | AuthUserRow

type GalleryAdminRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  owner_email: string | null
  created_at: string | null
  logo_url?: string | null
  city?: string | null
  district?: string | null
}

type VehicleAdminRow = {
  gallery_id: string | null
  status: string | null
}

type LeadAdminRow = {
  gallery_id: string | null
  status: string | null
}

type GalleryMetrics = {
  vehicleCount: number
  activeVehicleCount: number
  soldVehicleCount: number
  leadCount: number
  openLeadCount: number
}

export type AdminManagedUser = {
  key: string
  source: 'auth' | 'gallery'
  userId: string | null
  email: string
  fullName: string | null
  phone: string | null
  createdAt: string | null
  lastSignInAt: string | null
  emailConfirmed: boolean
  banned: boolean
  authorization: {
    role: AdminAccountRole
    accessStatus: AdminAccessStatus
  }
  subscription: {
    plan: AdminSubscriptionPlan
    status: AdminSubscriptionStatus
    updatedAt: string | null
  }
  gallery: {
    id: string
    name: string
    slug: string
    phone: string | null
    email: string | null
    city: string | null
    district: string | null
    createdAt: string | null
  } | null
  metrics: GalleryMetrics
}

export type AdminManagedUsersResult = {
  ok: true
  generatedAt: string
  capReached: boolean
  sourceLimit: number
  summary: {
    authUsers: number
    galleryOwners: number
    usersWithGallery: number
    usersWithoutGallery: number
    galleriesWithoutAuth: number
    totalGalleries: number
    totalVehicles: number
    totalLeads: number
  }
  users: AdminManagedUser[]
}

type AdminUserListOptions = {
  search?: string
  maxUsers?: number
}

const AUTH_USERS_PAGE_SIZE = 100
const DEFAULT_MAX_AUTH_USERS = 1000
const MAX_AUTH_USERS = 5000
const DATA_ROW_LIMIT = 20000
const LONG_BAN_DURATION = '876600h'
const OPEN_LEAD_STATUSES = new Set(['yeni', 'arandi', 'gorusuluyor', 'test-surusu'])

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim()
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null

  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function extractAuthUsers(response: AuthUsersResponse) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response.users)) return response.users
  if (Array.isArray(response.data?.users)) return response.data.users
  return []
}

function extractAuthTotal(response: AuthUsersResponse) {
  if (Array.isArray(response)) return null
  return typeof response.total === 'number' && Number.isFinite(response.total) ? response.total : null
}

function extractAuthUser(response: AuthUserResponse) {
  if ('user' in response && response.user) return response.user
  if ('id' in response && typeof response.id === 'string') return response
  return null
}

function getMetadataValue(metadata: Record<string, unknown> | null | undefined, key: string) {
  return metadata ? metadata[key] : null
}

function getAuthorization(metadata: Record<string, unknown> | null | undefined) {
  const role = getMetadataValue(metadata, 'accountRole')
  const accessStatus = getMetadataValue(metadata, 'accessStatus')

  return {
    role: isAdminAccountRole(role) ? role : 'owner',
    accessStatus: isAdminAccessStatus(accessStatus) ? accessStatus : 'active',
  }
}

function getSubscription(metadata: Record<string, unknown> | null | undefined) {
  const plan = getMetadataValue(metadata, 'subscriptionPlan')
  const status = getMetadataValue(metadata, 'subscriptionStatus')
  const updatedAt = getMetadataValue(metadata, 'subscriptionUpdatedAt')

  return {
    plan: isAdminSubscriptionPlan(plan) ? plan : normalizeSubscriptionPlanCode(plan),
    status: isAdminSubscriptionStatus(status) ? status : normalizeSubscriptionStatus(status),
    updatedAt: typeof updatedAt === 'string' && updatedAt.trim() ? updatedAt.trim() : null,
  }
}

function incrementGalleryMetrics(metricsByGalleryId: Map<string, GalleryMetrics>, galleryId: string) {
  const existing = metricsByGalleryId.get(galleryId)
  if (existing) return existing

  const created = {
    vehicleCount: 0,
    activeVehicleCount: 0,
    soldVehicleCount: 0,
    leadCount: 0,
    openLeadCount: 0,
  }
  metricsByGalleryId.set(galleryId, created)
  return created
}

async function fetchAllAuthUsers(maxUsers: number) {
  const users: AuthUserRow[] = []
  let total: number | null = null
  let page = 1

  while (users.length < maxUsers) {
    const response = await supabaseAdminFetch<AuthUsersResponse>({
      path: '/auth/v1/admin/users',
      query: {
        page,
        per_page: AUTH_USERS_PAGE_SIZE,
      },
    })

    const pageUsers = extractAuthUsers(response)
    total = extractAuthTotal(response) ?? total
    users.push(...pageUsers)

    if (pageUsers.length < AUTH_USERS_PAGE_SIZE) break
    if (total !== null && users.length >= total) break
    page += 1
  }

  return {
    users: users.slice(0, maxUsers),
    total,
    capReached: total !== null ? total > maxUsers : users.length >= maxUsers,
  }
}

async function fetchAuthUserById(userId: string) {
  const response = await supabaseAdminFetch<AuthUserResponse>({
    path: `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
  })

  return extractAuthUser(response)
}

async function fetchGalleries() {
  return supabaseAdminFetch<GalleryAdminRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,phone,email,owner_email,created_at,logo_url,city,district',
      order: 'created_at.desc',
      limit: DATA_ROW_LIMIT,
    },
  })
}

async function fetchVehicles() {
  return supabaseAdminFetch<VehicleAdminRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'gallery_id,status',
      limit: DATA_ROW_LIMIT,
    },
  })
}

async function fetchLeads() {
  return supabaseAdminFetch<LeadAdminRow[]>({
    path: '/rest/v1/leads',
    query: {
      select: 'gallery_id,status',
      limit: DATA_ROW_LIMIT,
    },
  })
}

function buildGalleryMaps(galleries: GalleryAdminRow[]) {
  const byOwnerEmail = new Map<string, GalleryAdminRow>()
  const byId = new Map<string, GalleryAdminRow>()

  for (const gallery of galleries) {
    byId.set(gallery.id, gallery)
    const ownerEmail = normalizeEmail(gallery.owner_email)
    if (ownerEmail && !byOwnerEmail.has(ownerEmail)) {
      byOwnerEmail.set(ownerEmail, gallery)
    }
  }

  return {
    byOwnerEmail,
    byId,
  }
}

function buildMetrics(vehicles: VehicleAdminRow[], leads: LeadAdminRow[]) {
  const metricsByGalleryId = new Map<string, GalleryMetrics>()

  for (const vehicle of vehicles) {
    const galleryId = vehicle.gallery_id
    if (!galleryId) continue

    const metrics = incrementGalleryMetrics(metricsByGalleryId, galleryId)
    metrics.vehicleCount += 1
    if (vehicle.status === 'sold') {
      metrics.soldVehicleCount += 1
    } else if (vehicle.status === 'active' || !vehicle.status) {
      metrics.activeVehicleCount += 1
    }
  }

  for (const lead of leads) {
    const galleryId = lead.gallery_id
    if (!galleryId) continue

    const metrics = incrementGalleryMetrics(metricsByGalleryId, galleryId)
    metrics.leadCount += 1
    if (OPEN_LEAD_STATUSES.has(lead.status || '')) {
      metrics.openLeadCount += 1
    }
  }

  return metricsByGalleryId
}

function toGallerySummary(gallery: GalleryAdminRow | null) {
  if (!gallery) return null

  return {
    id: gallery.id,
    name: gallery.name,
    slug: gallery.slug,
    phone: gallery.phone,
    email: gallery.email,
    city: gallery.city || null,
    district: gallery.district || null,
    createdAt: gallery.created_at,
  }
}

function getMetrics(metricsByGalleryId: Map<string, GalleryMetrics>, galleryId: string | null | undefined): GalleryMetrics {
  if (!galleryId) {
    return {
      vehicleCount: 0,
      activeVehicleCount: 0,
      soldVehicleCount: 0,
      leadCount: 0,
      openLeadCount: 0,
    }
  }

  return metricsByGalleryId.get(galleryId) || {
    vehicleCount: 0,
    activeVehicleCount: 0,
    soldVehicleCount: 0,
    leadCount: 0,
    openLeadCount: 0,
  }
}

function matchesSearch(user: AdminManagedUser, search: string) {
  if (!search) return true
  const haystack = [
    user.email,
    user.fullName,
    user.phone,
    user.gallery?.name,
    user.gallery?.phone,
    user.gallery?.city,
    user.gallery?.district,
    user.authorization.role,
    user.authorization.accessStatus,
    user.subscription.plan,
    user.subscription.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

export async function listAdminManagedUsers(input: AdminUserListOptions = {}): Promise<AdminManagedUsersResult> {
  requireSupabaseAdminConfig()

  const maxUsers = Math.min(Math.max(input.maxUsers || DEFAULT_MAX_AUTH_USERS, 1), MAX_AUTH_USERS)
  const search = normalizeText(input.search).toLowerCase()
  const [authResult, galleries, vehicles, leads] = await Promise.all([
    fetchAllAuthUsers(maxUsers),
    fetchGalleries(),
    fetchVehicles(),
    fetchLeads(),
  ])
  const galleryMaps = buildGalleryMaps(galleries)
  const metricsByGalleryId = buildMetrics(vehicles, leads)
  const users: AdminManagedUser[] = []
  const seenOwnerEmails = new Set<string>()

  for (const authUser of authResult.users) {
    const email = normalizeEmail(authUser.email)
    if (!email) continue

    const gallery = galleryMaps.byOwnerEmail.get(email) || null
    if (gallery) seenOwnerEmails.add(email)

    users.push({
      key: `auth:${authUser.id}`,
      source: 'auth',
      userId: authUser.id,
      email,
      fullName: getMetadataString(authUser.user_metadata, ['fullName', 'full_name', 'name']),
      phone: normalizeText(authUser.phone) || getMetadataString(authUser.user_metadata, ['phone', 'phoneNumber']) || gallery?.phone || null,
      createdAt: authUser.created_at || null,
      lastSignInAt: authUser.last_sign_in_at || null,
      emailConfirmed: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
      banned: Boolean(authUser.banned_until && Date.parse(authUser.banned_until) > Date.now()),
      authorization: getAuthorization(authUser.app_metadata),
      subscription: getSubscription(authUser.app_metadata),
      gallery: toGallerySummary(gallery),
      metrics: getMetrics(metricsByGalleryId, gallery?.id),
    })
  }

  for (const gallery of galleries) {
    const ownerEmail = normalizeEmail(gallery.owner_email)
    if (!ownerEmail || seenOwnerEmails.has(ownerEmail)) continue

    users.push({
      key: `gallery:${gallery.id}`,
      source: 'gallery',
      userId: null,
      email: ownerEmail,
      fullName: null,
      phone: gallery.phone,
      createdAt: gallery.created_at,
      lastSignInAt: null,
      emailConfirmed: false,
      banned: false,
      authorization: {
        role: 'owner',
        accessStatus: 'active',
      },
      subscription: {
        plan: 'starter',
        status: 'trialing',
        updatedAt: null,
      },
      gallery: toGallerySummary(gallery),
      metrics: getMetrics(metricsByGalleryId, gallery.id),
    })
  }

  const filteredUsers = users.filter((user) => matchesSearch(user, search))
  const usersWithGallery = users.filter((user) => user.gallery).length
  const galleriesWithoutAuth = users.filter((user) => user.source === 'gallery').length

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    capReached: authResult.capReached,
    sourceLimit: maxUsers,
    summary: {
      authUsers: authResult.total ?? authResult.users.length,
      galleryOwners: galleryMaps.byOwnerEmail.size,
      usersWithGallery,
      usersWithoutGallery: users.length - usersWithGallery,
      galleriesWithoutAuth,
      totalGalleries: galleries.length,
      totalVehicles: vehicles.length,
      totalLeads: leads.length,
    },
    users: filteredUsers.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || '') || 0
      const rightTime = Date.parse(right.createdAt || '') || 0
      return rightTime - leftTime
    }),
  }
}

export async function findAdminManagedUserById(userId: string) {
  const data = await listAdminManagedUsers()
  return data.users.find((user) => user.userId === userId) || null
}

async function updateAuthUserAppMetadata(input: {
  userId: string
  appMetadata: Record<string, unknown>
}) {
  return updateAuthUserAttributes({
    userId: input.userId,
    body: {
      app_metadata: input.appMetadata,
    },
  })
}

async function updateAuthUserAttributes(input: {
  userId: string
  body: Record<string, unknown>
}) {
  const response = await supabaseAdminFetch<AuthUserResponse>({
    method: 'PUT',
    path: `/auth/v1/admin/users/${encodeURIComponent(input.userId)}`,
    body: input.body,
  })

  return extractAuthUser(response)
}

function assertAuthUserFound(user: AuthUserRow | null, userId: string): asserts user is AuthUserRow {
  if (!user?.id) {
    throw new Error(`Supabase Auth kullanıcısı bulunamadı: ${userId}`)
  }
}

export async function updateAdminUserAuthorization(input: {
  userId: string
  role: AdminAccountRole
  accessStatus: AdminAccessStatus
  reason: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const authUser = await fetchAuthUserById(input.userId)
  assertAuthUserFound(authUser, input.userId)

  const previous = getAuthorization(authUser.app_metadata)
  const nextAppMetadata = {
    ...(authUser.app_metadata || {}),
    accountRole: input.role,
    accessStatus: input.accessStatus,
    authorizationUpdatedAt: new Date().toISOString(),
  }

  if (!input.dryRun) {
    await updateAuthUserAppMetadata({
      userId: input.userId,
      appMetadata: nextAppMetadata,
    })

    await insertAuditLog({
      action: 'admin_user_authorization_update',
      entityType: 'user',
      entityId: input.userId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        email: normalizeEmail(authUser.email),
        reason: input.reason,
        previous,
        next: {
          role: input.role,
          accessStatus: input.accessStatus,
        },
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    previous,
    next: {
      role: input.role,
      accessStatus: input.accessStatus,
    },
  }
}

export async function updateAdminUserSubscription(input: {
  userId: string
  plan: AdminSubscriptionPlan
  status: AdminSubscriptionStatus
  reason: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const authUser = await fetchAuthUserById(input.userId)
  assertAuthUserFound(authUser, input.userId)

  const previous = getSubscription(authUser.app_metadata)
  const updatedAt = new Date().toISOString()
  const nextAppMetadata = {
    ...(authUser.app_metadata || {}),
    subscriptionPlan: input.plan,
    subscriptionStatus: input.status,
    subscriptionUpdatedAt: updatedAt,
  }

  if (!input.dryRun) {
    await updateAuthUserAppMetadata({
      userId: input.userId,
      appMetadata: nextAppMetadata,
    })

    await insertAuditLog({
      action: 'admin_subscription_update',
      entityType: 'subscription',
      entityId: input.userId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        email: normalizeEmail(authUser.email),
        reason: input.reason,
        previous,
        next: {
          plan: input.plan,
          status: input.status,
          updatedAt,
        },
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    previous,
    next: {
      plan: input.plan,
      status: input.status,
      updatedAt,
    },
  }
}

export async function requestAdminUserPasswordReset(input: {
  userId: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const authUser = await fetchAuthUserById(input.userId)
  assertAuthUserFound(authUser, input.userId)

  const email = normalizeEmail(authUser.email)
  if (!email) {
    throw new Error('Şifre sıfırlama için kullanıcı e-postası bulunamadı.')
  }

  if (!input.dryRun) {
    await supabaseAdminFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/auth/v1/recover',
      body: {
        email,
      },
    })

    await insertAuditLog({
      action: 'admin_user_password_reset',
      entityType: 'user',
      entityId: input.userId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        email,
        deliveryProvider: 'supabase_auth_recovery',
        deliveryStatus: 'requested',
        note: 'Recovery endpoint isteği kabul edildi. E-posta teslimatı Supabase Auth/SMTP loglarıyla doğrulanmalıdır.',
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    targetEmail: email,
    deliveryStatus: 'requested' as const,
    message: 'Supabase şifre sıfırlama isteği kabul edildi. Teslimat durumu Supabase Auth/SMTP loglarıyla doğrulanmalıdır.',
  }
}

export async function verifyAdminUserEmail(input: {
  userId: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const authUser = await fetchAuthUserById(input.userId)
  assertAuthUserFound(authUser, input.userId)

  const email = normalizeEmail(authUser.email)
  if (!email) {
    throw new Error('E-posta doğrulama için kullanıcı e-postası bulunamadı.')
  }

  const wasConfirmed = Boolean(authUser.email_confirmed_at || authUser.confirmed_at)

  if (!input.dryRun && !wasConfirmed) {
    await updateAuthUserAttributes({
      userId: input.userId,
      body: {
        email_confirm: true,
      },
    })
  }

  if (!input.dryRun) {
    await insertAuditLog({
      action: 'admin_user_email_verify',
      entityType: 'user',
      entityId: input.userId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        email,
        previousConfirmed: wasConfirmed,
        nextConfirmed: true,
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    email,
    alreadyConfirmed: wasConfirmed,
    message: wasConfirmed ? 'Kullanıcının e-postası zaten doğrulanmış.' : 'Kullanıcı e-postası Supabase Auth üzerinde doğrulandı.',
  }
}

export async function updateAdminUserStatus(input: {
  userId: string
  status: 'ACTIVE' | 'FROZEN' | 'BANNED'
  reason: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const authUser = await fetchAuthUserById(input.userId)
  assertAuthUserFound(authUser, input.userId)

  const email = normalizeEmail(authUser.email)
  const previousAuthorization = getAuthorization(authUser.app_metadata)
  const previousBanned = Boolean(authUser.banned_until && Date.parse(authUser.banned_until) > Date.now())
  const nextAccessStatus: AdminAccessStatus = input.status === 'ACTIVE' ? 'active' : 'suspended'
  const nextBanned = input.status === 'BANNED'
  const nextAppMetadata = {
    ...(authUser.app_metadata || {}),
    accountRole: previousAuthorization.role,
    accessStatus: nextAccessStatus,
    authorizationUpdatedAt: new Date().toISOString(),
  }

  if (!input.dryRun) {
    await updateAuthUserAttributes({
      userId: input.userId,
      body: {
        app_metadata: nextAppMetadata,
        ban_duration: nextBanned ? LONG_BAN_DURATION : 'none',
      },
    })

    await insertAuditLog({
      action: 'admin_user_status_update',
      entityType: 'user',
      entityId: input.userId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        email,
        reason: input.reason,
        previous: {
          accessStatus: previousAuthorization.accessStatus,
          banned: previousBanned,
        },
        next: {
          status: input.status,
          accessStatus: nextAccessStatus,
          banned: nextBanned,
        },
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    email,
    previous: {
      accessStatus: previousAuthorization.accessStatus,
      banned: previousBanned,
    },
    next: {
      status: input.status,
      accessStatus: nextAccessStatus,
      banned: nextBanned,
    },
    message: `Kullanıcı durumu ${input.status} olarak güncellendi.`,
  }
}

export async function deleteAdminManagedUser(input: {
  userId: string
  confirmEmail: string
  reason: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const authUser = await fetchAuthUserById(input.userId)
  assertAuthUserFound(authUser, input.userId)

  const email = normalizeEmail(authUser.email)
  const confirmedEmail = normalizeEmail(input.confirmEmail)
  if (!email || email !== confirmedEmail) {
    throw new Error('Silme işlemi için kullanıcı e-postasını birebir yazmanız gerekiyor.')
  }

  if (!input.dryRun) {
    await supabaseAdminFetch<unknown>({
      method: 'DELETE',
      path: `/auth/v1/admin/users/${encodeURIComponent(input.userId)}`,
    })

    await insertAuditLog({
      action: 'admin_user_delete',
      entityType: 'user',
      entityId: input.userId,
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        email,
        reason: input.reason,
        note: 'Supabase Auth kullanıcısı silindi. Bağlı galeri kayıtları otomatik silinmez.',
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    deletedUserId: input.userId,
    email,
  }
}

export async function recordAdminNotificationRequest(input: {
  scope: 'single' | 'bulk'
  userId?: string
  channel: 'panel' | 'email' | 'sms' | 'whatsapp'
  targetSegment?: 'ALL_TENANTS' | 'ACTIVE_TENANTS' | 'TRIAL_TENANTS' | 'SUSPENDED_TENANTS'
  title: string
  message: string
  adminUsername: string
  dryRun?: boolean
}) {
  requireSupabaseAdminConfig()

  const data = await listAdminManagedUsers()
  const authUsers = data.users.filter((user) => user.userId)
  const targets = input.scope === 'single'
    ? authUsers.filter((user) => user.userId === input.userId)
    : authUsers

  if (input.scope === 'single' && targets.length === 0) {
    throw new Error('Tekil bildirim için geçerli bir auth kullanıcısı seçilmelidir.')
  }

  if (!input.dryRun) {
    await insertAuditLog({
      action: 'admin_notification_send',
      entityType: 'notification',
      entityId: input.scope === 'single' ? input.userId || 'unknown' : 'bulk',
      actorEmail: input.adminUsername,
      actorRole: 'admin',
      source: 'admin',
      metadata: {
        scope: input.scope,
        channel: input.channel,
        targetSegment: input.targetSegment || null,
        title: input.title,
        messagePreview: input.message.slice(0, 500),
        targetCount: targets.length,
        deliveryProvider: 'not_connected',
        deliveryStatus: 'audit_only',
      },
    })
  }

  return {
    ok: true,
    dryRun: Boolean(input.dryRun),
    scope: input.scope,
    channel: input.channel,
    targetCount: targets.length,
    delivered: false,
    deliveryProvider: 'not_connected' as const,
    message: 'Harici bildirim sağlayıcısı bağlı değil. Talep audit log olarak kaydedilir; teslim edildi denmez.',
  }
}
