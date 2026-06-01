export type PanelVehicleStatus = 'active' | 'reserved' | 'sold'

export type PanelVehicle = {
  id: string
  brand: string
  model: string
  variant: string
  year: number
  price: number
  mileage: number
  fuel: string
  transmission: string
  color: string
  status: PanelVehicleStatus
  scans: number
  leads: number
  image: string | null
  description?: string
}

export type PanelLeadSource = 'qr' | 'showroom' | 'whatsapp' | 'telefon' | 'form' | 'test-surusu'
export type PanelLeadStatus = 'yeni' | 'arandi' | 'gorusuluyor' | 'test-surusu' | 'satisa-dondu' | 'kayip'

export type PanelLead = {
  id: string
  vehicleId?: string
  vehicleTitle?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  source: PanelLeadSource
  status: PanelLeadStatus
  notes: string[]
  followUpDate?: string
  createdAt: string
  updatedAt: string
}

export type VehicleCreateInput = {
  brand: string
  model: string
  variant?: string
  year: number
  price: number
  mileage: number
  fuel: string
  transmission: string
  color?: string
  description?: string
  photos?: string[]
}

export type PanelAuditAction =
  | 'vehicle_create'
  | 'vehicle_delete'
  | 'vehicle_update'
  | 'lead_status_change'
  | 'lead_note_add'
  | 'contact_form_submit'
  | 'contact_form_blocked'
  | 'landing_cta_impression'
  | 'landing_cta_click'
  | 'landing_cta_config_update'

export type PanelAuditEntityType = 'vehicle' | 'lead' | 'contact' | 'system' | 'marketing'

export type PanelAuditLog = {
  id: number
  action: PanelAuditAction
  entityType: PanelAuditEntityType
  entityId: string
  actorEmail?: string
  actorRole?: string
  source: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type PanelLeadFunnelStageKey =
  | 'yeni'
  | 'arandi'
  | 'gorusuluyor'
  | 'test-surusu'
  | 'satisa-dondu'
  | 'kayip'

export type PanelLeadFunnelStage = {
  key: PanelLeadFunnelStageKey
  label: string
  count: number
  rateFromTotal: number
  rateFromPrevious: number
}

export type PanelLeadFunnelSnapshot = {
  periodLabel: string
  totalLeads: number
  totalWon: number
  totalLost: number
  conversionRate: number
  stages: PanelLeadFunnelStage[]
}

export type PanelLeadFunnelResponse = {
  source: 'supabase'
  range: '7days' | '30days' | '90days' | 'year'
  current: PanelLeadFunnelSnapshot
  previous: PanelLeadFunnelSnapshot
  trend: {
    conversionRateDelta: number
    wonLeadDelta: number
  }
}

export type PanelLandingCtaSurface = 'header' | 'hero' | 'cta_section' | 'mobile_sticky' | 'pricing'

export type PanelLandingCtaSurfaceStat = {
  surface: PanelLandingCtaSurface
  label: string
  impressions: number
  clicks: number
  ctr: number
}

export type PanelLandingCtaVariantStat = {
  variant: 'A' | 'B'
  impressions: number
  clicks: number
  ctr: number
}

export type LandingCtaMode = 'auto' | 'forced'

export type PanelLandingCtaConfig = {
  galleryId: string
  mode: LandingCtaMode
  forcedVariant: 'A' | 'B' | null
  updatedAt: string | null
}

export type PanelLandingCtaSnapshot = {
  periodLabel: string
  impressions: number
  clicks: number
  ctr: number
  uniqueSessions: number
  observedDays: number
  surfaceStats: PanelLandingCtaSurfaceStat[]
  variantStats: PanelLandingCtaVariantStat[]
}

export type PanelLandingCtaAnalyticsResponse = {
  source: 'supabase'
  range: '7days' | '30days' | '90days' | 'year'
  current: PanelLandingCtaSnapshot
  previous: PanelLandingCtaSnapshot
  trend: {
    ctrDelta: number
    clickDelta: number
    impressionDelta: number
  }
  summary: {
    winnerVariant: 'A' | 'B' | null
    winnerCtrGap: number
    minimumSampleReached: boolean
    minimumDurationReached: boolean
    minimumSessionReached: boolean
    requiredDurationDays: number
    requiredUniqueSessions: number
    observedDays: number
    observedUniqueSessions: number
    rolloutEligible: boolean
    confidence: 'low' | 'medium' | 'high'
  }
  recommendations: Array<{
    level: 'info' | 'warning' | 'success'
    title: string
    detail: string
  }>
}

export type PanelAlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type PanelAlertType = 'lead_drop' | 'unanswered_leads' | 'low_conversion'

export type PanelAlert = {
  id: string
  type: PanelAlertType
  severity: PanelAlertSeverity
  title: string
  description: string
  metricValue: string
  threshold: string
  actionLabel: string
  actionHref: string
  createdAt: string
}

export type PanelAlertSummary = {
  open: number
  critical: number
  high: number
  medium: number
  low: number
}

export type PanelAlertCenterResponse = {
  source: 'supabase'
  generatedAt: string
  alerts: PanelAlert[]
  summary: PanelAlertSummary
}
