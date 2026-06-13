import {
  BILLING_INTERVALS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  TRIAL_DAYS,
  getSubscriptionPlanDefinition,
  isBillingInterval,
  isSubscriptionPlanCode,
  normalizeSubscriptionPlanCode,
  normalizeSubscriptionStatus,
  subscriptionFeatureLabels,
  type BillingInterval,
  type SubscriptionFeature,
  type SubscriptionPlanCode,
  type SubscriptionStatus,
} from '@/lib/subscription-plans'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { countBillablePanelTeamMembers } from '@/lib/server/panel-team-repository'

type GalleryOwnerRow = {
  id: string
  owner_email: string | null
  created_at?: string | null
}

type GallerySubscriptionRow = {
  id: string
  gallery_id: string
  owner_email: string
  plan_code: string
  status: string
  billing_interval: string
  trial_started_at: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  provider: string
  provider_customer_id: string | null
  provider_subscription_id: string | null
  payment_status: string
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type VehicleUsageRow = {
  id: string
}

export type SubscriptionUsage = {
  vehicles: {
    used: number
    limit: number | null
    remaining: number | null
  }
  users: {
    used: number
    limit: number | null
    remaining: number | null
  }
}

export type SubscriptionContext = {
  galleryId: string
  ownerEmail: string
  planCode: SubscriptionPlanCode
  planName: string
  status: SubscriptionStatus
  effectiveStatus: SubscriptionStatus
  billingInterval: BillingInterval
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  paymentStatus: string
  provider: string
  isTrialActive: boolean
  isTrialExpired: boolean
  isMutationAllowed: boolean
  requiresPlanSelection: boolean
  usage: SubscriptionUsage
  features: Record<SubscriptionFeature, boolean>
  plans: typeof SUBSCRIPTION_PLANS
}

export class SubscriptionGateError extends Error {
  code: string
  statusCode: number
  feature?: SubscriptionFeature
  redirectTo = '/panel/ayarlar?tab=subscription'

  constructor(input: {
    message: string
    code: string
    statusCode?: number
    feature?: SubscriptionFeature
  }) {
    super(input.message)
    this.name = 'SubscriptionGateError'
    this.code = input.code
    this.statusCode = input.statusCode || 402
    this.feature = input.feature
  }
}

export function isSubscriptionGateError(error: unknown): error is SubscriptionGateError {
  return error instanceof SubscriptionGateError
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function addYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function toIso(date: Date) {
  return date.toISOString()
}

function isPastIso(value: string | null | undefined) {
  if (!value) return false
  const time = Date.parse(value)
  return Number.isFinite(time) && time <= Date.now()
}

async function assertGalleryOwner(input: { galleryId: string; ownerEmail: string }) {
  const rows = await supabaseAdminFetch<GalleryOwnerRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,owner_email,created_at',
      id: `eq.${input.galleryId}`,
      limit: 1,
    },
  })

  const gallery = rows[0]
  if (!gallery) {
    throw new Error('Galeri bulunamadı.')
  }

  if (normalizeEmail(gallery.owner_email || '') !== normalizeEmail(input.ownerEmail)) {
    throw new Error('Bu galeri için abonelik bilgisine erişim yetkiniz yok.')
  }

  return gallery
}

async function fetchGalleryOwner(input: { galleryId: string }) {
  const rows = await supabaseAdminFetch<GalleryOwnerRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,owner_email,created_at',
      id: `eq.${input.galleryId}`,
      limit: 1,
    },
  })

  const gallery = rows[0]
  if (!gallery) {
    throw new Error('Galeri bulunamadı.')
  }

  if (!gallery.owner_email) {
    throw new Error('Galeri sahibi e-posta bilgisi eksik.')
  }

  return gallery
}

async function fetchSubscriptionByGallery(galleryId: string) {
  const rows = await supabaseAdminFetch<GallerySubscriptionRow[]>({
    path: '/rest/v1/gallery_subscriptions',
    query: {
      select: [
        'id',
        'gallery_id',
        'owner_email',
        'plan_code',
        'status',
        'billing_interval',
        'trial_started_at',
        'trial_ends_at',
        'current_period_start',
        'current_period_end',
        'provider',
        'provider_customer_id',
        'provider_subscription_id',
        'payment_status',
        'metadata',
        'created_at',
        'updated_at',
      ].join(','),
      gallery_id: `eq.${galleryId}`,
      limit: 1,
    },
  })

  return rows[0] || null
}

async function countGalleryVehicles(galleryId: string) {
  const rows = await supabaseAdminFetch<VehicleUsageRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id',
      gallery_id: `eq.${galleryId}`,
      deleted_at: 'is.null',
      limit: 10000,
    },
  })

  return rows.length
}

async function countGalleryUsers(galleryId: string) {
  const count = await countBillablePanelTeamMembers(galleryId).catch(() => 1)
  return Math.max(1, count)
}

function calculateRemaining(used: number, limit: number | null) {
  if (limit === null) return null
  return Math.max(0, limit - used)
}

function normalizeBillingInterval(value: unknown): BillingInterval {
  return isBillingInterval(value) ? value : 'monthly'
}

function getEffectiveStatus(input: {
  status: SubscriptionStatus
  trialEndsAt: string | null
}) {
  if (input.status === 'trialing' && isPastIso(input.trialEndsAt)) return 'expired'
  return input.status
}

function isMutationAllowed(status: SubscriptionStatus) {
  return status === 'active' || status === 'trialing'
}

function buildUsage(input: {
  vehicleCount: number
  userCount: number
  planCode: SubscriptionPlanCode
}) {
  const plan = getSubscriptionPlanDefinition(input.planCode)
  return {
    vehicles: {
      used: input.vehicleCount,
      limit: plan.vehicleLimit,
      remaining: calculateRemaining(input.vehicleCount, plan.vehicleLimit),
    },
    users: {
      used: input.userCount,
      limit: plan.userLimit,
      remaining: calculateRemaining(input.userCount, plan.userLimit),
    },
  } satisfies SubscriptionUsage
}

function buildContext(input: {
  galleryId: string
  ownerEmail: string
  row: GallerySubscriptionRow
  vehicleCount: number
  userCount: number
}) {
  const planCode = normalizeSubscriptionPlanCode(input.row.plan_code)
  const plan = getSubscriptionPlanDefinition(planCode)
  const status = normalizeSubscriptionStatus(input.row.status)
  const effectiveStatus = getEffectiveStatus({
    status,
    trialEndsAt: input.row.trial_ends_at,
  })
  const isTrialActive = status === 'trialing' && effectiveStatus === 'trialing'
  const isTrialExpired = status === 'trialing' && effectiveStatus === 'expired'

  return {
    galleryId: input.galleryId,
    ownerEmail: normalizeEmail(input.ownerEmail),
    planCode,
    planName: plan.name,
    status,
    effectiveStatus,
    billingInterval: normalizeBillingInterval(input.row.billing_interval),
    trialStartedAt: input.row.trial_started_at,
    trialEndsAt: input.row.trial_ends_at,
    currentPeriodStart: input.row.current_period_start,
    currentPeriodEnd: input.row.current_period_end,
    paymentStatus: input.row.payment_status,
    provider: input.row.provider,
    isTrialActive,
    isTrialExpired,
    isMutationAllowed: isMutationAllowed(effectiveStatus),
    requiresPlanSelection: !isMutationAllowed(effectiveStatus),
    usage: buildUsage({
      vehicleCount: input.vehicleCount,
      userCount: input.userCount,
      planCode,
    }),
    features: plan.features,
    plans: SUBSCRIPTION_PLANS,
  } satisfies SubscriptionContext
}

export async function ensureTrialSubscriptionForGallery(input: {
  galleryId: string
  ownerEmail: string
  startDate?: Date
  planCode?: SubscriptionPlanCode
  billingInterval?: BillingInterval
}) {
  requireSupabaseAdminConfig()

  await assertGalleryOwner(input)

  const existing = await fetchSubscriptionByGallery(input.galleryId)
  if (existing) return existing

  const now = input.startDate || new Date()
  const trialEndsAt = addDays(now, TRIAL_DAYS)
  const planCode = input.planCode && isSubscriptionPlanCode(input.planCode) ? input.planCode : 'starter'
  const billingInterval = input.billingInterval && isBillingInterval(input.billingInterval)
    ? input.billingInterval
    : 'monthly'
  const rows = await supabaseAdminFetch<GallerySubscriptionRow[]>({
    method: 'POST',
    path: '/rest/v1/gallery_subscriptions',
    prefer: 'return=representation',
    body: [
      {
        gallery_id: input.galleryId,
        owner_email: normalizeEmail(input.ownerEmail),
        plan_code: planCode,
        status: 'trialing',
        billing_interval: billingInterval,
        trial_started_at: toIso(now),
        trial_ends_at: toIso(trialEndsAt),
        current_period_start: toIso(now),
        current_period_end: toIso(trialEndsAt),
        provider: 'manual',
        payment_status: 'not_connected',
        metadata: {
          source: 'self_service_registration',
          trialDays: TRIAL_DAYS,
          selectedPlanCode: planCode,
          selectedBillingInterval: billingInterval,
        },
      },
    ],
  })

  const created = rows[0]
  if (!created) {
    throw new Error('Deneme aboneliği oluşturulamadı.')
  }

  return created
}

export async function getSubscriptionContextForGallery(input: {
  galleryId: string
  ownerEmail: string
}) {
  requireSupabaseAdminConfig()

  const gallery = await fetchGalleryOwner({ galleryId: input.galleryId })
  const ownerEmail = normalizeEmail(gallery.owner_email || input.ownerEmail)
  const row = await ensureTrialSubscriptionForGallery({
    galleryId: input.galleryId,
    ownerEmail,
  })

  const [vehicleCount, userCount] = await Promise.all([
    countGalleryVehicles(input.galleryId),
    countGalleryUsers(input.galleryId),
  ])

  return buildContext({
    galleryId: input.galleryId,
    ownerEmail,
    row,
    vehicleCount,
    userCount,
  })
}

export async function assertFeatureAccess(input: {
  galleryId: string
  ownerEmail: string
  feature: SubscriptionFeature
}) {
  const context = await getSubscriptionContextForGallery(input)

  if (!context.isMutationAllowed) {
    throw new SubscriptionGateError({
      code: 'subscription_required',
      statusCode: 402,
      feature: input.feature,
      message: context.isTrialExpired
        ? 'Deneme süreniz sona erdi. Devam etmek için bir plan seçin.'
        : 'Aktif aboneliğiniz bulunmuyor. Devam etmek için bir plan seçin.',
    })
  }

  if (!context.features[input.feature]) {
    throw new SubscriptionGateError({
      code: 'feature_locked',
      statusCode: 403,
      feature: input.feature,
      message: `${subscriptionFeatureLabels[input.feature]} özelliği mevcut planınızda yok. Kullanmak için planınızı yükseltin.`,
    })
  }

  return context
}

export async function assertVehicleCreateAllowed(input: {
  galleryId: string
  ownerEmail: string
}) {
  const context = await assertFeatureAccess({
    ...input,
    feature: 'vehicles.create',
  })

  const vehicleLimit = context.usage.vehicles.limit
  if (vehicleLimit !== null && context.usage.vehicles.used >= vehicleLimit) {
    throw new SubscriptionGateError({
      code: 'vehicle_limit_reached',
      statusCode: 402,
      feature: 'vehicles.create',
      message: 'Araç limitinize ulaştınız. Daha fazla araç eklemek için planınızı yükseltin.',
    })
  }

  return context
}

export async function assertUserInviteAllowed(input: {
  galleryId: string
  ownerEmail: string
}) {
  void input
  throw new SubscriptionGateError({
    code: 'user_limit_reached',
    statusCode: 403,
    feature: 'team.manage',
    message: 'Cebindegaleri tek kullanıcı hesabı ile çalışır. Personel hesabı eklenemez.',
  })
}

export async function updateGallerySubscriptionPlan(input: {
  galleryId: string
  ownerEmail: string
  planCode: SubscriptionPlanCode
  billingInterval: BillingInterval
}) {
  requireSupabaseAdminConfig()

  if (!isSubscriptionPlanCode(input.planCode)) {
    throw new Error('Geçersiz plan seçimi.')
  }

  if (!BILLING_INTERVALS.includes(input.billingInterval)) {
    throw new Error('Geçersiz faturalama dönemi.')
  }

  await assertGalleryOwner(input)
  const current = await ensureTrialSubscriptionForGallery(input)
  const plan = getSubscriptionPlanDefinition(input.planCode)

  if (plan.quoteOnly) {
    return {
      quoteRequired: true,
      context: await getSubscriptionContextForGallery(input),
      message: 'Kurumsal plan için teklif görüşmesi gerekir. Ödeme sağlayıcısı bağlandığında teklif süreci ayrıca yönetilecek.',
    }
  }

  const now = new Date()
  const periodEnd = input.billingInterval === 'yearly' ? addYears(now, 1) : addMonths(now, 1)

  await supabaseAdminFetch<unknown>({
    method: 'PATCH',
    path: '/rest/v1/gallery_subscriptions',
    query: {
      id: `eq.${current.id}`,
      gallery_id: `eq.${input.galleryId}`,
    },
    body: {
      plan_code: input.planCode,
      status: 'active',
      billing_interval: input.billingInterval,
      current_period_start: toIso(now),
      current_period_end: toIso(periodEnd),
      provider: 'manual',
      payment_status: 'not_connected',
      metadata: {
        ...(current.metadata || {}),
        selectedAt: toIso(now),
        selectedWithoutPaymentProvider: true,
        paymentProviderReady: false,
      },
    },
    prefer: 'return=minimal',
  })

  return {
    quoteRequired: false,
    context: await getSubscriptionContextForGallery(input),
    message: 'Plan seçiminiz kaydedildi. Ödeme sağlayıcısı henüz bağlı olmadığı için tahsilat otomatik alınmaz.',
  }
}

export function getSubscriptionPlanCatalog() {
  return {
    plans: SUBSCRIPTION_PLANS,
    planCodes: [...Object.keys(SUBSCRIPTION_PLANS)] as SubscriptionPlanCode[],
    statuses: [...SUBSCRIPTION_STATUSES],
    billingIntervals: [...BILLING_INTERVALS],
  }
}
