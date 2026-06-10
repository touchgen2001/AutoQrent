import { supabaseAdminFetch } from '@/lib/server/supabase-admin'

// Storage for dealer Web Push subscriptions (see migration
// 20260610120000_add_push_subscriptions.sql). Service-role access only.

export type StoredPushSubscription = {
  endpoint: string
  p256dh: string
  auth: string
}

export async function resolveGalleryIdByOwner(ownerEmail: string): Promise<string | null> {
  const rows = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/galleries',
    query: { select: 'id', owner_email: `eq.${ownerEmail}`, limit: 1 },
  })
  return rows[0]?.id ?? null
}

// Upsert on the unique `endpoint` so re-subscribing the same device is
// idempotent (and re-points it to the current gallery if the owner changed).
export async function savePushSubscription(input: {
  galleryId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<void> {
  await supabaseAdminFetch({
    method: 'POST',
    path: '/rest/v1/push_subscriptions',
    query: { on_conflict: 'endpoint' },
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      gallery_id: input.galleryId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      last_seen_at: new Date().toISOString(),
    },
  })
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await supabaseAdminFetch({
    method: 'DELETE',
    path: '/rest/v1/push_subscriptions',
    query: { endpoint: `eq.${endpoint}` },
    prefer: 'return=minimal',
  })
}

export async function listGalleryPushSubscriptions(galleryId: string): Promise<StoredPushSubscription[]> {
  const rows = await supabaseAdminFetch<Array<{ endpoint: string; p256dh: string; auth: string }>>({
    path: '/rest/v1/push_subscriptions',
    query: { select: 'endpoint,p256dh,auth', gallery_id: `eq.${galleryId}` },
  })
  return rows.map((row) => ({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }))
}
