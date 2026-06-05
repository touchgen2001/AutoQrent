export type AdminFinancePlan = 'starter' | 'pro' | 'premium' | 'enterprise' | 'unknown'
export type AdminFinanceStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'suspended' | 'unknown'
export type AdminFinanceRiskLevel = 'OK' | 'WATCH' | 'RISK'

export type AdminFinanceAccount = {
  userId: string
  email: string
  fullName: string | null
  phone: string | null
  galleryId: string | null
  galleryName: string | null
  plan: AdminFinancePlan
  status: AdminFinanceStatus
  monthlyRevenue: number
  revenueSource: string | null
  subscriptionUpdatedAt: string | null
  createdAt: string | null
  lastSignInAt: string | null
  banned: boolean
  accessStatus: string
  riskLevel: AdminFinanceRiskLevel
  riskReason: string
}

export type AdminFinanceBreakdownRow = {
  key: AdminFinancePlan | AdminFinanceStatus
  label: string
  totalAccounts: number
  activeAccounts: number
  trialAccounts: number
  pastDueAccounts: number
  cancelledAccounts: number
  monthlyRevenue: number
  unpricedAccounts: number
}

export type AdminFinanceAuditEvent = {
  id: string
  action: string
  actor: string
  target: string
  detail: string
  createdAt: string
}

export type AdminFinanceSnapshot = {
  generatedAt: string
  source: 'supabase'
  widgets: {
    monthlyRevenue: number
    billableAccounts: number
    activeAccounts: number
    trialAccounts: number
    pastDueAccounts: number
    cancelledAccounts: number
    unpricedActiveAccounts: number
    galleriesWithOwner: number
  }
  planBreakdown: AdminFinanceBreakdownRow[]
  statusBreakdown: AdminFinanceBreakdownRow[]
  accounts: AdminFinanceAccount[]
  auditEvents: AdminFinanceAuditEvent[]
  notes: {
    revenue: string
    paymentProvider: string
    dataPolicy: string
  }
}

export const financePlanLabels: Record<AdminFinancePlan, string> = {
  starter: 'Başlangıç',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Kurumsal',
  unknown: 'Paket tanımsız',
}

export const financeStatusLabels: Record<AdminFinanceStatus, string> = {
  trialing: 'Deneme',
  active: 'Aktif',
  past_due: 'Ödeme bekliyor',
  canceled: 'İptal',
  expired: 'Süresi doldu',
  suspended: 'Askıya alındı',
  unknown: 'Durum tanımsız',
}

export const financeRiskLabels: Record<AdminFinanceRiskLevel, string> = {
  OK: 'Normal',
  WATCH: 'İzle',
  RISK: 'Risk',
}
