import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// Mise a jour immediate : sans ca, une nouvelle version deployee restait "en
// attente" tant que l'appli installee n'etait pas entierement fermee (ce qui
// n'arrive presque jamais sur un telephone) -> l'ancienne version restait
// affichee. La nouvelle version prend la main tout de suite et la page est
// rechargee par registerSW (voir main.jsx).
self.skipWaiting()
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// Supprime les fichiers des anciennes versions encore en cache.
cleanupOutdatedCaches()

// Injecté par vite-plugin-pwa (strategies: 'injectManifest') au build.
precacheAndRoute(self.__WB_MANIFEST)

// Rappels de pointage (début/fin de séance) envoyés par le backend via Web Push.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Nafoore Education', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Nafoore Education'
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => new URL(c.url).pathname === url)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    }),
  )
})
