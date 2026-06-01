import { mockLeads } from '@/lib/mock-data'
import type {
  PanelLeadFunnelResponse,
  PanelLeadFunnelSnapshot,
  PanelLeadFunnelStage,
  PanelLeadFunnelStageKey,
} from '@/lib/panel-types'
import { hasSupabaseAdmin, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type LeadStatus = PanelLeadFunnelStageKey

type LeadStatusRow = {
  status: string
  created_at: string
}

type FunnelRange = PanelLeadFunnelResponse['range']

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

function toStageKey(status: string): LeadStatus {
  const found = STAGES.find((stage) => stage.key === status)
  return found ? found.key : 'yeni'
}

function roundToOne(value: number) {
  return Number(value.toFixed(1))
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

function buildMockRows(rangeDays: number) {
  const now = Date.now()

  return mockLeads.map((lead, index) => {
    const syntheticDayOffset = index % Math.max(rangeDays, 1)
    const createdAt = new Date(now - syntheticDayOffset * 24 * 60 * 60 * 1000).toISOString()

    return {
      status: lead.status,
      created_at: createdAt,
    } satisfies LeadStatusRow
  })
}

export async function getLeadFunnelAnalytics(
  range: FunnelRange,
): Promise<PanelLeadFunnelResponse> {
  const rangeDays = RANGE_DAY_MAP[range]
  const rangeLabel = RANGE_LABEL_MAP[range]

  const now = new Date()
  const currentEnd = now
  const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousStart = new Date(currentStart.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const previousEnd = currentStart

  let rows: LeadStatusRow[] = []
  let source: PanelLeadFunnelResponse['source'] = 'mock'

  if (hasSupabaseAdmin()) {
    const queryRows = await supabaseAdminFetch<LeadStatusRow[]>({
      path: '/rest/v1/leads',
      query: {
        select: 'status,created_at',
        and: `(created_at.gte.${previousStart.toISOString()},created_at.lt.${currentEnd.toISOString()})`,
        order: 'created_at.desc',
        limit: 50000,
      },
    }).catch(() => [])

    rows = queryRows
    source = 'supabase'
  } else {
    rows = buildMockRows(rangeDays)
    source = 'mock'
  }

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
    source,
    range,
    current,
    previous,
    trend: {
      conversionRateDelta: roundToOne(current.conversionRate - previous.conversionRate),
      wonLeadDelta: current.totalWon - previous.totalWon,
    },
  }
}
