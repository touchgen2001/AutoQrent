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
}

export type PanelAuditAction =
  | 'vehicle_create'
  | 'vehicle_delete'
  | 'vehicle_update'
  | 'lead_status_change'
  | 'lead_note_add'
  | 'contact_form_submit'
  | 'contact_form_blocked'

export type PanelAuditEntityType = 'vehicle' | 'lead' | 'contact' | 'system'

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
  source: 'mock' | 'supabase'
  range: '7days' | '30days' | '90days' | 'year'
  current: PanelLeadFunnelSnapshot
  previous: PanelLeadFunnelSnapshot
  trend: {
    conversionRateDelta: number
    wonLeadDelta: number
  }
}
