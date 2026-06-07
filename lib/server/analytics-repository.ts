import type {
  PanelLandingCtaAnalyticsResponse,
  PanelLandingCtaSnapshot,
  PanelLandingCtaSurface,
  PanelLandingCtaSurfaceStat,
  PanelLandingCtaVariantStat,
  PanelLeadFunnelResponse,
  PanelLeadFunnelSnapshot,
  PanelLeadFunnelStage,
  PanelLeadFunnelStageKey,
  PanelShowroomCtaAnalyticsResponse,
  PanelShowroomCtaEventStat,
  PanelShowroomCtaEventType,
  PanelShowroomCtaSnapshot,
  PanelShowroomTargetStat,
} from '@/lib/panel-types'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type LeadStatus = PanelLeadFunnelStageKey

type LeadStatusRow = {
  status: string
  created_at: string
}

type FunnelRange = PanelLeadFunnelResponse['range']

type LandingCtaRow = {
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

type ShowroomCtaRow = {
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

type ShowroomLeadRow = {
  source: string
  created_at: string
}

type GalleryIdRow = {
  id: string
}

const RANGE_DAY_MAP: Record<FunnelRange, number> = {
  '7days': 7,
  '30days': 30,
  '90days': 90,
  'year': 365,
}

const RANGE_LABEL_MAP: Record<FunnelRange, string> = {
  '7days': 'Son 7 Gün',
  '30days': 'Son 30 Gün',
  '90days': 'Son 90 Gün',
  'year': 'Son 365 Gün',
}

const STAGES: Array<{ key: LeadStatus; label: string }> = [
  { key: 'yeni', label: 'Yeni' },
  { key: 'arandi', label: 'Arandı' },
  { key: 'gorusuluyor', label: 'Görüşülüyor' },
  { key: 'test-surusu', label: 'Test Sürüşü' },
  { key: 'satisa-dondu', label: 'Satışa Döndü' },
  { key: 'kayip', label: 'Kayıp' },
]

const LANDING_SURFACES: PanelLandingCtaSurface[] = [
  'header',
  'hero',
  'cta_section',
  'mobile_sticky',
  'pricing',
]

const LANDING_SURFACE_LABELS: Record<PanelLandingCtaSurface, string> = {
  'header': 'Header',
  'hero': 'Hero',
  'cta_section': 'CTA Bölümü',
  'mobile_sticky': 'Mobil Alt CTA',
  'pricing': 'Fiyatlandırma',
}

const LANDING_VARIANTS: Array<'A' | 'B'> = ['A', 'B']
const MIN_VARIANT_IMPRESSIONS = 150
const MIN_VARIANT_CLICKS = 20
const MIN_ROLLOUT_DURATION_DAYS = 14
const MIN_ROLLOUT_UNIQUE_SESSIONS = 300

const SHOWROOM_CTA_EVENTS: PanelShowroomCtaEventType[] = [
  'whatsapp_click',
  'call_click',
  'location_click',
  'website_click',
  'social_click',
  'vehicle_detail_click',
  'lead_form_open',
  'lead_form_submit',
  'share_click',
  'vehicle_whatsapp_click',
  'vehicle_call_click',
  'vehicle_location_click',
  'vehicle_share_click',
  'vehicle_form_open',
]

const SHOWROOM_CTA_LABELS: Record<PanelShowroomCtaEventType, string> = {
  'whatsapp_click': 'Showroom WhatsApp',
  'call_click': 'Showroom Arama',
  'location_click': 'Showroom Konum',
  'website_click': 'Web Sitesi',
  'social_click': 'Sosyal Kanal',
  'vehicle_detail_click': 'Araç Detayı',
  'lead_form_open': 'Showroom Form Açma',
  'lead_form_submit': 'Showroom Form Gönderme',
  'share_click': 'Showroom Paylaşım',
  'vehicle_whatsapp_click': 'Araç WhatsApp',
  'vehicle_call_click': 'Araç Arama',
  'vehicle_location_click': 'Araç Konum',
  'vehicle_share_click': 'Araç Paylaşım',
  'vehicle_form_open': 'Araç Lead Formu',
}

const DIRECT_SHOWROOM_EVENTS = new Set<PanelShowroomCtaEventType>([
  'whatsapp_click',
  'call_click',
  'location_click',
  'vehicle_whatsapp_click',
  'vehicle_call_click',
  'vehicle_location_click',
  'vehicle_form_open',
  'lead_form_submit',
])

function toStageKey(status: string): LeadStatus {
  const found = STAGES.find((stage) => stage.key === status)
  return found ? found.key : 'yeni'
}

function roundToOne(value: number) {
  return Number(value.toFixed(1))
}

function toLandingSurface(surface: unknown): PanelLandingCtaSurface | null {
  if (typeof surface !== 'string') return null
  return LANDING_SURFACES.includes(surface as PanelLandingCtaSurface)
    ? (surface as PanelLandingCtaSurface)
    : null
}

function toVariant(variant: unknown): 'A' | 'B' | null {
  if (variant !== 'A' && variant !== 'B') return null
  return variant
}

function readMetadataValue(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toShowroomCtaEventType(row: ShowroomCtaRow): PanelShowroomCtaEventType | null {
  const eventType = readMetadataValue(row.metadata, 'eventType')
  if (!eventType) return null

  if (row.action === 'public_vehicle_cta_click') {
    if (readMetadataValue(row.metadata, 'source') !== 'showroom') return null
    const vehicleEvent = `vehicle_${eventType}` as PanelShowroomCtaEventType
    return SHOWROOM_CTA_EVENTS.includes(vehicleEvent) ? vehicleEvent : null
  }

  if (row.action !== 'public_showroom_cta_click') return null
  return SHOWROOM_CTA_EVENTS.includes(eventType as PanelShowroomCtaEventType)
    ? (eventType as PanelShowroomCtaEventType)
    : null
}

function getShowroomTarget(row: ShowroomCtaRow, eventType: PanelShowroomCtaEventType) {
  return (
    readMetadataValue(row.metadata, 'target')
    || readMetadataValue(row.metadata, 'vehicleRouteId')
    || SHOWROOM_CTA_LABELS[eventType]
  )
}

function buildShowroomCtaSnapshot(
  periodLabel: string,
  rows: ShowroomCtaRow[],
  leadRows: ShowroomLeadRow[],
): PanelShowroomCtaSnapshot {
  const eventCounts = new Map<PanelShowroomCtaEventType, number>(
    SHOWROOM_CTA_EVENTS.map((eventType) => [eventType, 0]),
  )
  const targetCounts = new Map<string, number>()

  let totalClicks = 0
  let directContactClicks = 0
  let vehicleDetailClicks = 0

  for (const row of rows) {
    const eventType = toShowroomCtaEventType(row)
    if (!eventType) continue

    totalClicks += 1
    eventCounts.set(eventType, (eventCounts.get(eventType) ?? 0) + 1)

    if (DIRECT_SHOWROOM_EVENTS.has(eventType)) {
      directContactClicks += 1
    }

    if (eventType === 'vehicle_detail_click') {
      vehicleDetailClicks += 1
    }

    const target = getShowroomTarget(row, eventType)
    targetCounts.set(target, (targetCounts.get(target) ?? 0) + 1)
  }

  const eventStats: PanelShowroomCtaEventStat[] = SHOWROOM_CTA_EVENTS.map((eventType) => {
    const clicks = eventCounts.get(eventType) ?? 0
    return {
      eventType,
      label: SHOWROOM_CTA_LABELS[eventType],
      clicks,
      share: totalClicks > 0 ? roundToOne((clicks / totalClicks) * 100) : 0,
    }
  })

  const topTargets: PanelShowroomTargetStat[] = [...targetCounts.entries()]
    .map(([target, clicks]) => ({ target, clicks }))
    .sort((left, right) => {
      if (right.clicks !== left.clicks) return right.clicks - left.clicks
      return left.target.localeCompare(right.target, 'tr')
    })
    .slice(0, 6)

  const showroomLeads = leadRows.length

  return {
    periodLabel,
    totalClicks,
    directContactClicks,
    vehicleDetailClicks,
    showroomLeads,
    ctaToLeadRate: totalClicks > 0 ? roundToOne((showroomLeads / totalClicks) * 100) : 0,
    vehicleDetailToLeadRate: vehicleDetailClicks > 0 ? roundToOne((showroomLeads / vehicleDetailClicks) * 100) : 0,
    uniqueTargets: targetCounts.size,
    eventStats,
    topTargets,
  }
}

function buildShowroomRecommendations(
  current: PanelShowroomCtaSnapshot,
  previous: PanelShowroomCtaSnapshot,
): PanelShowroomCtaAnalyticsResponse['recommendations'] {
  const recommendations: PanelShowroomCtaAnalyticsResponse['recommendations'] = []

  if (current.totalClicks === 0) {
    recommendations.push({
      level: 'info',
      title: 'Showroom CTA verisi bekleniyor',
      detail: 'Bu dönemde public showroom CTA tıklaması yok. Sahte veri gösterilmiyor.',
    })
    return recommendations
  }

  if (current.directContactClicks > 0) {
    recommendations.push({
      level: 'success',
      title: 'Direkt iletişim niyeti var',
      detail: `${current.directContactClicks} gerçek CTA tıklaması arama, WhatsApp, konum veya form akışına yöneldi.`,
    })
  }

  if (current.vehicleDetailClicks > 0 && current.showroomLeads === 0) {
    recommendations.push({
      level: 'warning',
      title: 'Araç detayı ilgi alıyor, lead oluşmuyor',
      detail: `${current.vehicleDetailClicks} araç detayı tıklaması var ancak showroom kaynaklı lead yok. Araç detayındaki form ve WhatsApp akışını kontrol edin.`,
    })
  }

  if (current.totalClicks < previous.totalClicks) {
    recommendations.push({
      level: 'warning',
      title: 'Showroom CTA tıklaması düştü',
      detail: `Önceki döneme göre ${previous.totalClicks - current.totalClicks} daha az CTA tıklaması var. Showroom linki, araç kartları ve mobil CTA görünürlüğünü kontrol edin.`,
    })
  }

  if (current.ctaToLeadRate > 0 && current.ctaToLeadRate >= previous.ctaToLeadRate) {
    recommendations.push({
      level: 'success',
      title: 'CTA lead oranı korunuyor',
      detail: `Showroom CTA -> lead oranı %${current.ctaToLeadRate}. Bu oran sadece kayıtlı CTA ve lead verisinden hesaplandı.`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      level: 'info',
      title: 'Kritik showroom sinyali yok',
      detail: 'Showroom CTA verileri düşük hacimde. Daha net karar için birkaç gün daha gerçek kullanım verisi toplayın.',
    })
  }

  return recommendations
}

function buildFunnelSnapshot(
  periodLabel: string,
  rows: LeadStatusRow[],
): PanelLeadFunnelSnapshot {
  const stageCounts: Record<LeadStatus, number> = {
    'yeni': 0,
    'arandi': 0,
    'gorusuluyor': 0,
    'test-surusu': 0,
    'satisa-dondu': 0,
    'kayip': 0,
  }

  for (const row of rows) {
    const key = toStageKey(row.status)
    stageCounts[key] += 1
  }

  const totalLeads = rows.length
  const totalWon = stageCounts['satisa-dondu']
  const totalLost = stageCounts['kayip']

  const stages: PanelLeadFunnelStage[] = STAGES.map((stage, index) => {
    const count = stageCounts[stage.key]
    const previousCount = index === 0 ? totalLeads : stageCounts[STAGES[index - 1].key]

    return {
      key: stage.key,
      label: stage.label,
      count,
      rateFromTotal: totalLeads > 0 ? roundToOne((count / totalLeads) * 100) : 0,
      rateFromPrevious: previousCount > 0 ? roundToOne((count / previousCount) * 100) : 0,
    }
  })

  return {
    periodLabel,
    totalLeads,
    totalWon,
    totalLost,
    conversionRate: totalLeads > 0 ? roundToOne((totalWon / totalLeads) * 100) : 0,
    stages,
  }
}

async function resolveGalleryId(ownerEmail?: string) {
  if (!ownerEmail) return null

  const rows = await supabaseAdminFetch<GalleryIdRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id',
      owner_email: `eq.${ownerEmail}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  return rows[0]?.id || null
}

export async function getLeadFunnelAnalytics(
  range: FunnelRange,
  ownerEmail?: string,
): Promise<PanelLeadFunnelResponse> {
  requireSupabaseAdminConfig()

  const rangeDays = RANGE_DAY_MAP[range]
  const rangeLabel = RANGE_LABEL_MAP[range]

  const now = new Date()
  const currentEnd = now
  const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousStart = new Date(currentStart.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousEnd = currentStart

  const galleryId = await resolveGalleryId(ownerEmail)

  const rows = await supabaseAdminFetch<LeadStatusRow[]>({
    path: '/rest/v1/leads',
    query: {
      select: 'status,created_at',
      ...(galleryId ? { gallery_id: `eq.${galleryId}` } : {}),
      and: `(created_at.gte.${previousStart.toISOString()},created_at.lt.${currentEnd.toISOString()})`,
      order: 'created_at.desc',
      limit: 50000,
    },
  })

  const currentRows = rows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return timestamp >= currentStart.getTime() && timestamp < currentEnd.getTime()
  })

  const previousRows = rows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return timestamp >= previousStart.getTime() && timestamp < previousEnd.getTime()
  })

  const current = buildFunnelSnapshot(rangeLabel, currentRows)
  const previous = buildFunnelSnapshot(`Önceki ${rangeLabel.toLowerCase()}`, previousRows)

  return {
    source: 'supabase',
    range,
    current,
    previous,
    trend: {
      conversionRateDelta: roundToOne(current.conversionRate - previous.conversionRate),
      wonLeadDelta: current.totalWon - previous.totalWon,
    },
  }
}

export async function getShowroomCtaAnalytics(
  range: FunnelRange,
  ownerEmail?: string,
): Promise<PanelShowroomCtaAnalyticsResponse> {
  requireSupabaseAdminConfig()

  const rangeDays = RANGE_DAY_MAP[range]
  const rangeLabel = RANGE_LABEL_MAP[range]

  const now = new Date()
  const currentEnd = now
  const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousStart = new Date(currentStart.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousEnd = currentStart

  const galleryId = await resolveGalleryId(ownerEmail)

  if (!galleryId) {
    const current = buildShowroomCtaSnapshot(rangeLabel, [], [])
    const previous = buildShowroomCtaSnapshot(`Önceki ${rangeLabel.toLowerCase()}`, [], [])

    return {
      source: 'supabase',
      range,
      current,
      previous,
      trend: {
        clickDelta: 0,
        leadDelta: 0,
        ctaToLeadRateDelta: 0,
        vehicleDetailToLeadRateDelta: 0,
      },
      recommendations: buildShowroomRecommendations(current, previous),
    }
  }

  const [ctaRows, leadRows] = await Promise.all([
    supabaseAdminFetch<ShowroomCtaRow[]>({
      path: '/rest/v1/audit_logs',
      query: {
        select: 'action,metadata,created_at',
        action: 'in.(public_showroom_cta_click,public_vehicle_cta_click)',
        'metadata->>galleryId': `eq.${galleryId}`,
        and: `(created_at.gte.${previousStart.toISOString()},created_at.lt.${currentEnd.toISOString()})`,
        order: 'created_at.desc',
        limit: 200000,
      },
    }),
    supabaseAdminFetch<ShowroomLeadRow[]>({
      path: '/rest/v1/leads',
      query: {
        select: 'source,created_at',
        gallery_id: `eq.${galleryId}`,
        source: 'eq.showroom',
        and: `(created_at.gte.${previousStart.toISOString()},created_at.lt.${currentEnd.toISOString()})`,
        order: 'created_at.desc',
        limit: 50000,
      },
    }),
  ])

  const currentRows = ctaRows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return timestamp >= currentStart.getTime() && timestamp < currentEnd.getTime()
  })

  const previousRows = ctaRows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return timestamp >= previousStart.getTime() && timestamp < previousEnd.getTime()
  })

  const currentLeadRows = leadRows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return row.source === 'showroom' && timestamp >= currentStart.getTime() && timestamp < currentEnd.getTime()
  })

  const previousLeadRows = leadRows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return row.source === 'showroom' && timestamp >= previousStart.getTime() && timestamp < previousEnd.getTime()
  })

  const current = buildShowroomCtaSnapshot(rangeLabel, currentRows, currentLeadRows)
  const previous = buildShowroomCtaSnapshot(`Önceki ${rangeLabel.toLowerCase()}`, previousRows, previousLeadRows)

  return {
    source: 'supabase',
    range,
    current,
    previous,
    trend: {
      clickDelta: current.totalClicks - previous.totalClicks,
      leadDelta: current.showroomLeads - previous.showroomLeads,
      ctaToLeadRateDelta: roundToOne(current.ctaToLeadRate - previous.ctaToLeadRate),
      vehicleDetailToLeadRateDelta: roundToOne(
        current.vehicleDetailToLeadRate - previous.vehicleDetailToLeadRate,
      ),
    },
    recommendations: buildShowroomRecommendations(current, previous),
  }
}

function buildLandingCtaSnapshot(
  periodLabel: string,
  rows: LandingCtaRow[],
): PanelLandingCtaSnapshot {
  const surfaceMetrics = new Map<PanelLandingCtaSurface, { impressions: number; clicks: number }>(
    LANDING_SURFACES.map((surface) => [surface, { impressions: 0, clicks: 0 }]),
  )
  const variantMetrics = new Map<'A' | 'B', { impressions: number; clicks: number }>(
    LANDING_VARIANTS.map((variant) => [variant, { impressions: 0, clicks: 0 }]),
  )
  const uniqueSessions = new Set<string>()
  const uniqueDays = new Set<string>()

  let impressions = 0
  let clicks = 0

  for (const row of rows) {
    if (typeof row.created_at === 'string' && row.created_at.length >= 10) {
      uniqueDays.add(row.created_at.slice(0, 10))
    }

    const sessionId = readMetadataValue(row.metadata, 'sessionId') || readMetadataValue(row.metadata, 'session_id')
    if (sessionId) {
      uniqueSessions.add(sessionId)
    }

    const surface = toLandingSurface(readMetadataValue(row.metadata, 'surface'))
    const variant = toVariant(readMetadataValue(row.metadata, 'variant'))

    if (row.action === 'landing_cta_impression') {
      impressions += 1

      if (surface) {
        const metric = surfaceMetrics.get(surface)
        if (metric) metric.impressions += 1
      }
      if (variant) {
        const metric = variantMetrics.get(variant)
        if (metric) metric.impressions += 1
      }
      continue
    }

    if (row.action === 'landing_cta_click') {
      clicks += 1

      if (surface) {
        const metric = surfaceMetrics.get(surface)
        if (metric) metric.clicks += 1
      }
      if (variant) {
        const metric = variantMetrics.get(variant)
        if (metric) metric.clicks += 1
      }
    }
  }

  const surfaceStats: PanelLandingCtaSurfaceStat[] = LANDING_SURFACES.map((surface) => {
    const metric = surfaceMetrics.get(surface) || { impressions: 0, clicks: 0 }
    return {
      surface,
      label: LANDING_SURFACE_LABELS[surface],
      impressions: metric.impressions,
      clicks: metric.clicks,
      ctr: metric.impressions > 0 ? roundToOne((metric.clicks / metric.impressions) * 100) : 0,
    }
  })

  const variantStats: PanelLandingCtaVariantStat[] = LANDING_VARIANTS.map((variant) => {
    const metric = variantMetrics.get(variant) || { impressions: 0, clicks: 0 }
    return {
      variant,
      impressions: metric.impressions,
      clicks: metric.clicks,
      ctr: metric.impressions > 0 ? roundToOne((metric.clicks / metric.impressions) * 100) : 0,
    }
  })

  return {
    periodLabel,
    impressions,
    clicks,
    ctr: impressions > 0 ? roundToOne((clicks / impressions) * 100) : 0,
    uniqueSessions: uniqueSessions.size,
    observedDays: uniqueDays.size,
    surfaceStats,
    variantStats,
  }
}

function buildLandingSummary(current: PanelLandingCtaSnapshot) {
  const variantStats = [...current.variantStats].sort((left, right) => {
    if (right.ctr !== left.ctr) return right.ctr - left.ctr
    return right.clicks - left.clicks
  })

  const winner = variantStats[0]
  const runner = variantStats[1]
  const winnerVariant: 'A' | 'B' | null = winner?.variant || null
  const winnerCtrGap = winner && runner
    ? roundToOne(winner.ctr - runner.ctr)
    : 0

  const minimumSampleReached = current.variantStats.every(
    (variant) => variant.impressions >= MIN_VARIANT_IMPRESSIONS && variant.clicks >= MIN_VARIANT_CLICKS,
  )
  const minimumDurationReached = current.observedDays >= MIN_ROLLOUT_DURATION_DAYS
  const minimumSessionReached = current.uniqueSessions >= MIN_ROLLOUT_UNIQUE_SESSIONS

  let confidence: 'low' | 'medium' | 'high' = 'low'

  if (minimumSampleReached && winnerCtrGap >= 2.0) {
    confidence = 'high'
  } else if (minimumSampleReached && winnerCtrGap >= 1.0) {
    confidence = 'medium'
  }

  return {
    winnerVariant,
    winnerCtrGap,
    minimumSampleReached,
    minimumDurationReached,
    minimumSessionReached,
    requiredDurationDays: MIN_ROLLOUT_DURATION_DAYS,
    requiredUniqueSessions: MIN_ROLLOUT_UNIQUE_SESSIONS,
    observedDays: current.observedDays,
    observedUniqueSessions: current.uniqueSessions,
    rolloutEligible: Boolean(
      winnerVariant
      && minimumSampleReached
      && minimumDurationReached
      && minimumSessionReached
      && confidence !== 'low',
    ),
    confidence,
  }
}

function buildLandingRecommendations(
  current: PanelLandingCtaSnapshot,
  previous: PanelLandingCtaSnapshot,
  summary: ReturnType<typeof buildLandingSummary>,
): PanelLandingCtaAnalyticsResponse['recommendations'] {
  const recommendations: PanelLandingCtaAnalyticsResponse['recommendations'] = []

  if (current.impressions < 200) {
    recommendations.push({
      level: 'info',
      title: 'Veri hacmi düşük',
      detail: `Toplam ${current.impressions} gösterim var. Karar için en az 200+ gösterim toplayın.`,
    })
  }

  if (!summary.minimumSampleReached) {
    recommendations.push({
      level: 'warning',
      title: 'A/B test örneklemi yetersiz',
      detail: `Her varyant için en az ${MIN_VARIANT_IMPRESSIONS} gösterim ve ${MIN_VARIANT_CLICKS} tıklama hedefleyin.`,
    })
  }

  if (!summary.minimumDurationReached) {
    recommendations.push({
      level: 'warning',
      title: 'Test süresi yetersiz',
      detail: `Kazananı sabitlemeden önce en az ${summary.requiredDurationDays} gün veri toplayın.`,
    })
  }

  if (!summary.minimumSessionReached) {
    recommendations.push({
      level: 'warning',
      title: 'Benzersiz oturum hacmi düşük',
      detail: `Rollout için en az ${summary.requiredUniqueSessions} benzersiz oturum hedeflenir.`,
    })
  } else if (summary.winnerVariant && summary.confidence === 'high') {
    recommendations.push({
      level: 'success',
      title: `${summary.winnerVariant} varyantı güçlü kazanan`,
      detail: `CTR farkı %${summary.winnerCtrGap}. Kazanan mesajı ana CTA akışında varsayılan yapabilirsiniz.`,
    })
  } else if (summary.winnerVariant && summary.confidence === 'medium') {
    recommendations.push({
      level: 'info',
      title: `${summary.winnerVariant} varyantı önde, doğrulama gerekli`,
      detail: `Fark var ancak kesin karar için testi 3-7 gün daha sürdürmeniz önerilir.`,
    })
  }

  const underperformingSurfaces = current.surfaceStats.filter((surface) => (
    surface.impressions >= 80 && current.ctr > 0 && surface.ctr < current.ctr * 0.6
  ))

  if (underperformingSurfaces.length > 0) {
    const labels = underperformingSurfaces.map((surface) => surface.label).join(', ')
    recommendations.push({
      level: 'warning',
      title: 'Düşük performanslı CTA yüzeyi var',
      detail: `${labels} yüzeylerinde CTR ortalamanın altında. Metin ve teklif konumunu test edin.`,
    })
  } else if (current.surfaceStats.some((surface) => surface.impressions >= 80)) {
    recommendations.push({
      level: 'success',
      title: 'Yüzey performansı dengeli',
      detail: 'Yüksek hacimli CTA yüzeylerinde belirgin bir zayıf nokta gözükmüyor.',
    })
  }

  if (previous.ctr - current.ctr >= 1.0) {
    recommendations.push({
      level: 'warning',
      title: 'CTR düşüş trendine girdi',
      detail: `Önceki döneme göre CTR ${roundToOne(previous.ctr - current.ctr)} puan düştü. Hero başlık ve teklif mesajını yenileyin.`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      level: 'info',
      title: 'Aksiyon gerektiren kritik sinyal yok',
      detail: 'Mevcut varyantları izlemeye devam edin ve yeni kreatif testleri planlayın.',
    })
  }

  return recommendations
}

export async function getLandingCtaAnalytics(
  range: FunnelRange,
  ownerEmail?: string,
): Promise<PanelLandingCtaAnalyticsResponse> {
  requireSupabaseAdminConfig()
  const galleryId = await resolveGalleryId(ownerEmail)

  const rangeDays = RANGE_DAY_MAP[range]
  const rangeLabel = RANGE_LABEL_MAP[range]

  const now = new Date()
  const currentEnd = now
  const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousStart = new Date(currentStart.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousEnd = currentStart

  const rows = await supabaseAdminFetch<LandingCtaRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'action,metadata,created_at',
      action: 'in.(landing_cta_impression,landing_cta_click)',
      ...(galleryId ? { 'metadata->>galleryId': `eq.${galleryId}` } : {}),
      and: `(created_at.gte.${previousStart.toISOString()},created_at.lt.${currentEnd.toISOString()})`,
      order: 'created_at.desc',
      limit: 200000,
    },
  })

  const currentRows = rows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return timestamp >= currentStart.getTime() && timestamp < currentEnd.getTime()
  })

  const previousRows = rows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime()
    return timestamp >= previousStart.getTime() && timestamp < previousEnd.getTime()
  })

  const current = buildLandingCtaSnapshot(rangeLabel, currentRows)
  const previous = buildLandingCtaSnapshot(`Önceki ${rangeLabel.toLowerCase()}`, previousRows)
  const summary = buildLandingSummary(current)
  const recommendations = buildLandingRecommendations(current, previous, summary)

  return {
    source: 'supabase',
    range,
    current,
    previous,
    trend: {
      ctrDelta: roundToOne(current.ctr - previous.ctr),
      clickDelta: current.clicks - previous.clicks,
      impressionDelta: current.impressions - previous.impressions,
    },
    summary,
    recommendations,
  }
}
