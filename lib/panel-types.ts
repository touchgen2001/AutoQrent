export type PanelVehicleStatus = 'active' | 'reserved' | 'sold'

export type PanelVehicle = {
  id: string
  routeId: string
  publicUrl: string
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
  favorites?: number
  image: string | null
  photos: string[]
  description?: string
  createdAt?: string
  priceDroppedAt?: string | null
  previousPrice?: number | null
  bodyType?: string
  engineSize?: string
  horsePower?: string
  plateNumber?: string
  hasDamage?: 'yes' | 'no'
  damageDetails?: string
  previousOwners?: string
  serviceHistory?: 'yes' | 'partial' | 'no'
  warrantyStatus?: 'yes' | 'no'
  purchasePrice?: number
  expenseTotal?: number
  targetProfit?: number
}

// One row of the "en çok indirilen araç görselleri" panel card. `downloads` is the
// honest count of social-share image downloads (single previews + ZIP packs); it is
// never inflated to imply confirmed social-media shares.
export type PanelTopSharedVehicle = {
  vehicleId: string
  vehicleTitle: string
  downloads: number
  lastDownloadAt: string
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
  bodyType?: string
  engineSize?: string
  horsePower?: string
  plateNumber?: string
  hasDamage?: 'yes' | 'no'
  damageDetails?: string
  previousOwners?: string
  serviceHistory?: 'yes' | 'partial' | 'no'
  warrantyStatus?: 'yes' | 'no'
  purchasePrice?: number
  expenseTotal?: number
  targetProfit?: number
  description?: string
  photos?: string[]
}

export type PanelVehicleImageQuotaSnapshot = {
  dailyLimit: number
  dailyUsed: number
  dailyRemaining: number
  dailyWindowHours: number
  dailyWindowStartedAt: string
  totalActiveLimit: number
  totalActive: number
  totalRemaining: number
  maxFilesPerRequest: number
  maxFileSizeBytes: number
  allowedMimeTypes: string[]
}

export type PanelVehicleImageQuotaResponse = {
  ok: true
  source: 'supabase'
  galleryId: string
  quota: PanelVehicleImageQuotaSnapshot
}

export type PanelAuditAction =
  | 'vehicle_create'
  | 'vehicle_delete'
  | 'vehicle_update'
  | 'lead_status_change'
  | 'lead_note_add'
  | 'lead_follow_up_change'
  | 'lead_whatsapp_open'
  | 'reservation_create'
  | 'reservation_update'
  | 'review_moderate'
  | 'vehicle_restore'
  | 'customer_task_create'
  | 'customer_task_status_change'
  | 'contact_form_submit'
  | 'contact_form_blocked'
  | 'public_vehicle_cta_click'
  | 'public_showroom_cta_click'
  | 'vehicle_social_image_download'
  | 'vehicle_social_image_share'
  | 'image_upload'
  | 'image_delete'
  | 'image_reject'
  | 'landing_cta_impression'
  | 'landing_cta_click'
  | 'landing_cta_config_update'
  | 'registration_funnel_event'
  | 'public_slug_rotation'
  | 'admin_user_delete'
  | 'admin_user_authorization_update'
  | 'admin_user_status_update'
  | 'admin_user_email_verify'
  | 'admin_user_password_reset'
  | 'admin_moderation_action'
  | 'admin_subscription_update'
  | 'admin_notification_send'
  | 'admin_account_create'
  | 'admin_account_update'
  | 'admin_account_status_update'
  | 'admin_account_password_reset'
  | 'admin_account_soft_delete'
  | 'admin_account_login'

export type PanelAuditEntityType =
  | 'vehicle'
  | 'lead'
  | 'contact'
  | 'system'
  | 'marketing'
  | 'user'
  | 'subscription'
  | 'notification'
  | 'moderation'
  | 'admin_account'
  | 'reservation'
  | 'review'

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

export type PanelLandingCtaSurface = 'header' | 'hero' | 'cta_section' | 'mobile_sticky' | 'pricing' | 'contact'

export type PanelLandingCtaAction =
  | 'primary'
  | 'secondary'
  | 'call'
  | 'whatsapp'
  | 'demo'
  | 'plan_start'
  | 'contact_submit'
  | 'billing_toggle'

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

export type PanelLandingCtaPageStat = {
  pagePath: string
  impressions: number
  clicks: number
  ctr: number
}

export type PanelLandingCtaActionStat = {
  action: PanelLandingCtaAction
  label: string
  clicks: number
  share: number
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
  pageStats: PanelLandingCtaPageStat[]
  actionStats: PanelLandingCtaActionStat[]
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

export type PanelRegistrationFunnelStageKey =
  | 'registration_view'
  | 'registration_submit'
  | 'registration_success'
  | 'onboarding_view'
  | 'onboarding_step_2'
  | 'onboarding_step_3'
  | 'onboarding_step_4'
  | 'onboarding_complete'

export type PanelRegistrationFunnelStage = {
  key: PanelRegistrationFunnelStageKey
  label: string
  sessions: number
  rateFromStart: number
  rateFromPrevious: number
  dropoffFromPrevious: number
}

export type PanelRegistrationFunnelSnapshot = {
  periodLabel: string
  startedSessions: number
  completedSessions: number
  completionRate: number
  skippedSessions: number
  stages: PanelRegistrationFunnelStage[]
}

export type PanelRegistrationFunnelAnalyticsResponse = {
  source: 'supabase'
  range: '7days' | '30days' | '90days' | 'year'
  current: PanelRegistrationFunnelSnapshot
  previous: PanelRegistrationFunnelSnapshot
  trend: {
    completionRateDelta: number
    completedSessionDelta: number
  }
  recommendations: Array<{
    level: 'info' | 'warning' | 'success'
    title: string
    detail: string
  }>
}

export type PanelShowroomCtaEventType =
  | 'whatsapp_click'
  | 'call_click'
  | 'location_click'
  | 'website_click'
  | 'social_click'
  | 'vehicle_detail_click'
  | 'lead_form_open'
  | 'lead_form_submit'
  | 'share_click'
  | 'vehicle_whatsapp_click'
  | 'vehicle_call_click'
  | 'vehicle_location_click'
  | 'vehicle_share_click'
  | 'vehicle_form_open'
  | 'vehicle_favorite'

export type PanelShowroomCtaEventStat = {
  eventType: PanelShowroomCtaEventType
  label: string
  clicks: number
  share: number
}

export type PanelShowroomTargetStat = {
  target: string
  clicks: number
}

export type PanelShowroomCtaSnapshot = {
  periodLabel: string
  totalClicks: number
  directContactClicks: number
  vehicleDetailClicks: number
  showroomLeads: number
  ctaToLeadRate: number
  vehicleDetailToLeadRate: number
  uniqueTargets: number
  eventStats: PanelShowroomCtaEventStat[]
  topTargets: PanelShowroomTargetStat[]
}

export type PanelShowroomCtaAnalyticsResponse = {
  source: 'supabase'
  range: '7days' | '30days' | '90days' | 'year'
  current: PanelShowroomCtaSnapshot
  previous: PanelShowroomCtaSnapshot
  trend: {
    clickDelta: number
    leadDelta: number
    ctaToLeadRateDelta: number
    vehicleDetailToLeadRateDelta: number
  }
  recommendations: Array<{
    level: 'info' | 'warning' | 'success'
    title: string
    detail: string
  }>
}

export type PanelAlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type PanelAlertType =
  | 'new_lead'
  | 'lead_drop'
  | 'unanswered_leads'
  | 'low_conversion'
  | 'follow_up_due'
  | 'follow_up_overdue'
  | 'price_drop_recommendation'
  | 'sales_goal_behind'
  | 'admin_notification'
  | 'pending_reservations'
  | 'pending_reviews'
  | 'user_limit'
  | 'recycle_bin'

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

export type PanelLeadActivity = {
  id: string
  type: 'created' | 'status_change' | 'note_add' | 'follow_up_change' | 'whatsapp'
  title: string
  description: string
  createdAt: string
}

export type PanelStockAgingBucket = {
  key: '0-30' | '31-60' | '61-90' | '90+'
  label: string
  count: number
}

export type PanelStockAgingVehicle = {
  id: string
  title: string
  ageDays: number
  price: number
  scans: number
  leads: number
}

export type PanelManagerReport = {
  generatedAt: string
  currentPeriodLabel: string
  previousPeriodLabel: string
  metrics: {
    newLeads: number
    newLeadsDelta: number
    wonLeads: number
    wonLeadsDelta: number
    vehiclesAdded: number
    vehiclesAddedDelta: number
    overdueFollowUps: number
    followUpsDueToday: number
  }
  stockAging: {
    averageAgeDays: number
    agedStockCount: number
    buckets: PanelStockAgingBucket[]
    oldestVehicles: PanelStockAgingVehicle[]
  }
  profitability: {
    totalCapital: number
    potentialProfit: number
    realizedProfit: number
    averageMarginRate: number
    vehiclesWithCostData: number
    topProfitVehicles: Array<{
      id: string
      title: string
      status: PanelVehicleStatus
      profit: number
      marginRate: number
    }>
  }
  salesGoals: {
    monthlyTarget: number
    wonThisMonth: number
    remaining: number
    pipeline: number
    progressRate: number
    label: string
  }
  qrPerformance: {
    totalScans: number
    totalLeads: number
    conversionRate: number
    topVehicles: Array<{
      id: string
      title: string
      scans: number
      leads: number
      conversionRate: number
      signal: string
    }>
  }
  priceDropRecommendations: Array<{
    id: string
    title: string
    currentPrice: number
    suggestedPrice: number
    suggestedDiscountRate: number
    detail: string
  }>
}

export type PanelCustomerTaskType = 'appointment' | 'post_sale'
export type PanelCustomerTaskStatus = 'open' | 'completed' | 'cancelled'

export type PanelCustomerTask = {
  id: string
  type: PanelCustomerTaskType
  status: PanelCustomerTaskStatus
  title: string
  scheduledAt: string
  customerName: string
  customerPhone: string
  leadId?: string
  vehicleId?: string
  vehicleTitle?: string
  note?: string
  createdAt: string
  updatedAt: string
}
