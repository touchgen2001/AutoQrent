import { deleteVehicleImageObjectsForGallery } from '@/lib/server/storage-images'
import { supabaseAdminFetch } from '@/lib/server/supabase-admin'

const QA_OWNER_EMAIL_PREFIX = 'akis-'
const QA_OWNER_EMAIL_DOMAIN = 'cebindegaleri.com'
const QA_OWNER_EMAIL_RE = /^akis-\d{14}@cebindegaleri\.com$/i
const MAX_QA_GALLERIES_PER_RUN = 50

type GalleryRow = {
  id: string
  name: string | null
  slug: string | null
  owner_email: string | null
  created_at: string | null
}

type VehicleRow = {
  id: string
  gallery_id: string
  slug: string | null
}

type LeadRow = {
  id: string
  gallery_id: string
  vehicle_id: string | null
}

type UploadedAssetRow = {
  id: string
  gallery_id: string
  object_path: string | null
  public_url: string | null
  status: string | null
}

type AuditLogRow = {
  id: number
}

type AuthUserRow = {
  id: string
  email?: string | null
}

type AuthUsersResponse = {
  users?: AuthUserRow[]
}

type CleanupGallerySummary = {
  id: string
  ownerEmail: string
  slug: string | null
  name: string | null
  vehicles: number
  leads: number
  uploadedAssets: number
  auditLogs: number
  storageObjectsDeleted: number
  deleted: boolean
}

type CleanupOptions = {
  dryRun?: boolean
}

function isSafeQaOwnerEmail(value: string | null | undefined) {
  return Boolean(value && QA_OWNER_EMAIL_RE.test(value))
}

async function listQaGalleryCandidates() {
  const rows = await supabaseAdminFetch<GalleryRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,owner_email,created_at',
      owner_email: `like.${QA_OWNER_EMAIL_PREFIX}*@${QA_OWNER_EMAIL_DOMAIN}`,
      order: 'created_at.asc',
      limit: MAX_QA_GALLERIES_PER_RUN,
    },
  })

  return rows
}

async function listGalleryVehicles(galleryId: string) {
  return supabaseAdminFetch<VehicleRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id,slug',
      gallery_id: `eq.${galleryId}`,
      limit: 500,
    },
  })
}

async function listGalleryLeads(galleryId: string) {
  return supabaseAdminFetch<LeadRow[]>({
    path: '/rest/v1/leads',
    query: {
      select: 'id,gallery_id,vehicle_id',
      gallery_id: `eq.${galleryId}`,
      limit: 500,
    },
  })
}

async function listGalleryUploadedAssets(galleryId: string) {
  return supabaseAdminFetch<UploadedAssetRow[]>({
    path: '/rest/v1/uploaded_assets',
    query: {
      select: 'id,gallery_id,object_path,public_url,status',
      gallery_id: `eq.${galleryId}`,
      limit: 500,
    },
  })
}

async function listGalleryAuditLogs(galleryId: string) {
  return supabaseAdminFetch<AuditLogRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'id',
      'metadata->>galleryId': `eq.${galleryId}`,
      limit: 500,
    },
  })
}

async function deleteGalleryAuditLogs(galleryId: string) {
  await supabaseAdminFetch<unknown>({
    method: 'DELETE',
    path: '/rest/v1/audit_logs',
    query: {
      'metadata->>galleryId': `eq.${galleryId}`,
    },
    prefer: 'return=minimal',
  })
}

async function deleteGalleryRow(galleryId: string) {
  await supabaseAdminFetch<unknown>({
    method: 'DELETE',
    path: '/rest/v1/galleries',
    query: {
      id: `eq.${galleryId}`,
    },
    prefer: 'return=minimal',
  })
}

async function listQaAuthUsers() {
  const targets: AuthUserRow[] = []

  for (let page = 1; page <= 5; page += 1) {
    const response = await supabaseAdminFetch<AuthUsersResponse>({
      path: '/auth/v1/admin/users',
      query: {
        page,
        per_page: 100,
        filter: QA_OWNER_EMAIL_PREFIX,
      },
    })
    const users = Array.isArray(response) ? response : response.users || []

    for (const user of users) {
      if (isSafeQaOwnerEmail(user.email)) targets.push(user)
    }

    if (users.length < 100) break
  }

  return targets
}

async function deleteAuthUser(userId: string) {
  await supabaseAdminFetch<unknown>({
    method: 'DELETE',
    path: `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    query: {
      should_soft_delete: false,
    },
  })
}

export async function cleanupQaTestData(options: CleanupOptions = {}) {
  const dryRun = Boolean(options.dryRun)
  const candidates = await listQaGalleryCandidates()
  const safeTargets = candidates.filter((row) => isSafeQaOwnerEmail(row.owner_email))
  const authUsers = await listQaAuthUsers()
  const skipped = candidates
    .filter((row) => !isSafeQaOwnerEmail(row.owner_email))
    .map((row) => ({
      id: row.id,
      ownerEmail: row.owner_email,
      reason: 'owner_email_not_safe_qa_pattern',
    }))

  const galleries: CleanupGallerySummary[] = []

  for (const gallery of safeTargets) {
    const vehicles = await listGalleryVehicles(gallery.id)
    const leads = await listGalleryLeads(gallery.id)
    const uploadedAssets = await listGalleryUploadedAssets(gallery.id)
    const auditLogs = await listGalleryAuditLogs(gallery.id)
    let storageObjectsDeleted = 0

    if (!dryRun && uploadedAssets.length > 0) {
      const storageResult = await deleteVehicleImageObjectsForGallery({
        galleryId: gallery.id,
        paths: uploadedAssets.map((asset) => asset.object_path),
        publicUrls: uploadedAssets.map((asset) => asset.public_url),
        allowOwnedLegacyPanelPaths: true,
      })
      storageObjectsDeleted = storageResult.deleted
    }

    if (!dryRun) {
      await deleteGalleryAuditLogs(gallery.id)
      await deleteGalleryRow(gallery.id)
    }

    galleries.push({
      id: gallery.id,
      ownerEmail: gallery.owner_email || '',
      slug: gallery.slug,
      name: gallery.name,
      vehicles: vehicles.length,
      leads: leads.length,
      uploadedAssets: uploadedAssets.length,
      auditLogs: auditLogs.length,
      storageObjectsDeleted,
      deleted: !dryRun,
    })
  }

  const authDeleted: Array<{ id: string; email: string }> = []
  for (const user of authUsers) {
    if (!user.id || !isSafeQaOwnerEmail(user.email)) continue

    if (!dryRun) {
      await deleteAuthUser(user.id)
    }

    authDeleted.push({
      id: user.id,
      email: user.email || '',
    })
  }

  const verifyRemaining = await listQaGalleryCandidates()
  const safeRemaining = verifyRemaining.filter((row) => isSafeQaOwnerEmail(row.owner_email))
  const remainingAuthUsers = await listQaAuthUsers()

  return {
    ok: true,
    dryRun,
    targetPattern: `${QA_OWNER_EMAIL_PREFIX}{yyyymmddhhmmss}@${QA_OWNER_EMAIL_DOMAIN}`,
    candidates: candidates.length,
    safeTargets: safeTargets.length,
    skipped,
    galleries,
    authUsers: authUsers.length,
    authDeleted,
    remainingSafeTargets: safeRemaining.length,
    remainingAuthUsers: remainingAuthUsers.length,
    limitHit: candidates.length >= MAX_QA_GALLERIES_PER_RUN,
  }
}
