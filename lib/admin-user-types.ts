export const ADMIN_ACCOUNT_ROLES = ['owner', 'manager', 'support'] as const
export type AdminAccountRole = (typeof ADMIN_ACCOUNT_ROLES)[number]

export const ADMIN_ACCESS_STATUSES = ['active', 'suspended'] as const
export type AdminAccessStatus = (typeof ADMIN_ACCESS_STATUSES)[number]

export const ADMIN_SUBSCRIPTION_PLANS = ['starter', 'pro', 'premium', 'enterprise'] as const
export type AdminSubscriptionPlan = (typeof ADMIN_SUBSCRIPTION_PLANS)[number]

export const ADMIN_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended'] as const
export type AdminSubscriptionStatus = (typeof ADMIN_SUBSCRIPTION_STATUSES)[number]

export const adminAccountRoleLabels: Record<AdminAccountRole, string> = {
  owner: 'Galeri sahibi',
  manager: 'Yönetici',
  support: 'Destek',
}

export const adminAccessStatusLabels: Record<AdminAccessStatus, string> = {
  active: 'Aktif',
  suspended: 'Askıya alındı',
}

export const adminSubscriptionPlanLabels: Record<AdminSubscriptionPlan, string> = {
  starter: 'Başlangıç',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Kurumsal',
}

export const adminSubscriptionStatusLabels: Record<AdminSubscriptionStatus, string> = {
  trialing: 'Deneme',
  active: 'Aktif',
  past_due: 'Ödeme bekliyor',
  canceled: 'İptal',
  expired: 'Süresi doldu',
  suspended: 'Askıya alındı',
}

export function isAdminAccountRole(value: unknown): value is AdminAccountRole {
  return typeof value === 'string' && ADMIN_ACCOUNT_ROLES.includes(value as AdminAccountRole)
}

export function isAdminAccessStatus(value: unknown): value is AdminAccessStatus {
  return typeof value === 'string' && ADMIN_ACCESS_STATUSES.includes(value as AdminAccessStatus)
}

export function isAdminSubscriptionPlan(value: unknown): value is AdminSubscriptionPlan {
  return typeof value === 'string' && ADMIN_SUBSCRIPTION_PLANS.includes(value as AdminSubscriptionPlan)
}

export function isAdminSubscriptionStatus(value: unknown): value is AdminSubscriptionStatus {
  return typeof value === 'string' && ADMIN_SUBSCRIPTION_STATUSES.includes(value as AdminSubscriptionStatus)
}
