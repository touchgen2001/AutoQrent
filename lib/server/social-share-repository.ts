import type { PanelTopSharedVehicle } from '@/lib/panel-types'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

// Records and reads "araç sosyal görseli indirildi" events. These are real, dealer
// initiated downloads of a vehicle's share image (single preview or ZIP pack),
// stored in the shared audit_logs table under a dedicated action. The panel card
// labels them honestly as *downloads* — never as confirmed social-media shares —
// in line with the no-fake-metrics stance.

const SHARE_DOWNLOAD_ACTION = 'vehicle_social_image_download'

// Only look back this far when ranking; older downloads shouldn't dominate the card.
const LOOKBACK_DAYS = 90

type GalleryIdRow = { id: string }

type ShareDownloadRow = {
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

async function resolveGalleryId(ownerEmail?: string) {
  if (!ownerEmail) return null

  const rows = await supabaseAdminFetch<GalleryIdRow[]>({
    path: '/rest/v1/galleries',
    query: {
      select: 'id',
      owner_email: `eq.${ownerEmail}`,
      order: 'created_at.asc',
      limit: 1,
    },
  })

  return rows[0]?.id || null
}

export type RecordVehicleShareInput = {
  ownerEmail?: string
  items: Array<{ vehicleId: string; vehicleTitle?: string }>
  format?: string
  scope?: string
}

// Bulk-insert one audit row per downloaded vehicle. Best-effort: if the gallery
// can't be resolved or there are no valid items, it simply records nothing.
export async function recordVehicleShareDownloads(
  input: RecordVehicleShareInput,
): Promise<{ recorded: number }> {
  requireSupabaseAdminConfig()

  const galleryId = await resolveGalleryId(input.ownerEmail)
  if (!galleryId) return { recorded: 0 }

  const scope = input.scope || 'single'
  const format = input.format || ''

  const rows = input.items
    .filter((item) => typeof item.vehicleId === 'string' && item.vehicleId.trim().length > 0)
    .slice(0, 250)
    .map((item) => ({
      action: SHARE_DOWNLOAD_ACTION,
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
