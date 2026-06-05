import { randomBytes } from 'node:crypto'

import type { AdminAccessStatus, AdminSubscriptionPlan, AdminSubscriptionStatus } from '@/lib/admin-user-types'
import { insertAuditLog } from '@/lib/security/audit'
import { buildSecurePublicSlug } from '@/lib/security/public-route-token'
import { listAdminManagedUsers } from '@/lib/server/admin-users-repository'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export const ADMIN_TENANT_PACKAGES = ['Başlangıç', 'Pro', 'Premium', 'Kurumsal'] as const
export const ADMIN_TENANT_STATUSES = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'BANNED', 'DELETED'] as const
export const ADMIN_TENANT_PAYMENT_STATUSES = ['PAID', 'TRIAL', 'PAST_DUE', 'UNPAID', 'CANCELED'] as const

export type AdminTenantPackage = (typeof ADMIN_TENANT_PACKAGES)[number]
export type AdminTenantStatus = (typeof ADMIN_TENANT_STATUSES)[number]
export type AdminTenantPaymentStatus = (typeof ADMIN_TENANT_PAYMENT_STATUSES)[number]

export type AdminTenant = {
  id: string
  galleryName: string
  owner: string
  ownerEmail: string
  ownerUserId: string | null
  package: AdminTenantPackage
  status: AdminTenantStatus
  paymentStatus: AdminTenantPaymentStatus
  vehicleCount: number
  lastLogin: string | null
  createdAt: string
  source: 'supabase'
}

type AuthUserRow = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
  banned_until?: string | null
}

type AuthUserResponse =
  | {
      user?: AuthUserRow
    }
  | AuthUserRow

type GalleryRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  owner_email: string | null
  created_at: string | null
}

type TenantCreateInput = {
  galleryName: string
  owner: string
  ownerEmail: string
  package: AdminTenantPackage
}

type TenantUpdateInput = Partial<{
  galleryName: string
  owner: string
  ownerEmail: string
  package: AdminTenantPackage
  status: AdminTenantStatus
  paymentStatus: AdminTenantPaymentStatus
  vehicleCount: number
}>

const LONG_BAN_DURATION = '876600h'

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function normalizeGalleryName(value: string) {
  const normalized = value.trim()
  if (normalized.length < 2) {
    throw new Error('Galeri adı en az 2 karakter olmalıdır.')
  }
  return normalized.slice(0, 120)
}

function normalizeOwnerName(value: string) {
  const normalized = value.trim()
  if (normalized.length < 2) {
    throw new Error('Sahip kullanıcı adı en az 2 karakter olmalıdır.')
  }
  return normalized.slice(0, 120)
}

function getAuthUser(response: AuthUserResponse): AuthUserRow {
  if ('user' in response && response.user?.id) return response.user
  if ('id' in response && response.id) return response
  throw new Error('Supabase Auth kullanıcı yanıtı okunamadı.')
}

function mapPlanToPackage(plan: AdminSubscriptionPlan): AdminTenantPackage {
  if (plan === 'enterprise') return 'Kurumsal'
  if (plan === 'premium') return 'Premium'
  if (plan === 'pro') return 'Pro'
  return 'Başlangıç'
}

function mapPackageToPlan(value: AdminTenantPackage): AdminSubscriptionPlan {
  if (value === 'Kurumsal') return 'enterprise'
  if (value === 'Premium') return 'premium'
  if (value === 'Pro') return 'pro'
  return 'starter'
}

function mapSubscriptionToPayment(status: AdminSubscriptionStatus): AdminTenantPaymentStatus {
  if (status === 'active') return 'PAID'
  if (status === 'trialing') return 'TRIAL'
  if (status === 'past_due') return 'PAST_DUE'
  return 'CANCELED'
}

function mapPaymentToSubscription(status: AdminTenantPaymentStatus): AdminSubscriptionStatus {
  if (status === 'PAID') return 'active'
  if (status === 'TRIAL') return 'trialing'
  if (status === 'PAST_DUE' || status === 'UNPAID') return 'past_due'
  return 'canceled'
}

function mapTenantStatus(input: {
  banned: boolean
  accessStatus: AdminAccessStatus
  subscriptionStatus: AdminSubscriptionStatus
}): AdminTenantStatus {
  if (input.banned) return 'BANNED'
  if (input.accessStatus === 'suspended' && input.subscriptionStatus === 'canceled') return 'DELETED'
  if (input.accessStatus === 'suspended') return 'SUSPENDED'
  if (input.subscriptionStatus === 'trialing') return 'TRIAL'
  return 'ACTIVE'
}

function mapStatusToAccessStatus(status: AdminTenantStatus): AdminAccessStatus {
  return status === 'ACTIVE' || status === 'TRIAL' ? 'active' : 'suspended'
}

function getSubscriptionStatusForUpdate(input: {
  status?: AdminTenantStatus
  paymentStatus?: AdminTenantPaymentStatus
  fallback: AdminSubscriptionStatus
}) {
  if (input.status === 'DELETED') return 'canceled'
  if (input.status === 'TRIAL') return 'trialing'
  if (input.paymentStatus) return mapPaymentToSubscription(input.paymentStatus)
  return input.fallback
}

function createTemporaryPassword() {
  return `${randomBytes(12).toString('base64url')}Aa1!`
}

async function fetchAuthUserById(userId: string) {
  const response = await supabaseAdminFetch<AuthUserResponse>({
    path: `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
  })

  return getAuthUser(response)
}

async function updateAuthUserById(input: {
  userId: string
  email?: string
  userMetadata?: Record<string, unknown>
  appMetadata?: Record<string, unknown>
  banDuration?: string
}) {
  const body: Record<string, unknown> = {}
  if (input.email) {
    body.email = input.email
    body.email_confirm = true
  }
  if (input.userMetadata) body.user_metadata = input.userMetadata
  if (input.appMetadata) body.app_metadata = input.appMetadata
  if (input.banDuration) body.ban_duration = input.banDuration

  const response = await supabaseAdminFetch<AuthUserResponse>({
    method: 'PUT',
    path: `/auth/v1/admin/users/${encodeURIComponent(input.userId)}`,
    body,
  })

  return getAuthUser(response)
}

async function createTenantAuthOwner(input: TenantCreateInput & { temporaryPassword: string }) {
  const now = new Date().toISOString()
  const response = await supabaseAdminFetch<AuthUserResponse>({
    method: 'POST',
    path: '/auth/v1/admin/users',
    body: {
      email: normalizeEmail(input.ownerEmail),
      password: input.temporaryPassword,
      email_confirm: true,
      user_metadata: {
        fullName: normalizeOwnerName(input.owner),
        galleryName: normalizeGalleryName(input.galleryName),
      },
      app_metadata: {
        accountRole: 'owner',
        accessStatus: 'active',
        subscriptionPlan: mapPackageToPlan(input.package),
        subscriptionStatus: 'trialing',
        subscriptionUpdatedAt: now,
      },
    },
  })

  return getAuthUser(response)
}

async function deleteAuthUserIfCreated(userId: string) {
  await supabaseAdminFetch<unknown>({
    method: 'DELETE',
    path: `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    body: {
      should_soft_delete: true,
    },
  }).catch(() => undefined)
}

async function createGallery(input: TenantCreateInput) {
  const normalizedName = normalizeGalleryName(input.galleryName)
  const ownerEmail = normalizeEmail(input.ownerEmail)
  const rows = await supabaseAdminFetch<GalleryRow[]>({
    method: 'POST',
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,phone,email,owner_email,created_at',
    },
    body: {
      name: normalizedName,
      slug: buildSecurePublicSlug(normalizedName, 'galeri'),
      email: ownerEmail,
      owner_email: ownerEmail,
    },
    prefer: 'return=representation',
  })

  if (!rows[0]) {
    throw new Error('Galeri oluşturuldu ancak kayıt yanıtı alınamadı.')
  }

  return rows[0]
}

async function patchGallery(input: {
  galleryId: string
  galleryName?: string
  ownerEmail?: string
}) {
  const body: Record<string, string> = {}
  if (input.galleryName !== undefined) body.name = normalizeGalleryName(input.galleryName)
  if (input.ownerEmail !== undefined) {
    const ownerEmail = normalizeEmail(input.ownerEmail)
    body.owner_email = ownerEmail
    body.email = ownerEmail
  }

  if (Object.keys(body).length === 0) return null

  const rows = await supabaseAdminFetch<GalleryRow[]>({
    method: 'PATCH',
    path: '/rest/v1/galleries',
    query: {
      id: `eq.${input.galleryId}`,
      select: 'id,name,slug,phone,email,owner_email,created_at',
    },
    body,
    prefer: 'return=representation',
  })

  return rows[0] || null
}

export async function listAdminManagedTenants(input: { search?: string } = {}) {
  const result = await listAdminManagedUsers({ search: input.search })
  const tenants = result.users
    .filter((user) => user.gallery)
    .map((user): AdminTenant => {
      const gallery = user.gallery!
      return {
        id: gallery.id,
        galleryName: gallery.name,
        owner: user.fullName || user.email,
        ownerEmail: user.email,
        ownerUserId: user.userId,
        package: mapPlanToPackage(user.subscription.plan),
        status: mapTenantStatus({
          banned: user.banned,
          accessStatus: user.authorization.accessStatus,
          subscriptionStatus: user.subscription.status,
        }),
        paymentStatus: mapSubscriptionToPayment(user.subscription.status),
        vehicleCount: user.metrics.vehicleCount,
        lastLogin: user.lastSignInAt,
        createdAt: gallery.createdAt || user.createdAt || result.generatedAt,
        source: 'supabase',
      }
    })

  return {
    ok: true,
    generatedAt: result.generatedAt,
    source: 'supabase' as const,
    summary: {
      totalGalleries: result.summary.totalGalleries,
      totalVehicles: result.summary.totalVehicles,
      totalLeads: result.summary.totalLeads,
    },
    tenants,
  }
}

export async function findAdminManagedTenantById(tenantId: string) {
  const result = await listAdminManagedTenants()
  return result.tenants.find((tenant) => tenant.id === tenantId) || null
}

export async function createAdminManagedTenant(input: TenantCreateInput & { adminUsername: string }) {
  requireSupabaseAdminConfig()

  const temporaryPassword = createTemporaryPassword()
  const owner = await createTenantAuthOwner({ ...input, temporaryPassword })
  let gallery: GalleryRow

  try {
    gallery = await createGallery(input)
  } catch (error) {
    await deleteAuthUserIfCreated(owner.id)
    throw error
  }

  await insertAuditLog({
    action: 'admin_user_authorization_update',
    entityType: 'user',
    entityId: owner.id,
    actorEmail: input.adminUsername,
    actorRole: 'admin',
    source: 'admin',
    metadata: {
      tenantId: gallery.id,
      galleryName: gallery.name,
      ownerEmail: normalizeEmail(input.ownerEmail),
      operation: 'tenant_create',
    },
  })

  const tenant = await findAdminManagedTenantById(gallery.id)
  if (!tenant) {
    throw new Error('Tenant oluşturuldu ancak canlı listede bulunamadı.')
  }

  return {
    ok: true,
    tenant,
    temporaryPassword,
  }
}

export async function updateAdminManagedTenant(input: {
  tenantId: string
  patch: TenantUpdateInput
  reason?: string
  adminUsername: string
}) {
  requireSupabaseAdminConfig()

  const previous = await findAdminManagedTenantById(input.tenantId)
  if (!previous) {
    throw new Error('Tenant bulunamadı.')
  }

  await patchGallery({
    galleryId: input.tenantId,
    galleryName: input.patch.galleryName,
    ownerEmail: input.patch.ownerEmail,
  })

  if (previous.ownerUserId) {
    const authUser = await fetchAuthUserById(previous.ownerUserId)
    const nextStatus = input.patch.status || previous.status
    const nextPaymentStatus = input.patch.paymentStatus || previous.paymentStatus
    const subscriptionStatus = getSubscriptionStatusForUpdate({
      status: nextStatus,
      paymentStatus: nextPaymentStatus,
      fallback: mapPaymentToSubscription(previous.paymentStatus),
    })
    const accessStatus = mapStatusToAccessStatus(nextStatus)
    const nextAppMetadata = {
      ...(authUser.app_metadata || {}),
      accountRole: 'owner',
      accessStatus,
      subscriptionPlan: mapPackageToPlan(input.patch.package || previous.package),
      subscriptionStatus,
      subscriptionUpdatedAt: new Date().toISOString(),
    }
    const nextUserMetadata = {
      ...(authUser.user_metadata || {}),
      fullName: input.patch.owner ? normalizeOwnerName(input.patch.owner) : previous.owner,
      galleryName: input.patch.galleryName ? normalizeGalleryName(input.patch.galleryName) : previous.galleryName,
    }

    await updateAuthUserById({
      userId: previous.ownerUserId,
      email: input.patch.ownerEmail ? normalizeEmail(input.patch.ownerEmail) : undefined,
      userMetadata: nextUserMetadata,
      appMetadata: nextAppMetadata,
      banDuration: nextStatus === 'BANNED' ? LONG_BAN_DURATION : 'none',
    })
  }

  await insertAuditLog({
    action: input.patch.status === 'DELETED' ? 'admin_user_delete' : 'admin_user_authorization_update',
    entityType: 'user',
    entityId: previous.ownerUserId || input.tenantId,
    actorEmail: input.adminUsername,
    actorRole: 'admin',
    source: 'admin',
    metadata: {
      tenantId: input.tenantId,
      reason: input.reason || null,
      previous,
      patch: input.patch,
      operation: 'tenant_update',
    },
  })

  const tenant = await findAdminManagedTenantById(input.tenantId)
  if (!tenant) {
    throw new Error('Tenant güncellendi ancak canlı listede bulunamadı.')
  }

  return {
    ok: true,
    tenant,
  }
}

export async function createAdminTenantImpersonationPreview(input: {
  tenantId: string
  adminUsername: string
}) {
  requireSupabaseAdminConfig()

  const tenant = await findAdminManagedTenantById(input.tenantId)
  if (!tenant) {
    throw new Error('Tenant bulunamadı.')
  }
  if (tenant.status === 'BANNED' || tenant.status === 'DELETED') {
    throw new Error('Banlı veya yumuşak silinmiş tenant içine girilemez.')
  }

  await insertAuditLog({
    action: 'admin_user_authorization_update',
    entityType: 'user',
    entityId: tenant.ownerUserId || tenant.id,
    actorEmail: input.adminUsername,
    actorRole: 'admin',
    source: 'admin',
    metadata: {
      tenantId: tenant.id,
      galleryName: tenant.galleryName,
      operation: 'tenant_impersonation_preview',
      scope: 'read_only',
    },
  })

  return {
    ok: true,
    tenantId: tenant.id,
    galleryName: tenant.galleryName,
    issuedAt: new Date().toISOString(),
    scope: 'salt okunur tenant içine giriş',
  }
}
