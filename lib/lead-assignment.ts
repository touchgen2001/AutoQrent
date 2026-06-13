import type { PanelLead } from '@/lib/panel-types'
import type { PanelPermission } from '@/lib/panel-permissions'

export type PanelStaffRole = 'owner' | 'sales' | 'viewer'

export type PanelRoleDefinition = {
  role: PanelStaffRole
  title: string
  summary: string
  permissions: string[]
}

export type PanelTeamMember = {
  id: string
  name: string
  email?: string
  role: PanelStaffRole
  permissions?: PanelPermission[]
}

export type PanelLeadAssignment = {
  assigneeName: string | null
  assigneeRole: PanelStaffRole | null
  label: string
  tone: 'assigned' | 'recommended' | 'unassigned'
}

const ASSIGNMENT_NOTE_PREFIX = 'Sorumlu:'
const ROLE_NOTE_PREFIX = 'Rol:'

export const PANEL_ROLE_DEFINITIONS: PanelRoleDefinition[] = [
  {
    role: 'owner',
    title: 'Galeri Sahibi',
    summary: 'Tüm panel, fiyat, abonelik, vitrin ve veri dışa aktarma işlemlerini yönetir.',
    permissions: ['Araç ekleme/düzenleme', 'Lead yönetimi', 'Raporlar', 'Ayarlar ve abonelik', 'Veri dışa aktarma'],
  },
  {
    role: 'sales',
    title: 'Satış Danışmanı',
    summary: 'Müşteri taleplerini takip eder, WhatsApp şablonlarını ve randevu akışını kullanır.',
    permissions: ['Lead takibi', 'WhatsApp dönüşleri', 'Randevu planlama', 'Teklif çıktısı hazırlama'],
  },
  {
    role: 'viewer',
    title: 'Sadece Görüntüleyen',
    summary: 'Rapor, stok ve vitrin performansını izler; kritik işlemleri değiştirmez.',
    permissions: ['Stok görüntüleme', 'Rapor okuma', 'QR performansı izleme'],
  },
]

export function buildDefaultPanelTeam(owner?: { name?: string; email?: string }): PanelTeamMember[] {
  const ownerName = owner?.name?.trim() || 'Galeri Sahibi'
  const ownerEmail = owner?.email?.trim()

  return [
    {
      id: 'owner',
      name: ownerName,
      email: ownerEmail,
      role: 'owner',
    },
  ]
}

export function getPanelRoleDefinition(role: PanelStaffRole) {
  return PANEL_ROLE_DEFINITIONS.find((definition) => definition.role === role) || PANEL_ROLE_DEFINITIONS[0]
}

function normalizeAssigneeName(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function parseRole(value: string | undefined): PanelStaffRole | null {
  if (value === 'owner' || value === 'sales' || value === 'viewer') return value
  return null
}

export function buildLeadAssignmentNote(member: PanelTeamMember) {
  return `${ASSIGNMENT_NOTE_PREFIX} ${member.name} | ${ROLE_NOTE_PREFIX} ${member.role}`
}

export function getLeadAssignment(lead: Pick<PanelLead, 'notes' | 'status'>): PanelLeadAssignment {
  for (let index = lead.notes.length - 1; index >= 0; index -= 1) {
    const note = lead.notes[index] || ''
    const assignmentIndex = note.indexOf(ASSIGNMENT_NOTE_PREFIX)
    if (assignmentIndex === -1) continue

    const assignmentPart = note.slice(assignmentIndex + ASSIGNMENT_NOTE_PREFIX.length)
    const [rawName, rawRolePart] = assignmentPart.split('|').map((item) => item.trim())
    const name = normalizeAssigneeName(rawName)
    if (!name) continue

    const roleValue = rawRolePart?.startsWith(ROLE_NOTE_PREFIX)
      ? rawRolePart.slice(ROLE_NOTE_PREFIX.length).trim()
      : undefined

    return {
      assigneeName: name,
      assigneeRole: parseRole(roleValue),
      label: name,
      tone: 'assigned',
    }
  }

  if (lead.status === 'yeni') {
    return {
      assigneeName: null,
      assigneeRole: null,
      label: 'Atama önerilir',
      tone: 'recommended',
    }
  }

  return {
    assigneeName: null,
    assigneeRole: null,
    label: 'Atanmamış',
    tone: 'unassigned',
  }
}

export function countUnassignedOpenLeads(leads: PanelLead[]) {
  const openStatuses = new Set<PanelLead['status']>(['yeni', 'arandi', 'gorusuluyor', 'test-surusu'])
  return leads.filter((lead) => openStatuses.has(lead.status) && !getLeadAssignment(lead).assigneeName).length
}
