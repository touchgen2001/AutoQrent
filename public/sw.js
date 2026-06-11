/* eslint-disable */
// Cebindegaleri Web Push service worker. Intentionally minimal: it only displays
// new-lead notifications and focuses/opens the panel on click. No offline caching,
// so it can never interfere with the app shell or stale-serve pages.

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = {}
  }

  const title = payload.title || 'Yeni müşteri talebi'
  const body = payload.body || 'Panelde yeni bir talep var.'
  const url = payload.url || '/panel/leadler'
  // Distinct tag per kind so a price-drop alert never collapses onto a lead one.
  const tag = payload.tag || 'cebindegaleri-lead'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/panel/leadler'

  // Panel (dealer) notifications focus an open panel tab; public notifications
  // (e.g. price-drop on a /arac page) just open the target URL.
  const isPanel = targetUrl.includes('/panel')

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (isPanel) {
        for (const client of clientList) {
          if (client.url.includes('/panel') && 'focus' in client) {
            return client.focus()
          }
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
