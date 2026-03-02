const CACHE_NAME = 'run-tracker-v1'

// App shell files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
]

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  // Activate immediately, don't wait for old SW to die
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch: network first, fall back to cache
// This ensures GPS/map data is always fresh, but app loads offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin tile requests (OpenStreetMap)
  // We don't cache map tiles — they're too large and change often
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('tile.openstreetmap.org')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response and store in cache
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone)
        })
        return response
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          // If it's a navigation request and we have no cache, serve index
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
      })
  )
})