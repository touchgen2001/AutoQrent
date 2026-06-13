import type {
  PanelLead,
  PanelManagerReport,
  PanelStockAgingBucket,
  PanelStockAgingVehicle,
  PanelVehicle,
} from '@/lib/panel-types'
import { listPanelLeads, listPanelVehicles } from '@/lib/server/panel-repository'
import {
  buildQrPerformanceRows,
  buildSalesGoalSnapshot,
  getPriceDropRecommendation,
} from '@/lib/sales-intelligence'

const DAY_MS = 24 * 60 * 60 * 1000
const OPEN_LEAD_STATUSES = new Set<PanelLead['status']>(['yeni', 'arandi', 'gorusuluyor', 'test-surusu'])

function toTimestamp(value: string | undefined) {
  const timestamp = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : null
}

function getTodayKeyIstanbul(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now)
}

export function getVehicleAgeDays(vehicle: Pick<PanelVehicle, 'createdAt'>, now = Date.now()) {
  const createdAt = toTimestamp(vehicle.createdAt)
  if (createdAt === null) return 0
  return Math.max(0, Math.floor((now - createdAt) / DAY_MS))
}

function getAgeBucket(ageDays: number): PanelStockAgingBucket['key'] {
  if (ageDays <= 30) return '0-30'
  if (ageDays <= 60) return '31-60'
  if (ageDays <= 90) return '61-90'
  return '90+'
}

function buildStockAging(vehicles: PanelVehicle[], now: number): PanelManagerReport['stockAging'] {
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'active')
  const buckets: PanelStockAgingBucket[] = [
    { key: '0-30', label: '0-30 gün', count: 0 },
    { key: '31-60', label: '31-60 gün', count: 0 },
    { key: '61-90', label: '61-90 gün', count: 0 },
    { key: '90+', label: '90+ gün', count: 0 },
  ]
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  const agedVehicles: PanelStockAgingVehicle[] = activeVehicles.map((vehicle) => {
    const ageDays = getVehicleAgeDays(vehicle, now)
    const bucket = bucketMap.get(getAgeBucket(ageDays))
    if (bucket) bucket.count += 1

    return {
      id: vehicle.id,
      title: `${vehicle.brand} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`,
      ageDays,
      price: vehicle.price,
      scans: vehicle.scans,
      leads: vehicle.leads,
    }
  })

  const totalAgeDays = agedVehicles.reduce((sum, vehicle) => sum + vehicle.ageDays, 0)

  return {
    averageAgeDays: agedVehicles.length > 0 ? Math.round(totalAgeDays / agedVehicles.length) : 0,
    agedStockCount: agedVehicles.filter((vehicle) => vehicle.ageDays > 60).length,
    buckets,
    oldestVehicles: agedVehicles.sort((left, right) => right.ageDays - left.ageDays).slice(0, 8),
  }
}

function buildProfitability(vehicles: PanelVehicle[]): PanelManagerReport['profitability'] {
  const withCost = vehicles.filter((vehicle) => typeof vehicle.purchasePrice === 'number' && vehicle.purchasePrice > 0)
  const rows = withCost.map((vehicle) => {
    const totalCost = (vehicle.purchasePrice || 0) + (vehicle.expenseTotal || 0)
    const profit = vehicle.price - totalCost
    return {
      id: vehicle.id,
      title: `${vehicle.brand} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`,
      status: vehicle.status,
      totalCost,
      profit,
      marginRate: vehicle.price > 0 ? Math.round((profit / vehicle.price) * 1000) / 10 : 0,
    }
  })
  const totalMarginRate = rows.reduce((sum, row) => sum + row.marginRate, 0)

  return {
    totalCapital: rows.filter((row) => row.status !== 'sold').reduce((sum, row) => sum + row.totalCost, 0),
    potentialProfit: rows.filter((row) => row.status !== 'sold').reduce((sum, row) => sum + row.profit, 0),
    realizedProfit: rows.filter((row) => row.status === 'sold').reduce((sum, row) => sum + row.profit, 0),
    averageMarginRate: rows.length > 0 ? Math.round((totalMarginRate / rows.length) * 10) / 10 : 0,
    vehiclesWithCostData: rows.length,
    topProfitVehicles: rows
      .sort((left, right) => right.profit - left.profit)
      .slice(0, 8)
      .map(({ id, title, status, profit, marginRate }) => ({ id, title, status, profit, marginRate })),
  }
}

function buildQrPerformance(vehicles: PanelVehicle[]): PanelManagerReport['qrPerformance'] {
  const rows = buildQrPerformanceRows(vehicles)
  const totalScans = vehicles.reduce((sum, vehicle) => sum + vehicle.scans, 0)
  const totalLeads = vehicles.reduce((sum, vehicle) => sum + vehicle.leads, 0)

  return {
    totalScans,
    totalLeads,
    conversionRate: totalScans > 0 ? Math.round((totalLeads / totalScans) * 1000) / 10 : 0,
    topVehicles: rows.slice(0, 8),
  }
}

function buildPriceDropRecommendations(vehicles: PanelVehicle[], now: number): PanelManagerReport['priceDropRecommendations'] {
  return vehicles
    .map((vehicle) => {
      const recommendation = getPriceDropRecommendation(vehicle, now)
      return {
        vehicle,
        recommendation,
      }
    })
    .filter((item) => item.recommendation.shouldDrop)
    .sort((left, right) => right.recommendation.suggestedDiscountRate - left.recommendation.suggestedDiscountRate)
    .slice(0, 8)
    .map(({ vehicle, recommendation }) => ({
      id: vehicle.id,
      title: `${vehicle.brand} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`,
      currentPrice: vehicle.price,
      suggestedPrice: recommendation.suggestedPrice,
      suggestedDiscountRate: recommendation.suggestedDiscountRate,
      detail: recommendation.detail,
    }))
}

function countCreatedInPeriod(items: Array<{ createdAt?: string }>, start: number, end: number) {
  return items.filter((item) => {
    const createdAt = toTimestamp(item.createdAt)
    return createdAt !== null && createdAt >= start && createdAt < end
  }).length
}

function countWonInPeriod(leads: PanelLead[], start: number, end: number) {
  return leads.filter((lead) => {
    if (lead.status !== 'satisa-dondu') return false
    const updatedAt = toTimestamp(lead.updatedAt)
    return updatedAt !== null && updatedAt >= start && updatedAt < end
  }).length
}

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

function formatPeriodLabel(start: number, end: number) {
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Istanbul',
  })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end - 1))}`
}

export async function getPanelManagerReport(ownerEmail?: string): Promise<PanelManagerReport> {
  const now = Date.now()
  const currentStart = now - 7 * DAY_MS
  const previousStart = now - 14 * DAY_MS
  const todayKey = getTodayKeyIstanbul(new Date(now))
  const [leadsResult, vehiclesResult] = await Promise.all([
    listPanelLeads(ownerEmail),
    listPanelVehicles(ownerEmail),
  ])

  const currentNewLeads = countCreatedInPeriod(leadsResult.items, currentStart, now)
  const previousNewLeads = countCreatedInPeriod(leadsResult.items, previousStart, currentStart)
  const currentWonLeads = countWonInPeriod(leadsResult.items, currentStart, now)
  const previousWonLeads = countWonInPeriod(leadsResult.items, previousStart, currentStart)
  const currentVehicles = countCreatedInPeriod(vehiclesResult.items, currentStart, now)
  const previousVehicles = countCreatedInPeriod(vehiclesResult.items, previousStart, currentStart)

  return {
    generatedAt: new Date(now).toISOString(),
    currentPeriodLabel: formatPeriodLabel(currentStart, now),
    previousPeriodLabel: formatPeriodLabel(previousStart, currentStart),
    metrics: {
      newLeads: currentNewLeads,
      newLeadsDelta: delta(currentNewLeads, previousNewLeads),
      wonLeads: currentWonLeads,
      wonLeadsDelta: delta(currentWonLeads, previousWonLeads),
      vehiclesAdded: currentVehicles,
      vehiclesAddedDelta: delta(currentVehicles, previousVehicles),
      overdueFollowUps: leadsResult.items.filter(
        (lead) => Boolean(lead.followUpDate) && (lead.followUpDate as string) < todayKey && OPEN_LEAD_STATUSES.has(lead.status),
      ).length,
      followUpsDueToday: leadsResult.items.filter(
        (lead) => lead.followUpDate === todayKey && OPEN_LEAD_STATUSES.has(lead.status),
      ).length,
    },
    stockAging: buildStockAging(vehiclesResult.items, now),
    profitability: buildProfitability(vehiclesResult.items),
    salesGoals: buildSalesGoalSnapshot(vehiclesResult.items, leadsResult.items, new Date(now)),
    qrPerformance: buildQrPerformance(vehiclesResult.items),
    priceDropRecommendations: buildPriceDropRecommendations(vehiclesResult.items, now),
  }
}
