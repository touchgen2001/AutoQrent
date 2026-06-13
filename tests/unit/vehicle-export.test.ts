import { describe, expect, it } from 'vitest'
import { buildLeadExportCsv, buildPanelBackupPayload, buildVehicleExportCsv } from '@/lib/vehicle-export'
import type { PanelLead, PanelVehicle } from '@/lib/panel-types'

const vehicle: PanelVehicle = {
  id: 'vehicle-1',
  routeId: 'arac-1',
  publicUrl: 'https://cebindegaleri.com/arac/arac-1',
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
  scans: 12,
  leads: 3,
  favorites: 4,
  image: null,
  photos: [],
}

const lead: PanelLead = {
  id: 'lead-1',
  customerName: 'Ayşe Yılmaz',
  customerPhone: '05301234567',
  customerEmail: 'ayse@example.com',
  source: 'qr',
  status: 'gorusuluyor',
  notes: ['Teklif bekliyor'],
  vehicleTitle: 'BMW 320i',
  followUpDate: '2026-06-13',
  createdAt: '2026-06-12T10:00:00.000Z',
  updatedAt: '2026-06-12T10:00:00.000Z',
}

describe('panel export helpers', () => {
  it('builds vehicle CSV with Excel-friendly headers', () => {
    const csv = buildVehicleExportCsv([vehicle])

    expect(csv).toContain('marka,model,paket')
    expect(csv).toContain('"BMW","320i","M Sport"')
    expect(csv).toContain('"https://cebindegaleri.com/arac/arac-1"')
  })

  it('builds lead CSV with customer history fields', () => {
    const csv = buildLeadExportCsv([lead])

    expect(csv).toContain('musteri,telefon,email')
    expect(csv).toContain('"Ayşe Yılmaz","05301234567","ayse@example.com"')
    expect(csv).toContain('"1"')
  })

  it('builds a complete backup payload skeleton', () => {
    const payload = buildPanelBackupPayload({
      vehicles: [vehicle],
      leads: [lead],
      tasks: [],
      qr: { shareCount: 1 },
      exportedAt: '2026-06-12T12:00:00.000Z',
    })

    expect(payload.source).toBe('panel')
    expect(payload.vehicles).toHaveLength(1)
    expect(payload.qr).toEqual({ shareCount: 1 })
  })
})
