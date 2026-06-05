export type PlatformDashboardTrendPoint = {
  label: string
  value: number
}

export type PlatformDashboardHealthStatus = 'OPERATIONAL' | 'WATCH' | 'ISSUE'

export type PlatformDashboardHealthCheck = {
  label: string
  status: PlatformDashboardHealthStatus
  detail: string
  latencyMs: number
}

export type PlatformDashboardActivity = {
  id: string
  type: 'gallery' | 'lead' | 'qr' | 'audit'
  title: string
  detail: string
  at: string
  status: PlatformDashboardHealthStatus
}

export type PlatformDashboardSnapshot = {
  generatedAt: string
  source: 'supabase'
  sourceLabel: string
  widgets: {
    totalGalleries: number
    activeGalleries: number
    passiveGalleries: number
    totalVehicles: number
    totalQr: number
    dailyQrScans: number
    totalLeads: number
    monthlyRevenue: number
    todayRegistrations: number
    trialUsers: number
    systemHealthScore: number
    systemHealthLabel: string
  }
  trends: {
    registrations: PlatformDashboardTrendPoint[]
    subscriptions: PlatformDashboardTrendPoint[]
    qrUsage: PlatformDashboardTrendPoint[]
    leads: PlatformDashboardTrendPoint[]
  }
  healthChecks: PlatformDashboardHealthCheck[]
  recentActivity: PlatformDashboardActivity[]
  notes: {
    revenue: string
    qr: string
    dataPolicy: string
  }
}
