/**
 * Land Estimator Service Worker
 * Handles background preloading of versioned index files for better performance
 */

const CACHE_NAME = 'versioned-index-cache-v1';
const VERSION_MANIFEST_URL =
  'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/version-manifest.json';

self.addEventListener('install', () => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    // Clean up old caches
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith('versioned-index-cache-') &&
                cacheName !== CACHE_NAME
            )
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        self.clients.claim();
      })
  );
});

self.addEventListener('message', async (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data?.type === 'PRELOAD_VERSIONED_INDEXES') {
    try {
      console.log('[SW] Starting versioned index preload...');
      await preloadVersionedIndexes();

      // Notify the client that preloading is complete
      event.ports[0]?.postMessage({
        type: 'PRELOAD_COMPLETE',
        success: true
      });
    } catch (error) {
      console.error('[SW] Preload failed:', error);
      event.ports[0]?.postMessage({
        type: 'PRELOAD_COMPLETE',
        success: false,
        error: error.message
      });
    }
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    try {
      console.log('[SW] Clearing versioned index cache...');
      await caches.delete(CACHE_NAME);
      console.log('[SW] Cache cleared successfully');

      event.ports[0]?.postMessage({
        type: 'CACHE_CLEARED',
        success: true
      });
    } catch (error) {
      console.error('[SW] Cache clear failed:', error);
      event.ports[0]?.postMessage({
        type: 'CACHE_CLEARED',
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * Preload versioned index files based on the current version manifest
 */
async function preloadVersionedIndexes() {
  try {
    console.log('[SW] Fetching version manifest...');
    const manifestResponse = await fetch(VERSION_MANIFEST_URL);

    if (!manifestResponse.ok) {
      throw new Error(
        `Version manifest fetch failed: ${manifestResponse.status} ${manifestResponse.statusText}`
      );
    }

    const manifest = await manifestResponse.json();
    console.log('[SW] Version manifest loaded:', {
      current: manifest.current?.version,
      previous: manifest.previous?.version
    });

    // Validate manifest structure
    if (!manifest.current?.files) {
      throw new Error('Invalid version manifest: missing current files');
    }

    // Get URLs to preload (current version)
    const urlsToPreload = [
      manifest.current.files.address_index,
      manifest.current.files.parcel_metadata
    ].filter(Boolean);
    // Remove any undefined URLs

    // Also include previous version for fallback if available
    if (manifest.previous?.files) {
      urlsToPreload.push(
        manifest.previous.files.address_index,
        manifest.previous.files.parcel_metadata
      );
    }

    console.log('[SW] URLs to preload:', urlsToPreload);

    // Open cache
    const cache = await caches.open(CACHE_NAME);

    // Preload files with error handling for individual files
    const preloadPromises = urlsToPreload.map(async (url) => {
      try {
        console.log('[SW] Preloading:', url);
        const response = await fetch(url);

        if (!response.ok) {
          console.warn('[SW] Failed to preload:', url, response.status);
          return;
        }

        await cache.put(url, response);
        console.log('[SW] Successfully cached:', url);
      } catch (error) {
        console.warn('[SW] Error preloading:', url, error.message);
      }
    });

    await Promise.all(preloadPromises);
    console.log('[SW] Preload completed');
  } catch (error) {
    console.error('[SW] Preload failed:', error);
    throw error;
  }
}

/**
 * Handle fetch events - serve from cache if available, otherwise fetch from network
 */
self.addEventListener('fetch', (event) => {
  // Only handle requests for versioned index files
  const url = event.request.url;
  if (url.includes('address-index-v') || url.includes('parcel-metadata-v')) {
    event.respondWith(handleVersionedIndexFetch(event.request));
  }
});

/**
 * Handle fetches for versioned index files with cache-first strategy
 */
async function handleVersionedIndexFetch(request) {
  try {
    // Try cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // If not in cache, fetch from network and cache it
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone the response before caching (response can only be consumed once)
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      console.log('[SW] Cached network response:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);
    // Return a basic error response
    return new Response('Service worker fetch failed', {
      status: 500,
      statusText: 'Service Worker Error'
    });
  }
}
