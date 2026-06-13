import { describe, expect, it } from 'vitest'
import {
  analyzeVehiclePrice,
  buildQrPerformanceRows,
  buildSalesGoalSnapshot,
  generateVehicleDescription,
  getLeadLossRisk,
  getPriceDropRecommendation,
} from '@/lib/sales-intelligence'
import type { PanelLead, PanelVehicle } from '@/lib/panel-types'

const baseVehicle: PanelVehicle = {
  id: 'vehicle-1',
  routeId: 'vehicle-1',
  publicUrl: '/arac/vehicle-1',
  brand: 'BMW',
  model: '320i',
  variant: 'M Sport',
  year: 2022,
  price: 2_200_000,
  mileage: 45_000,
  fuel: 'Benzin',
  transmission: 'Otomatik',
  color: 'Siyah',
  status: 'active',
  scans: 24,
  leads: 0,
  image: null,
  photos: [],
  createdAt: '2026-03-01T10:00:00.000Z',
}

const baseLead: PanelLead = {
  id: 'lead-1',
  customerName: 'Ali Demir',
  customerPhone: '05301234567',
  source: 'qr',
  status: 'yeni',
  notes: [],
  followUpDate: '2026-06-01',
  createdAt: '2026-05-25T10:00:00.000Z',
  updatedAt: '2026-05-25T10:00:00.000Z',
}

describe('sales intelligence helpers', () => {
  it('marks vehicles above peer median as high priced', () => {
    const analysis = analyzeVehiclePrice(baseVehicle, [
      baseVehicle,
      { ...baseVehicle, id: 'peer-1', price: 1_950_000 },
      { ...baseVehicle, id: 'peer-2', price: 2_000_000 },
    ])

    expect(analysis.tone).toBe('high')
    expect(analysis.label).toBe('Piyasanın üstünde')
    expect(analysis.peerCount).toBe(2)
  })

  it('recommends a price drop for old stock with scans but no leads', () => {
    const recommendation = getPriceDropRecommendation(baseVehicle, Date.parse('2026-06-12T12:00:00.000Z'))

    expect(recommendation.shouldDrop).toBe(true)
    expect(recommendation.suggestedDiscountRate).toBeGreaterThanOrEqual(5)
    expect(recommendation.suggestedPrice).toBeLessThan(baseVehicle.price)
  })

  it('generates a usable vehicle description from known fields', () => {
    const description = generateVehicleDescription({
      ...baseVehicle,
      serviceHistory: 'yes',
      warrantyStatus: 'yes',
      hasDamage: 'no',
    })

    expect(description).toContain('2022 BMW 320i M Sport')
    expect(description).toContain('yetkili servis bakımlı')
    expect(description).toContain('test sürüşü')
  })

  it('flags stale open leads as high loss risk', () => {
    const risk = getLeadLossRisk(baseLead, Date.parse('2026-06-12T12:00:00.000Z'))

    expect(risk.tone).toBe('high')
    expect(risk.score).toBeGreaterThanOrEqual(60)
  })

  it('builds sales goals and QR performance rows', () => {
    const goals = buildSalesGoalSnapshot(
      [baseVehicle, { ...baseVehicle, id: 'vehicle-2' }, { ...baseVehicle, id: 'vehicle-3' }],
      [{ ...baseLead, status: 'satisa-dondu', updatedAt: '2026-06-05T10:00:00.000Z' }],
      new Date('2026-06-12T12:00:00.000Z'),
    )
    const qrRows = buildQrPerformanceRows([baseVehicle])

    expect(goals.monthlyTarget).toBe(3)
    expect(goals.wonThisMonth).toBe(1)
    expect(qrRows[0]?.signal).toBe('Çok bakılıyor, lead yok')
  })
})
