import type { PanelStaffRole } from '@/lib/lead-assignment'

export const PANEL_PERMISSIONS = [
  'vehicles.create',
  'vehicles.update',
  'vehicles.delete',
  'leads.manage',
  'whatsapp.manage',
  'reservations.manage',
  'reviews.manage',
  'reports.view',
  'audit.view',
  'settings.manage',
  'notifications.manage',
] as const

export type PanelPermission = (typeof PANEL_PERMISSIONS)[number]

export const PANEL_PERMISSION_LABELS: Record<PanelPermission, string> = {
  'vehicles.create': 'Araç ekleme',
  'vehicles.update': 'Araç ve fiyat düzenleme',
  'vehicles.delete': 'Araç silme ve geri alma',
  'leads.manage': 'Müşteri taleplerini yönetme',
  'whatsapp.manage': 'WhatsApp görüşmesi başlatma',
  'reservations.manage': 'Rezervasyonları yönetme',
  'reviews.manage': 'Yorumları yayınlama ve reddetme',
  'reports.view': 'Yönetici raporlarını görüntüleme',
  'audit.view': 'İşlem geçmişini görüntüleme',
  'settings.manage': 'Galeri ayarlarını yönetme',
  'notifications.manage': 'Bildirim kurallarını yönetme',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<PanelStaffRole, PanelPermission[]> = {
  owner: [...PANEL_PERMISSIONS],
  sales: ['leads.manage', 'whatsapp.manage', 'reservations.manage'],
  viewer: ['reports.view'],
}

export function isPanelPermission(value: unknown): value is PanelPermission {
  return typeof value === 'string' && PANEL_PERMISSIONS.includes(value as PanelPermission)
}

export function normalizePanelPermissions(value: unknown, role: PanelStaffRole) {
  if (!Array.isArray(value)) return [...DEFAULT_ROLE_PERMISSIONS[role]]
  return Array.from(new Set(value.filter(isPanelPermission)))
}
