import { supabaseAdminFetch } from '@/lib/server/supabase-admin'

// Favourite "interest" events are written to audit_logs by the public
// vehicle-events route: action=public_vehicle_cta_click, entity_type=vehicle,
// entity_id=<vehicle UUID>, metadata.eventType='favorite'. We aggregate them
// here for the dealer panel (per-vehicle badge) and the public social-proof
// badge. Filtering is done on the indexed (entity_type, entity_id) columns and
// the eventType is checked in JS, so we avoid brittle JSON-path query filters.

type FavoriteAuditRow = { entity_id: string | null; metadata: Record<string, unknown> | null }

function isFavoriteRow(row: FavoriteAuditRow): boolean {
  return row.metadata?.eventType === 'favorite'
}

async function fetchFavoriteRows(vehicleIds: string[]): Promise<FavoriteAuditRow[]> {
  if (vehicleIds.length === 0) return []
  try {
    return await supabaseAdminFetch<FavoriteAuditRow[]>({
      path: '/rest/v1/audit_logs',
      query: {
        select: 'entity_id,metadata',
        entity_type: 'eq.vehicle',
        action: 'eq.public_vehicle_cta_click',
        entity_id: `in.(${vehicleIds.join(',')})`,
        limit: 200000,
      },
    })
  } catch {
    return []
  }
}

/** Favourite counts keyed by vehicle id, for a set of vehicles (dealer panel). */
export async function fetchVehicleFavoriteCountsByIds(vehicleIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const rows = await fetchFavoriteRows(vehicleIds)
  for (const row of rows) {
    if (!row.entity_id || !isFavoriteRow(row)) continue
    counts.set(row.entity_id, (counts.get(row.entity_id) || 0) + 1)
  }
  return counts
}

/** Favourite count for a single vehicle (public social-proof badge). */
export async function getVehicleFavoriteCount(vehicleId: string): Promise<number> {
  if (!vehicleId) return 0
  const rows = await fetchFavoriteRows([vehicleId])
  return rows.filter(isFavoriteRow).length
}
