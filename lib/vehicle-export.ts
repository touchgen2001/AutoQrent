import type { PanelLead, PanelVehicle } from '@/lib/panel-types'

export type PanelBackupPayload = {
  exportedAt: string
  source: 'panel'
  vehicles: unknown[]
  leads: unknown[]
  tasks: unknown[]
  qr: unknown
}

const VEHICLE_EXPORT_HEADERS = [
  'marka',
  'model',
  'paket',
  'yil',
  'fiyat',
  'km',
  'yakit',
  'vites',
  'renk',
  'durum',
  'qr_tarama',
  'musteri_talebi',
  'favori',
  'public_url',
] as const

const LEAD_EXPORT_HEADERS = [
  'musteri',
  'telefon',
  'email',
  'arac',
  'kaynak',
  'durum',
  'takip_tarihi',
  'not_sayisi',
  'olusturma',
] as const

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function buildVehicleExportCsv(vehicles: PanelVehicle[]) {
  const rows = vehicles.map((vehicle) => [
    vehicle.brand,
    vehicle.model,
    vehicle.variant,
    vehicle.year,
    vehicle.price,
    vehicle.mileage,
    vehicle.fuel,
    vehicle.transmission,
    vehicle.color,
    vehicle.status,
    vehicle.scans,
    vehicle.leads,
    vehicle.favorites || 0,
    vehicle.publicUrl,
  ])

  return [
    VEHICLE_EXPORT_HEADERS.join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n')
}

export function buildLeadExportCsv(leads: PanelLead[]) {
  const rows = leads.map((lead) => [
    lead.customerName,
    lead.customerPhone,
    lead.customerEmail || '',
    lead.vehicleTitle || '',
    lead.source,
    lead.status,
    lead.followUpDate || '',
    lead.notes.length,
    lead.createdAt,
  ])

  return [
    LEAD_EXPORT_HEADERS.join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n')
}

export function buildPanelBackupPayload(input: {
  vehicles?: unknown[]
  leads?: unknown[]
  tasks?: unknown[]
  qr?: unknown
  exportedAt?: string
}): PanelBackupPayload {
  return {
    exportedAt: input.exportedAt || new Date().toISOString(),
    source: 'panel',
    vehicles: input.vehicles || [],
    leads: input.leads || [],
    tasks: input.tasks || [],
    qr: input.qr || null,
  }
}
