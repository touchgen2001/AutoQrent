'use client'

import { VAPID_PUBLIC_KEY } from '@/lib/push-config'

export type PushEnableResult = 'enabled' | 'denied' | 'unsupported' | 'failed'

// PushManager wants the VAPID public key as a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Registers the service worker, subscribes the device to Web Push, and stores the
// subscription server-side so the panel can alert this device about new leads
// even when the tab is closed. Returns a coarse status for the UI.
export async function enablePushNotifications(): Promise<PushEnableResult> {
  if (!isPushSupported()) return 'unsupported'

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'failed'

    const response = await fetch('/api/panel/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent.slice(0, 400),
      }),
    })

    return response.ok ? 'enabled' : 'failed'
  } catch {
    return 'failed'
  }
}

// True if this device already has an active push subscription registered.
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!registration) return false
    const subscription = await registration.pushManager.getSubscription()
    return Boolean(subscription)
  } catch {
    return false
  }
}
