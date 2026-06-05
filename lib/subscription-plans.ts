export const TRIAL_DAYS = 14

export const SUBSCRIPTION_PLAN_CODES = ['starter', 'pro', 'premium', 'enterprise'] as const
export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLAN_CODES)[number]

export const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const BILLING_INTERVALS = ['monthly', 'yearly'] as const
export type BillingInterval = (typeof BILLING_INTERVALS)[number]

export const SUBSCRIPTION_FEATURES = [
  'vehicles.create',
  'vehicles.bulk_import',
  'qr.generate',
  'leads.advanced',
  'analytics.advanced',
  'domain.custom',
  'branding.remove',
  'export.excel',
] as const
export type SubscriptionFeature = (typeof SUBSCRIPTION_FEATURES)[number]

export type SubscriptionFeatureMap = Record<SubscriptionFeature, boolean>

export type SubscriptionPlanDefinition = {
  code: SubscriptionPlanCode
  name: string
  summary: string
  monthlyPrice: number | null
  yearlyPrice: number | null
  vehicleLimit: number | null
  userLimit: number | null
  features: SubscriptionFeatureMap
  highlights: string[]
  cta: string
  quoteOnly?: boolean
}

const STARTER_FEATURES: SubscriptionFeatureMap = {
  'vehicles.create': true,
  'vehicles.bulk_import': false,
  'qr.generate': true,
  'leads.advanced': false,
  'analytics.advanced': false,
  'domain.custom': false,
  'branding.remove': false,
  'export.excel': false,
}

const PRO_FEATURES: SubscriptionFeatureMap = {
  'vehicles.create': true,
  'vehicles.bulk_import': true,
  'qr.generate': true,
  'leads.advanced': true,
  'analytics.advanced': true,
  'domain.custom': true,
  'branding.remove': false,
  'export.excel': true,
}

const PREMIUM_FEATURES: SubscriptionFeatureMap = {
  'vehicles.create': true,
  'vehicles.bulk_import': true,
  'qr.generate': true,
  'leads.advanced': true,
  'analytics.advanced': true,
  'domain.custom': true,
  'branding.remove': true,
  'export.excel': true,
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, SubscriptionPlanDefinition> = {
  starter: {
    code: 'starter',
    name: 'Başlangıç',
    summary: 'Tek galeri sahibinin QR vitrinini ve temel müşteri talebi akışını yönetmesi için.',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    vehicleLimit: 15,
    userLimit: 1,
    features: STARTER_FEATURES,
    highlights: [
      '15 araç limiti',
      'QR kod ve herkese açık galeri sayfası',
      'Araç detay sayfası ve temel müşteri talebi toplama',
      'Temel analitik',
    ],
    cta: 'Başlangıç Planına Geç',
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    summary: 'Tek kullanıcı hesabıyla daha yüksek araç hacmi, gelişmiş takip ve dışa aktarım isteyen galeriler için.',
    monthlyPrice: 2500,
    yearlyPrice: 25000,
    vehicleLimit: 75,
    userLimit: 1,
    features: PRO_FEATURES,
    highlights: [
      '75 araç limiti',
      'Gelişmiş müşteri talebi yönetimi',
      'Gelişmiş analitik, Excel dışa aktarım ve toplu araç ekleme',
      'Özel domain, logo ve marka ayarları',
    ],
    cta: 'Pro Planına Geç',
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    summary: 'Tek kullanıcı hesabıyla yüksek stok, marka kontrolü ve gelişmiş performans raporları için.',
    monthlyPrice: 4990,
    yearlyPrice: 49900,
    vehicleLimit: 200,
    userLimit: 1,
    features: PREMIUM_FEATURES,
    highlights: [
      '200 araç limiti',
      'Tek kullanıcı hesabı',
      'Lead, araç görüntülenme ve ilgi gören araç raporları',
      'Marka kaldırma ve öncelikli destek',
    ],
    cta: 'Premium Planına Geç',
  },
  enterprise: {
    code: 'enterprise',
    name: 'Kurumsal',
    summary: 'Tek kullanıcı hesabıyla özel limit, API ve danışmanlık gerektiren galeriler için.',
    monthlyPrice: null,
    yearlyPrice: null,
    vehicleLimit: null,
    userLimit: 1,
    features: PREMIUM_FEATURES,
    highlights: [
      'Tek kullanıcı hesabı',
      'Özel araç limiti',
      'API, veri taşıma ve özel kurulum desteği',
      'Özel destek ve danışmanlık',
    ],
    cta: 'Teklif Al',
    quoteOnly: true,
  },
}

export const SUBSCRIPTION_PLAN_ALIASES: Record<string, SubscriptionPlanCode> = {
  baslangic: 'starter',
  başlangıç: 'starter',
  starter: 'starter',
  profesyonel: 'pro',
  pro: 'pro',
  galeri_plus: 'premium',
  galeri_plus_plus: 'premium',
  premium: 'premium',
  kurumsal: 'enterprise',
  enterprise: 'enterprise',
}

export const SUBSCRIPTION_STATUS_ALIASES: Record<string, SubscriptionStatus> = {
  trial: 'trialing',
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  cancelled: 'canceled',
  canceled: 'canceled',
  expired: 'expired',
  suspended: 'suspended',
}

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  trialing: 'Deneme',
  active: 'Aktif',
  past_due: 'Ödeme bekliyor',
  canceled: 'İptal edildi',
  expired: 'Süresi doldu',
  suspended: 'Askıya alındı',
}

export const subscriptionFeatureLabels: Record<SubscriptionFeature, string> = {
  'vehicles.create': 'Araç ekleme',
  'vehicles.bulk_import': 'Toplu araç ekleme',
  'qr.generate': 'QR üretimi',
  'leads.advanced': 'Gelişmiş müşteri talebi yönetimi',
  'analytics.advanced': 'Gelişmiş analitik',
  'domain.custom': 'Özel domain',
  'branding.remove': 'Cebindegaleri markasını kaldırma',
  'export.excel': 'Excel dışa aktarım',
}

export function normalizeSubscriptionPlanCode(value: unknown): SubscriptionPlanCode {
  if (typeof value !== 'string') return 'starter'
  return SUBSCRIPTION_PLAN_ALIASES[value.trim().toLowerCase()] || 'starter'
}

export function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  if (typeof value !== 'string') return 'trialing'
  return SUBSCRIPTION_STATUS_ALIASES[value.trim().toLowerCase()] || 'trialing'
}

export function isSubscriptionPlanCode(value: unknown): value is SubscriptionPlanCode {
  return typeof value === 'string' && SUBSCRIPTION_PLAN_CODES.includes(value as SubscriptionPlanCode)
}

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === 'string' && SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === 'string' && BILLING_INTERVALS.includes(value as BillingInterval)
}

export function getSubscriptionPlanDefinition(planCode: SubscriptionPlanCode) {
  return SUBSCRIPTION_PLANS[planCode]
}

export function formatPlanPrice(value: number | null) {
  if (value === null) return 'Teklif ile'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}
