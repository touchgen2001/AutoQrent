export const platformUserRoles = ['owner', 'manager', 'support'] as const
export const platformUserStatuses = ['ACTIVE', 'PENDING', 'FROZEN', 'BANNED'] as const

export const platformSubscriptionPlans = ['starter', 'pro', 'premium', 'enterprise'] as const
export const platformSubscriptionStatuses = ['trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended'] as const

export type PlatformUserRole = (typeof platformUserRoles)[number]
export type PlatformUserStatus = (typeof platformUserStatuses)[number]
export type PlatformSubscriptionPlan = (typeof platformSubscriptionPlans)[number]
export type PlatformSubscriptionStatus = (typeof platformSubscriptionStatuses)[number]

export type PlatformAccessStatus = 'active' | 'suspended'

export type PlatformUser = {
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
    role: PlatformUserRole
    accessStatus: PlatformAccessStatus
  }
  subscription: {
    plan: PlatformSubscriptionPlan
    status: PlatformSubscriptionStatus
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
  metrics: {
    vehicleCount: number
    activeVehicleCount: number
    soldVehicleCount: number
    leadCount: number
    openLeadCount: number
  }
}

export type PlatformUserSummary = {
  authUsers: number
  galleryOwners: number
  usersWithGallery: number
  usersWithoutGallery: number
  galleriesWithoutAuth: number
  totalGalleries: number
  totalVehicles: number
  totalLeads: number
}

export const platformUserRoleLabels: Record<PlatformUserRole, string> = {
  owner: 'Galeri sahibi',
  manager: 'Yönetici',
  support: 'Destek',
}

export const platformAccessStatusLabels: Record<PlatformAccessStatus, string> = {
  active: 'Aktif',
  suspended: 'Askıya alındı',
}

export const platformUserStatusLabels: Record<PlatformUserStatus, string> = {
  ACTIVE: 'Aktif',
  PENDING: 'E-posta bekliyor',
  FROZEN: 'Donduruldu',
  BANNED: 'Banlandı',
}

export const platformSubscriptionPlanLabels: Record<PlatformSubscriptionPlan, string> = {
  starter: 'Başlangıç',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Kurumsal',
}

export const platformSubscriptionStatusLabels: Record<PlatformSubscriptionStatus, string> = {
  trialing: 'Deneme',
  active: 'Aktif',
  past_due: 'Ödeme bekliyor',
  canceled: 'İptal',
  expired: 'Süresi doldu',
  suspended: 'Askıya alındı',
}

export function derivePlatformUserStatus(user: PlatformUser): PlatformUserStatus {
  if (user.banned) return 'BANNED'
  if (user.authorization.accessStatus === 'suspended') return 'FROZEN'
  if (!user.emailConfirmed) return 'PENDING'
  return 'ACTIVE'
}
