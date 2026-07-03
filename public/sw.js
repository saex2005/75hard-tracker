const CACHE_NAME = '75hard-v1'
const STATIC_ASSETS = ['/', '/historia', '/stats', '/fotos', '/peso']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  // Solo interceptar requests del mismo origen — nunca Supabase ni externos
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r ?? new Response('', { status: 408 }))
    )
  )
})

// Notificaciones a las 21:00
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { pendingTasks, dayNumber } = event.data

    const now = new Date()
    const target = new Date()
    target.setHours(21, 0, 0, 0)

    if (now >= target) return

    const delay = target.getTime() - now.getTime()

    setTimeout(() => {
      self.registration.getNotifications().then((existing) => {
        if (existing.length > 0) return

        self.registration.showNotification('75 Hard', {
          body: `Quedan ${pendingTasks} tasks para el Día ${dayNumber}. No rompas la racha 🔥`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'daily-reminder',
          renotify: false,
          data: { url: '/' },
        })
      })
    }, delay)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/')
    })
  )
})
