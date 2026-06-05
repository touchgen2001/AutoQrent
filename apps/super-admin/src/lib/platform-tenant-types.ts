export const tenantPackages = ['Başlangıç', 'Pro', 'Premium', 'Kurumsal'] as const
export const tenantStatuses = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'BANNED', 'DELETED'] as const
export const tenantPaymentStatuses = ['PAID', 'TRIAL', 'PAST_DUE', 'UNPAID', 'CANCELED'] as const

export type TenantPackage = (typeof tenantPackages)[number]
export type TenantStatus = (typeof tenantStatuses)[number]
export type TenantPaymentStatus = (typeof tenantPaymentStatuses)[number]

export type Tenant = {
  id: string
  galleryName: string
  owner: string
  ownerEmail: string
  package: TenantPackage
  status: TenantStatus
  paymentStatus: TenantPaymentStatus
  vehicleCount: number
  lastLogin: string | null
  createdAt: string
}

export type TenantCreateInput = {
  galleryName: string
  owner: string
  ownerEmail: string
  package: TenantPackage
}

export type TenantUpdateInput = Partial<
  Pick<Tenant, 'galleryName' | 'owner' | 'ownerEmail' | 'package' | 'status' | 'paymentStatus' | 'vehicleCount'>
> & {
  reason?: string
}
