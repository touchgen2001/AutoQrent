import type { PanelAlert, PanelAlertCenterResponse, PanelAlertSeverity, PanelLead, PanelVehicle } from '@/lib/panel-types'
import { getLeadFunnelAnalytics } from '@/lib/server/analytics-repository'
import { listPanelLeads, listPanelVehicles } from '@/lib/server/panel-repository'
import { supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { buildSalesGoalSnapshot, getPriceDropRecommendation } from '@/lib/sales-intelligence'
import { resolvePanelGalleryIdByEmail } from '@/lib/server/panel-team-repository'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const UNANSWERED_WINDOW_HOURS = 2
const NEW_LEAD_WINDOW_HOURS = 24

type AdminNotificationRow = {
  id: number
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

const SEVERITY_ORDER: Record<PanelAlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function roundToOne(value: number) {
  return Number(value.toFixed(1))
}

function buildNewLeadAlert(leads: PanelLead[], now: number): PanelAlert | null {
  const windowStart = now - NEW_LEAD_WINDOW_HOURS * HOUR_MS

  const freshLeads = leads.filter((lead) => {
    if (lead.status !== 'yeni') return false
    const createdAt = toTimestamp(lead.createdAt)
    return createdAt !== null && createdAt >= windowStart
  })

  if (freshLeads.length === 0) {
    return null
  }

  const latest = freshLeads.reduce((latestLead, lead) =>
    (toTimestamp(lead.createdAt) ?? 0) > (toTimestamp(latestLead.createdAt) ?? 0) ? lead : latestLead,
  )

  const vehiclePart = latest.vehicleTitle ? ` · ${latest.vehicleTitle}` : ''
  const countLabel = freshLeads.length === 1 ? 'Yeni Müşteri Talebi' : `${freshLeads.length} Yeni Müşteri Talebi`

  return {
    id: 'new-lead-alert',
    type: 'new_lead',
    severity: 'high',
    title: countLabel,
    description: `Son ${NEW_LEAD_WINDOW_HOURS} saatte gelen ve henüz dönüş yapılmamış talepler var. İlk teması hızlı kurmak satışa dönüşümü artırır.`,
    metricValue: `${freshLeads.length} yeni talep · Son: ${latest.customerName}${vehiclePart}`,
    threshold: 'Durum: Yeni (yanıt bekliyor)',
    actionLabel: 'Talepleri Görüntüle',
    actionHref: '/panel/leadler',
    createdAt: latest.createdAt,
  }
}

function buildLeadDropAlert(currentLeads: number, previousLeads: number, nowIso: string): PanelAlert | null {
  if (previousLeads < 4) {
    return null
  }

  if (currentLeads >= previousLeads) {
    return null
  }

  const dropRate = roundToOne(((previousLeads - currentLeads) / previousLeads) * 100)
  if (dropRate < 20) {
    return null
  }

  const severity: PanelAlertSeverity = dropRate >= 40 ? 'critical' : 'high'
  return {
    id: 'lead-drop-alert',
    type: 'lead_drop',
    severity,
    title: 'Müşteri Talebi Akışı Düşüşte',
    description: 'Son 7 günlük yeni müşteri talebi sayısı, önceki 7 güne göre belirgin şekilde geriledi.',
    metricValue: `%${dropRate} düşüş (${previousLeads} → ${currentLeads})`,
    threshold: 'Eşik: %20+ düşüş',
    actionLabel: 'Müşteri Taleplerini İncele',
    actionHref: '/panel/leadler',
    createdAt: nowIso,
  }
}

function buildUnansweredLeadAlert(unansweredCount: number, nowIso: string): PanelAlert | null {
  if (unansweredCount < 5) {
    return null
  }

  let severity: PanelAlertSeverity = 'medium'
  if (unansweredCount >= 15) {
    severity = 'critical'
  } else if (unansweredCount >= 10) {
    severity = 'high'
  }

  return {
    id: 'unanswered-leads-alert',
    type: 'unanswered_leads',
    severity,
    title: 'Yanıtsız Müşteri Talebi Birikimi',
    description: `Son ${UNANSWERED_WINDOW_HOURS} saattir işlem yapılmayan yeni müşteri talepleri var.`,
    metricValue: `${unansweredCount} müşteri talebi bekliyor`,
    threshold: 'Eşik: 5+ yanıtsız müşteri talebi',
    actionLabel: 'Takip Başlat',
    actionHref: '/panel/leadler',
    createdAt: nowIso,
  }
}

function buildFollowUpAlert(leads: PanelLead[], todayKey: string, nowIso: string, overdue: boolean): PanelAlert | null {
  const openStatuses = new Set<PanelLead['status']>(['yeni', 'arandi', 'gorusuluyor', 'test-surusu'])
  const count = leads.filter((lead) => {
    if (!lead.followUpDate || !openStatuses.has(lead.status)) return false
    return overdue ? lead.followUpDate < todayKey : lead.followUpDate === todayKey
  }).length

  if (count === 0) return null

  return {
    id: overdue ? 'follow-up-overdue-alert' : 'follow-up-due-alert',
    type: overdue ? 'follow_up_overdue' : 'follow_up_due',
    severity: overdue ? (count >= 5 ? 'critical' : 'high') : 'medium',
    title: overdue ? 'Gecikmiş Müşteri Takipleri' : 'Bugün Aranacak Müşteriler',
    description: overdue
      ? 'Planlanan takip tarihi geçmiş açık müşteri talepleri işlem bekliyor.'
      : 'Takip tarihi bugün olan müşteri talepleri hazır.',
    metricValue: `${count} müşteri talebi`,
    threshold: overdue ? 'Takip tarihi geçmiş' : 'Takip tarihi bugün',
    actionLabel: overdue ? 'Gecikmişleri Aç' : 'Bugünkü Listeyi Aç',
    actionHref: `/panel/leadler?view=${overdue ? 'overdue' : 'today'}`,
    createdAt: nowIso,
  }
}

function buildConversionAlert(conversionRate: number, totalLeads: number, nowIso: string): PanelAlert | null {
  if (totalLeads < 5) {
    return null
  }

  if (conversionRate >= 12) {
    return null
  }

  let severity: PanelAlertSeverity = 'medium'
  if (conversionRate < 6) {
    severity = 'critical'
  } else if (conversionRate < 9) {
    severity = 'high'
  }

  return {
    id: 'low-conversion-alert',
    type: 'low_conversion',
    severity,
    title: 'Düşük Dönüşüm Oranı',
    description: 'Müşteri talebi hunisinde satışa dönüşüm hedef seviyenin altında kaldı.',
    metricValue: `%${conversionRate} dönüşüm`,
    threshold: 'Eşik: %12 altı',
    actionLabel: 'Huniyi Analiz Et',
    actionHref: '/panel/analitik',
    createdAt: nowIso,
  }
}

function buildPriceDropRecommendationAlert(vehicles: PanelVehicle[], now: number, nowIso: string): PanelAlert | null {
  const candidates = vehicles
    .filter((vehicle) => vehicle.status === 'active')
    .map((vehicle) => ({
      vehicle,
      recommendation: getPriceDropRecommendation(vehicle, now),
    }))
    .filter((item) => item.recommendation.shouldDrop)

  if (candidates.length === 0) return null

  const topCandidate = candidates.sort((left, right) =>
    right.recommendation.suggestedDiscountRate - left.recommendation.suggestedDiscountRate,
  )[0]

  return {
    id: 'price-drop-recommendation-alert',
    type: 'price_drop_recommendation',
    severity: candidates.length >= 5 ? 'high' : 'medium',
    title: 'Fiyat Revizyonu Önerilen Araçlar',
    description: 'Stok yaşı, QR tarama ve lead sinyallerine göre fiyatı yeniden gözden geçirilecek araçlar var.',
    metricValue: `${candidates.length} araç · Öne çıkan: ${topCandidate.vehicle.brand} ${topCandidate.vehicle.model}`,
    threshold: 'Eşik: yaşlı stok veya yüksek tarama/düşük lead',
    actionLabel: 'Raporu Aç',
    actionHref: '/panel/raporlar#fiyat-onerileri',
    createdAt: nowIso,
  }
}

function buildSalesGoalBehindAlert(vehicles: PanelVehicle[], leads: PanelLead[], now: Date): PanelAlert | null {
  const goal = buildSalesGoalSnapshot(vehicles, leads, now)
  if (goal.monthlyTarget <= 0 || goal.remaining <= 0) return null

  const dayOfMonth = Number(new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: 'Europe/Istanbul' }).format(now))
  const expectedProgress = Math.min(100, Math.round((dayOfMonth / 30) * 100))
  if (goal.progressRate >= expectedProgress - 15) return null

  return {
    id: 'sales-goal-behind-alert',
    type: 'sales_goal_behind',
    severity: goal.progressRate < expectedProgress - 35 ? 'high' : 'medium',
    title: 'Aylık Satış Hedefi Geride',
    description: 'Bu ayki satış hedefi beklenen ilerlemenin altında. Sıcak pipeline ve takip listesi önceliklendirilmeli.',
    metricValue: `${goal.wonThisMonth}/${goal.monthlyTarget} satış · ${goal.pipeline} sıcak pipeline`,
    threshold: `Beklenen ilerleme: %${expectedProgress}`,
    actionLabel: 'Satış Hedeflerini Aç',
    actionHref: '/panel/raporlar',
    createdAt: now.toISOString(),
  }
}

async function listAdminNotificationAlerts(userId?: string): Promise<PanelAlert[]> {
  if (!userId) return []

  const rows = await supabaseAdminFetch<AdminNotificationRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'id,entity_id,metadata,created_at',
      action: 'eq.admin_notification_send',
      entity_type: 'eq.notification',
      or: `(entity_id.eq.${userId},entity_id.eq.bulk)`,
      order: 'created_at.desc',
      limit: 5,
    },
  })

  return rows.filter((row) => row.metadata?.channel === 'panel').map((row) => {
    const metadata = row.metadata || {}
    const title = typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title.trim() : 'Admin bildirimi'
    const description =
      typeof metadata.messagePreview === 'string' && metadata.messagePreview.trim()
        ? metadata.messagePreview.trim()
        : 'Admin tarafından panel bildirimi oluşturuldu.'

    return {
      id: `admin-notification-${row.id}`,
      type: 'admin_notification',
      severity: 'low',
      title,
      description,
      metricValue: row.entity_id === 'bulk' ? 'Toplu bildirim' : 'Tekil bildirim',
      threshold: 'Kaynak: Admin paneli',
      actionLabel: 'Panelde Kal',
      actionHref: '/panel',
      createdAt: row.created_at,
    }
  })
}

function countPeriodLeads(leads: PanelLead[], now: number) {
  const currentStart = now - 7 * DAY_MS
  const previousStart = now - 14 * DAY_MS

  let current = 0
  let previous = 0

  for (const lead of leads) {
    const createdAt = toTimestamp(lead.createdAt)
    if (!createdAt) continue

    if (createdAt >= currentStart && createdAt < now) {
      current += 1
      continue
    }

    if (createdAt >= previousStart && createdAt < currentStart) {
      previous += 1
    }
  }

  return {
    current,
    previous,
  }
}

function countUnansweredLeads(leads: PanelLead[], now: number) {
  let unanswered = 0

  for (const lead of leads) {
    if (lead.status !== 'yeni') continue

    const updatedAt = toTimestamp(lead.updatedAt)
    const createdAt = toTimestamp(lead.createdAt)
    const referenceTime = updatedAt || createdAt

    if (!referenceTime) continue

    if (now - referenceTime >= UNANSWERED_WINDOW_HOURS * HOUR_MS) {
      unanswered += 1
    }
  }

  return unanswered
}

function buildSummary(alerts: PanelAlert[]): PanelAlertCenterResponse['summary'] {
  return alerts.reduce(
    (summary, alert) => {
      summary.open += 1
      summary[alert.severity] += 1
      return summary
    },
    {
      open: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
  )
}

async function listOperationsAlerts(ownerEmail: string | undefined, nowIso: string): Promise<PanelAlert[]> {
  if (!ownerEmail) return []
  const galleryId = await resolvePanelGalleryIdByEmail(ownerEmail)
  if (!galleryId) return []

  const [reservations, reviews, deletedVehicles] = await Promise.all([
    supabaseAdminFetch<Array<{ id: string }>>({
      path: '/rest/v1/vehicle_reservations',
      query: { select: 'id', gallery_id: `eq.${galleryId}`, status: 'eq.pending', limit: 1000 },
    }).catch(() => []),
    supabaseAdminFetch<Array<{ id: string }>>({
      path: '/rest/v1/gallery_reviews',
      query: { select: 'id', gallery_id: `eq.${galleryId}`, status: 'eq.pending', limit: 1000 },
    }).catch(() => []),
    supabaseAdminFetch<Array<{ id: string }>>({
      path: '/rest/v1/vehicles',
      query: { select: 'id', gallery_id: `eq.${galleryId}`, deleted_at: 'not.is.null', limit: 1000 },
    }).catch(() => []),
  ])

  const alerts: PanelAlert[] = []
  if (reservations.length > 0) {
    alerts.push({
      id: 'pending-reservations-alert',
      type: 'pending_reservations',
      severity: reservations.length >= 5 ? 'high' : 'medium',
      title: 'Onay Bekleyen Rezervasyonlar',
      description: 'Müşteriler araçlarınız için online rezervasyon talebi gönderdi.',
      metricValue: `${reservations.length} rezervasyon talebi`,
      threshold: 'Durum: Onay bekliyor',
      actionLabel: 'Rezervasyonları Aç',
      actionHref: '/panel/rezervasyonlar',
      createdAt: nowIso,
    })
  }
  if (reviews.length > 0) {
    alerts.push({
      id: 'pending-reviews-alert',
      type: 'pending_reviews',
      severity: 'low',
      title: 'İncelenecek Müşteri Yorumları',
      description: 'Yayınlanmadan önce kontrol edilmesi gereken yeni galeri yorumları var.',
      metricValue: `${reviews.length} yorum`,
      threshold: 'Durum: İncelemede',
      actionLabel: 'Yorumları Aç',
      actionHref: '/panel/yorumlar',
      createdAt: nowIso,
    })
  }
  if (deletedVehicles.length > 0) {
    alerts.push({
      id: 'recycle-bin-alert',
      type: 'recycle_bin',
      severity: 'low',
      title: 'Geri Alınabilir Araçlar',
      description: 'Silinen araçlar ve görselleri çöp kutusunda korunuyor.',
      metricValue: `${deletedVehicles.length} araç`,
      threshold: 'Kalıcı silme yapılmadı',
      actionLabel: 'Çöp Kutusunu Aç',
      actionHref: '/panel/arsiv',
      createdAt: nowIso,
    })
  }

  return alerts
}

export async function getPanelAlerts(ownerEmail?: string, userId?: string): Promise<PanelAlertCenterResponse> {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(now))

  const [leadsResult, vehiclesResult, funnelResult, adminNotifications, operationsAlerts] = await Promise.all([
    listPanelLeads(ownerEmail),
    listPanelVehicles(ownerEmail),
    getLeadFunnelAnalytics('7days', ownerEmail),
    listAdminNotificationAlerts(userId),
    listOperationsAlerts(ownerEmail, nowIso),
  ])

  const periodCounts = countPeriodLeads(leadsResult.items, now)
  const unansweredLeadCount = countUnansweredLeads(leadsResult.items, now)

  const alerts = [
    buildNewLeadAlert(leadsResult.items, now),
    buildLeadDropAlert(periodCounts.current, periodCounts.previous, nowIso),
    buildUnansweredLeadAlert(unansweredLeadCount, nowIso),
    buildFollowUpAlert(leadsResult.items, todayKey, nowIso, true),
    buildFollowUpAlert(leadsResult.items, todayKey, nowIso, false),
    buildConversionAlert(funnelResult.current.conversionRate, funnelResult.current.totalLeads, nowIso),
    buildPriceDropRecommendationAlert(vehiclesResult.items, now, nowIso),
    buildSalesGoalBehindAlert(vehiclesResult.items, leadsResult.items, new Date(now)),
    ...operationsAlerts,
    ...adminNotifications,
  ]
    .filter((item): item is PanelAlert => Boolean(item))
    .sort((left, right) => SEVERITY_ORDER[right.severity] - SEVERITY_ORDER[left.severity])

  return {
    source: 'supabase',
    generatedAt: nowIso,
    alerts,
    summary: buildSummary(alerts),
  }
}
