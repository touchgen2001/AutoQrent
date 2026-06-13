import webpush from 'web-push'

import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '@/lib/push-config'
import { deletePushSubscription, listGalleryPushSubscriptions } from '@/lib/server/push-repository'
import { deleteVehiclePriceAlertEndpoint, listVehiclePriceAlerts } from '@/lib/server/price-alert-repository'

// Configures web-push lazily from the server-only private key. Returns false if
// the key is missing (e.g. preview env), so callers degrade gracefully.
let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!privateKey) return false
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey)
  configured = true
  return true
}

export type LeadPushPayload = {
  title: string
  body: string
  url: string
  /** Notification tag; defaults (in the SW) to the lead tag. Set a distinct tag
   *  for non-lead notifications so they don't collapse onto each other. */
  tag?: string
}

// Sends a Web Push to every endpoint registered for a gallery. Best-effort: it
// never throws (a notification hiccup must never break lead creation) and prunes
// endpoints the push service reports as gone (404/410). Returns the delivered count.
export async function sendLeadPushToGallery(galleryId: string, payload: LeadPushPayload): Promise<number> {
  if (!ensureConfigured()) return 0

  let subscriptions: Awaited<ReturnType<typeof listGalleryPushSubscriptions>>
  try {
    subscriptions = await listGalleryPushSubscriptions(galleryId)
  } catch {
    return 0
  }
  if (subscriptions.length === 0) return 0

  const data = JSON.stringify(payload)
  let delivered = 0

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        )
        delivered += 1
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(sub.endpoint).catch(() => {})
        }
      }
    }),
  )

  return delivered
}

// Notifies every device watching a vehicle's price that it has dropped. One-shot:
// a successfully-notified subscription is removed (the visitor re-subscribes to
// keep watching). Best-effort — never throws, prunes dead endpoints.
export async function sendVehiclePriceDropPush(vehicleId: string, payload: LeadPushPayload): Promise<number> {
  if (!ensureConfigured()) return 0

  let alerts: Awaited<ReturnType<typeof listVehiclePriceAlerts>>
  try {
    alerts = await listVehiclePriceAlerts(vehicleId)
  } catch {
    return 0
  }
  if (alerts.length === 0) return 0

  const data = JSON.stringify(payload)
  let delivered = 0

  await Promise.all(
    alerts.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        )
        delivered += 1
        await deleteVehiclePriceAlertEndpoint(vehicleId, sub.endpoint).catch(() => {})
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await deleteVehiclePriceAlertEndpoint(vehicleId, sub.endpoint).catch(() => {})
        }
      }
    }),
  )

  return delivered
}
