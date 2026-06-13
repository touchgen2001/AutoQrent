import type { PanelStaffRole, PanelTeamMember } from '@/lib/lead-assignment'
import {
  DEFAULT_ROLE_PERMISSIONS,
  normalizePanelPermissions,
  type PanelPermission,
} from '@/lib/panel-permissions'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export const PANEL_STAFF_ROLES = ['owner', 'sales', 'viewer'] as const
export const PANEL_STAFF_STATUSES = ['active', 'invited', 'suspended'] as const

export type PanelStaffStatus = (typeof PANEL_STAFF_STATUSES)[number]

export type GalleryAccessRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  owner_email: string | null
}

type StaffMemberRow = {
  id: string
  gallery_id: string
  user_id: string | null
  email: string
  full_name: string
  role: string
  status: string
  permissions: string[] | null
  invited_by_email: string | null
  invited_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type PanelTeamMemberRecord = PanelTeamMember & {
  galleryId: string
  userId: string | null
  status: PanelStaffStatus
  invitedByEmail: string | null
  invitedAt: string | null
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PanelGalleryAccess = {
  gallery: GalleryAccessRow
  membership: PanelTeamMemberRecord
}

export function normalizePanelEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isPanelStaffRole(value: unknown): value is PanelStaffRole {
  return typeof value === 'string' && PANEL_STAFF_ROLES.includes(value as PanelStaffRole)
}

export function isPanelStaffStatus(value: unknown): value is PanelStaffStatus {
  return typeof value === 'string' && PANEL_STAFF_STATUSES.includes(value as PanelStaffStatus)
}

function normalizeStaffRole(value: unknown): PanelStaffRole {
  return isPanelStaffRole(value) ? value : 'sales'
}

function normalizeStaffStatus(value: unknown): PanelStaffStatus {
  return isPanelStaffStatus(value) ? value : 'active'
}

function mapStaffMember(row: StaffMemberRow): PanelTeamMemberRecord {
  return {
    id: row.id,
    galleryId: row.gallery_id,
    userId: row.user_id,
    name: row.full_name,
    email: normalizePanelEmail(row.email),
    role: normalizeStaffRole(row.role),
    permissions: normalizePanelPermissions(row.permissions, normalizeStaffRole(row.role)),
    status: normalizeStaffStatus(row.status),
    invitedByEmail: row.invited_by_email ? normalizePanelEmail(row.invited_by_email) : null,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchPanelGalleryById(galleryId: string) {
  const rows = await supabaseAdminFetch<GalleryAccessRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,phone,email,owner_email',
      id: `eq.${galleryId}`,
      limit: 1,
    },
  })

  return rows[0] || null
}

export async function fetchPanelGalleryOwnerEmail(galleryId: string) {
  const gallery = await fetchPanelGalleryById(galleryId)
  return gallery?.owner_email ? normalizePanelEmail(gallery.owner_email) : null
}

async function fetchPanelGalleryByOwnerEmail(ownerEmail: string) {
  const email = normalizePanelEmail(ownerEmail)
  const rows = await supabaseAdminFetch<GalleryAccessRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,phone,email,owner_email',
      owner_email: `eq.${email}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  return rows[0] || null
}

export async function fetchPanelTeamMemberByEmail(input: {
  galleryId: string
  email: string
}) {
  const rows = await supabaseAdminFetch<StaffMemberRow[]>({
    path: '/rest/v1/gallery_staff_members',
    query: {
      select: 'id,gallery_id,user_id,email,full_name,role,status,permissions,invited_by_email,invited_at,accepted_at,created_at,updated_at',
      gallery_id: `eq.${input.galleryId}`,
      email: `eq.${normalizePanelEmail(input.email)}`,
      limit: 1,
    },
  })

  return rows[0] ? mapStaffMember(rows[0]) : null
}

export async function ensureOwnerTeamMember(input: {
  galleryId: string
  ownerEmail: string
  fullName?: string
  userId?: string | null
}) {
  requireSupabaseAdminConfig()

  const email = normalizePanelEmail(input.ownerEmail)
  const fullName = input.fullName?.trim() || 'Galeri Sahibi'
  const existing = await fetchPanelTeamMemberByEmail({
    galleryId: input.galleryId,
    email,
  })

  if (existing) {
    if (
      existing.role === 'owner'
      && existing.status === 'active'
      && existing.permissions?.length === DEFAULT_ROLE_PERMISSIONS.owner.length
      && (!input.userId || existing.userId === input.userId)
      && (!input.fullName || existing.name === fullName)
    ) {
      return existing
    }

    const rows = await supabaseAdminFetch<StaffMemberRow[]>({
      method: 'PATCH',
      path: '/rest/v1/gallery_staff_members',
      query: {
        id: `eq.${existing.id}`,
      },
      prefer: 'return=representation',
      body: {
        user_id: input.userId || existing.userId,
        full_name: fullName,
        role: 'owner',
        status: 'active',
        permissions: DEFAULT_ROLE_PERMISSIONS.owner,
        accepted_at: existing.acceptedAt || new Date().toISOString(),
      },
    })

    return rows[0] ? mapStaffMember(rows[0]) : existing
  }

  const rows = await supabaseAdminFetch<StaffMemberRow[]>({
    method: 'POST',
    path: '/rest/v1/gallery_staff_members',
    prefer: 'return=representation',
    body: [
      {
        gallery_id: input.galleryId,
        user_id: input.userId || null,
        email,
        full_name: fullName,
        role: 'owner',
        status: 'active',
        permissions: DEFAULT_ROLE_PERMISSIONS.owner,
        invited_by_email: email,
        accepted_at: new Date().toISOString(),
      },
    ],
  })

  const created = rows[0]
  if (!created) {
    throw new Error('Galeri sahibi personel kaydı oluşturulamadı.')
  }

  return mapStaffMember(created)
}

export async function findPanelGalleryAccessByEmail(emailRaw: string) {
  requireSupabaseAdminConfig()

  const email = normalizePanelEmail(emailRaw)
  if (!email) return null

  const ownerGallery = await fetchPanelGalleryByOwnerEmail(email)
  if (ownerGallery) {
    const existingMembership = await fetchPanelTeamMemberByEmail({
      galleryId: ownerGallery.id,
      email,
    })
    const membership = existingMembership?.role === 'owner' && existingMembership.status === 'active'
      ? existingMembership
      : await ensureOwnerTeamMember({
          galleryId: ownerGallery.id,
          ownerEmail: email,
        })
    return {
      gallery: ownerGallery,
      membership,
    } satisfies PanelGalleryAccess
  }

  const memberships = await supabaseAdminFetch<StaffMemberRow[]>({
    path: '/rest/v1/gallery_staff_members',
    query: {
      select: 'id,gallery_id,user_id,email,full_name,role,status,permissions,invited_by_email,invited_at,accepted_at,created_at,updated_at',
      email: `eq.${email}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  const membershipRow = memberships[0]
  if (!membershipRow) return null

  const gallery = await fetchPanelGalleryById(membershipRow.gallery_id)
  if (!gallery) return null

  return {
    gallery,
    membership: mapStaffMember(membershipRow),
  } satisfies PanelGalleryAccess
}

export async function resolvePanelGalleryIdByEmail(email: string | undefined) {
  if (!email) return null
  const access = await findPanelGalleryAccessByEmail(email)
  return access?.gallery.id || null
}

export async function fetchPanelTeamMembers(galleryId: string) {
  requireSupabaseAdminConfig()

  const rows = await supabaseAdminFetch<StaffMemberRow[]>({
    path: '/rest/v1/gallery_staff_members',
    query: {
      select: 'id,gallery_id,user_id,email,full_name,role,status,permissions,invited_by_email,invited_at,accepted_at,created_at,updated_at',
      gallery_id: `eq.${galleryId}`,
      order: 'role.asc,created_at.asc',
      limit: 200,
    },
  })

  return rows.map(mapStaffMember)
}

export async function countBillablePanelTeamMembers(galleryId: string) {
  const rows = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/gallery_staff_members',
    query: {
      select: 'id',
      gallery_id: `eq.${galleryId}`,
      status: 'in.(active,invited)',
      limit: 10000,
    },
  })

  return rows.length
}

export async function createPanelTeamMember(input: {
  galleryId: string
  email: string
  fullName: string
  role: Exclude<PanelStaffRole, 'owner'>
  status?: PanelStaffStatus
  userId?: string | null
  invitedByEmail: string
  permissions?: PanelPermission[]
}) {
  requireSupabaseAdminConfig()

  const rows = await supabaseAdminFetch<StaffMemberRow[]>({
    method: 'POST',
    path: '/rest/v1/gallery_staff_members',
    prefer: 'return=representation',
    body: [
      {
        gallery_id: input.galleryId,
        user_id: input.userId || null,
        email: normalizePanelEmail(input.email),
        full_name: input.fullName.trim(),
        role: input.role,
        permissions: input.permissions || DEFAULT_ROLE_PERMISSIONS[input.role],
        status: input.status || 'active',
        invited_by_email: normalizePanelEmail(input.invitedByEmail),
        accepted_at: input.status === 'invited' ? null : new Date().toISOString(),
      },
    ],
  })

  const created = rows[0]
  if (!created) {
    throw new Error('Personel kaydı oluşturulamadı.')
  }

  return mapStaffMember(created)
}

export async function updatePanelTeamMember(input: {
  galleryId: string
  memberId: string
  role?: Exclude<PanelStaffRole, 'owner'>
  status?: PanelStaffStatus
  fullName?: string
  userId?: string | null
  permissions?: PanelPermission[]
}) {
  requireSupabaseAdminConfig()

  const patch: Record<string, string | string[] | null> = {}
  if (input.role) patch.role = input.role
  if (input.status) patch.status = input.status
  if (input.fullName !== undefined) patch.full_name = input.fullName.trim()
  if (input.userId !== undefined) patch.user_id = input.userId
  if (input.permissions !== undefined) patch.permissions = input.permissions
  if (input.status === 'active') patch.accepted_at = new Date().toISOString()

  const rows = await supabaseAdminFetch<StaffMemberRow[]>({
    method: 'PATCH',
    path: '/rest/v1/gallery_staff_members',
    query: {
      id: `eq.${input.memberId}`,
      gallery_id: `eq.${input.galleryId}`,
      role: 'neq.owner',
    },
    prefer: 'return=representation',
    body: patch,
  })

  const updated = rows[0]
  if (!updated) {
    throw new Error('Personel kaydı güncellenemedi.')
  }

  return mapStaffMember(updated)
}
