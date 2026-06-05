import type { PanelAlert, PanelAlertCenterResponse, PanelAlertSeverity, PanelLead } from '@/lib/panel-types'
import { getLeadFunnelAnalytics } from '@/lib/server/analytics-repository'
import { listPanelLeads } from '@/lib/server/panel-repository'
import { supabaseAdminFetch } from '@/lib/server/supabase-admin'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const UNANSWERED_WINDOW_HOURS = 2

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

export async function getPanelAlerts(ownerEmail?: string, userId?: string): Promise<PanelAlertCenterResponse> {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const [leadsResult, funnelResult, adminNotifications] = await Promise.all([
    listPanelLeads(ownerEmail),
    getLeadFunnelAnalytics('7days', ownerEmail),
    listAdminNotificationAlerts(userId),
  ])

  const periodCounts = countPeriodLeads(leadsResult.items, now)
  const unansweredLeadCount = countUnansweredLeads(leadsResult.items, now)

  const alerts = [
    buildLeadDropAlert(periodCounts.current, periodCounts.previous, nowIso),
    buildUnansweredLeadAlert(unansweredLeadCount, nowIso),
    buildConversionAlert(funnelResult.current.conversionRate, funnelResult.current.totalLeads, nowIso),
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
