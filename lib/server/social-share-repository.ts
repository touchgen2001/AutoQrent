import type { PanelTopSharedVehicle } from '@/lib/panel-types'
import { resolvePanelGalleryIdByEmail } from '@/lib/server/panel-team-repository'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

// Records and reads "araç sosyal görseli indirildi" events. These are real, dealer
// initiated downloads of a vehicle's share image (single preview or ZIP pack),
// stored in the shared audit_logs table under a dedicated action. The panel card
// labels them honestly as *downloads* — never as confirmed social-media shares —
// in line with the no-fake-metrics stance.

const SHARE_DOWNLOAD_ACTION = 'vehicle_social_image_download'
// A distinct action for "doğrudan paylaş": the dealer pushed the card into the
// device's native share sheet (Web Share API) and it completed (didn't cancel).
// Kept SEPARATE from downloads and labelled honestly — it proves the share sheet
// opened-and-completed, NOT that the image reached a social network.
const SHARE_SHARE_ACTION = 'vehicle_social_image_share'

// Only look back this far when ranking; older downloads shouldn't dominate the card.
const LOOKBACK_DAYS = 90

type ShareDownloadRow = {
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

async function resolveGalleryId(ownerEmail?: string) {
  if (!ownerEmail) return null
  return resolvePanelGalleryIdByEmail(ownerEmail)
}

export type RecordVehicleShareInput = {
  ownerEmail?: string
  items: Array<{ vehicleId: string; vehicleTitle?: string }>
  format?: string
  scope?: string
  // 'download' (default) = saved to disk / ZIP; 'share' = native share sheet.
  kind?: 'download' | 'share'
}

// Bulk-insert one audit row per downloaded (or shared) vehicle. Best-effort: if
// the gallery can't be resolved or there are no valid items, it records nothing.
export async function recordVehicleShareDownloads(
  input: RecordVehicleShareInput,
): Promise<{ recorded: number }> {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(input.ownerEmail)
  if (!galleryId) return { recorded: 0 }

  const action = input.kind === 'share' ? SHARE_SHARE_ACTION : SHARE_DOWNLOAD_ACTION
  const scope = input.scope || 'single'
  const format = input.format || ''

  const rows = input.items
    .filter((item) => typeof item.vehicleId === 'string' && item.vehicleId.trim().length > 0)
    .slice(0, 250)
    .map((item) => ({
      action,
      entity_type: 'vehicle',
      entity_id: item.vehicleId,
      actor_email: input.ownerEmail || null,
      actor_role: 'owner',
      source: 'panel',
      metadata: {
        galleryId,
        vehicleId: item.vehicleId,
        vehicleTitle: item.vehicleTitle || '',
        format,
        scope,
      },
    }))

  if (rows.length === 0) return { recorded: 0 }

  await supabaseAdminFetch({
    method: 'POST',
    path: '/rest/v1/audit_logs',
    body: rows,
    prefer: 'return=minimal',
  })

  return { recorded: rows.length }
}

// Aggregate the most-downloaded vehicle share images for a gallery. Returns the
// top `limitTop` vehicles by download count over the lookback window, newest
// activity breaking ties.
export async function getTopSharedVehicles(
  ownerEmail?: string,
  limitTop = 5,
): Promise<PanelTopSharedVehicle[]> {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) return []

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const rows = await supabaseAdminFetch<ShareDownloadRow[]>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'entity_id,metadata,created_at',
      action: `eq.${SHARE_DOWNLOAD_ACTION}`,
      'metadata->>galleryId': `eq.${galleryId}`,
      created_at: `gte.${since}`,
      order: 'created_at.desc',
      limit: 100000,
    },
  })

  const counts = new Map<string, PanelTopSharedVehicle>()

  for (const row of rows) {
    const vehicleId = typeof row.entity_id === 'string' ? row.entity_id : ''
    if (!vehicleId) continue

    const title =
      typeof row.metadata?.vehicleTitle === 'string' ? (row.metadata.vehicleTitle as string).trim() : ''

    const existing = counts.get(vehicleId)
    if (existing) {
      existing.downloads += 1
      if (title && !existing.vehicleTitle) existing.vehicleTitle = title
      if (row.created_at > existing.lastDownloadAt) existing.lastDownloadAt = row.created_at
    } else {
      counts.set(vehicleId, {
        vehicleId,
        vehicleTitle: title,
        downloads: 1,
        lastDownloadAt: row.created_at,
      })
    }
  }

  return [...counts.values()]
    .sort((left, right) => {
      if (right.downloads !== left.downloads) return right.downloads - left.downloads
      return right.lastDownloadAt.localeCompare(left.lastDownloadAt)
    })
    .slice(0, Math.max(limitTop, 1))
}

// Total "doğrudan paylaş" events for a gallery over the lookback window. Shown as
// an honest, separate counter next to downloads — never folded into them.
export async function getSocialImageShareCount(ownerEmail?: string): Promise<number> {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(ownerEmail)
  if (!galleryId) return 0

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const rows = await supabaseAdminFetch<Array<{ entity_id: string }>>({
    path: '/rest/v1/audit_logs',
    query: {
      select: 'entity_id',
      action: `eq.${SHARE_SHARE_ACTION}`,
      'metadata->>galleryId': `eq.${galleryId}`,
      created_at: `gte.${since}`,
      limit: 100000,
    },
  })

  return rows.length
}
