import { supabaseAdminFetch } from '@/lib/server/supabase-admin'

// Storage for visitor "notify me when the price drops" Web Push subscriptions
// (see migration 20260611120000_add_vehicle_price_alerts.sql). Service-role only.

export type StoredPriceAlert = {
  endpoint: string
  p256dh: string
  auth: string
}

// Resolve a live vehicle's UUID + current asking price from its public route slug.
export async function resolveVehicleForPriceAlert(
  routeId: string,
): Promise<{ id: string; price: number } | null> {
  const rows = await supabaseAdminFetch<Array<{ id: string; price: number | null }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,price',
      slug: `eq.${routeId.trim()}`,
      status: 'eq.active',
      limit: 1,
    },
  })
  const row = rows[0]
  if (!row) return null
  return { id: row.id, price: Number(row.price) || 0 }
}

// Upsert on (vehicle_id, endpoint) so re-subscribing the same device is idempotent
// and refreshes the baseline price.
export async function saveVehiclePriceAlert(input: {
  vehicleId: string
  endpoint: string
  p256dh: string
  auth: string
  baselinePrice: number
  userAgent?: string
}): Promise<void> {
  await supabaseAdminFetch({
    method: 'POST',
    path: '/rest/v1/vehicle_price_alerts',
    query: { on_conflict: 'vehicle_id,endpoint' },
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      vehicle_id: input.vehicleId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      baseline_price: input.baselinePrice,
      user_agent: input.userAgent ?? null,
    },
  })
}

export async function listVehiclePriceAlerts(vehicleId: string): Promise<StoredPriceAlert[]> {
  const rows = await supabaseAdminFetch<Array<{ endpoint: string; p256dh: string; auth: string }>>({
    path: '/rest/v1/vehicle_price_alerts',
    query: { select: 'endpoint,p256dh,auth', vehicle_id: `eq.${vehicleId}` },
  })
  return rows.map((row) => ({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }))
}

export async function deleteVehiclePriceAlertEndpoint(vehicleId: string, endpoint: string): Promise<void> {
  await supabaseAdminFetch({
    method: 'DELETE',
    path: '/rest/v1/vehicle_price_alerts',
    query: { vehicle_id: `eq.${vehicleId}`, endpoint: `eq.${endpoint}` },
    prefer: 'return=minimal',
  })
}
