const CACHE_NAME = 'versioned-index-cache-v1';

const VERSION_MANIFEST_URLS = [
  'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/version-manifest.json'
];

self.addEventListener('install', () => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
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

  if (event.data?.type === 'PRELOAD_STATIC_FILES') {
    try {
      console.log('[SW] Starting static files preload...');
      await preloadStaticFiles();

      event.ports[0]?.postMessage({
        type: 'PRELOAD_STATIC_COMPLETE',
        success: true
      });
    } catch (error) {
      console.error('[SW] Static preload failed:', error);
      event.ports[0]?.postMessage({
        type: 'PRELOAD_STATIC_COMPLETE',
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

  if (event.data?.type === 'PREFETCH_URL') {
    try {
      const url = event.data.url;
      if (!url) {
        throw new Error('No URL provided for prefetch');
      }

      console.log('[SW] Prefetching URL:', url);
      const cache = await caches.open(CACHE_NAME);

      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        console.log('[SW] URL already cached:', url);
        event.ports[0]?.postMessage({
          type: 'PREFETCH_COMPLETE',
          success: true,
          cached: true
        });
        return;
      }

      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('[SW] Successfully prefetched and cached:', url);
        event.ports[0]?.postMessage({
          type: 'PREFETCH_COMPLETE',
          success: true,
          cached: false
        });
      } else {
        throw new Error(
          `Fetch failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('[SW] Prefetch failed:', error);
      event.ports[0]?.postMessage({
        type: 'PREFETCH_COMPLETE',
        success: false,
        error: error.message
      });
    }
  }
});

async function preloadStaticFiles() {
  try {
    console.log('[SW] Fetching static manifest...');

    const manifestResponse = await fetch('/search/latest.json');

    if (!manifestResponse.ok) {
      throw new Error(`Static manifest not found: ${manifestResponse.status}`);
    }

    const manifest = await manifestResponse.json();
    console.log('[SW] Static manifest loaded:', {
      version: manifest.version || manifest.metadata?.version,
      format: manifest.regions ? 'Document Mode' : 'Legacy'
    });

    const staticBaseUrl = '/search/';
    const urlsToPreload = ['/search/latest.json'];

    // Handle both Document Mode and Legacy manifest formats
    if (manifest.regions && Array.isArray(manifest.regions)) {
      // Document Mode format
      console.log(
        '[SW] Processing Document Mode manifest with',
        manifest.regions.length,
        'regions'
      );

      for (const region of manifest.regions) {
        urlsToPreload.push(`${staticBaseUrl}${region.document_file}`);
        urlsToPreload.push(`${staticBaseUrl}${region.lookup_file}`);
      }
    } else if (manifest.files) {
      // Legacy format
      console.log(
        '[SW] Processing Legacy manifest with',
        manifest.files.length,
        'files'
      );
      urlsToPreload.push(
        ...manifest.files.map((file) => `${staticBaseUrl}${file}`)
      );
    } else {
      throw new Error(
        'Invalid static manifest: missing regions array or files array'
      );
    }

    console.log('[SW] Static URLs to preload:', urlsToPreload.length, 'files');

    const cache = await caches.open(CACHE_NAME);

    const preloadPromises = urlsToPreload.map(async (url) => {
      try {
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          console.log('[SW] Static file already cached:', url);
          return;
        }

        console.log('[SW] Preloading static file:', url);
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(
            '[SW] Failed to preload static file:',
            url,
            response.status
          );
          return;
        }

        await cache.put(url, response);
        console.log('[SW] Successfully cached static file:', url);
      } catch (error) {
        console.warn('[SW] Error preloading static file:', url, error.message);
      }
    });

    await Promise.all(preloadPromises);
    console.log('[SW] Static files preload completed');
  } catch (error) {
    console.error('[SW] Static files preload failed:', error);
    throw error;
  }
}

async function preloadVersionedIndexes() {
  try {
    console.log('[SW] Fetching version manifest...');

    let manifestResponse;
    let lastError;

    for (const url of VERSION_MANIFEST_URLS) {
      try {
        console.log('[SW] Trying manifest URL:', url);
        manifestResponse = await fetch(url);
        if (manifestResponse.ok) {
          console.log('[SW] Successfully fetched manifest from:', url);
          break;
        }
        lastError = new Error(
          `HTTP ${manifestResponse.status}: ${manifestResponse.statusText}`
        );
      } catch (error) {
        lastError = error;
        console.warn('[SW] Failed to fetch from:', url, error.message);
      }
    }

    if (!manifestResponse || !manifestResponse.ok) {
      throw lastError || new Error('All manifest URLs failed');
    }

    const manifest = await manifestResponse.json();
    console.log('[SW] Version manifest loaded:', {
      current: manifest.current?.version,
      previous: manifest.previous?.version
    });

    if (!manifest.current?.files) {
      throw new Error('Invalid version manifest: missing current files');
    }

    const baseCdnUrl =
      'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/';

    const urlsToPreload = [
      manifest.current.files.address_index,
      manifest.current.files.parcel_metadata
    ]
      .filter(Boolean)
      .map((url) => {
        return url.startsWith('http') ? url : `${baseCdnUrl}${url}`;
      });

    if (manifest.previous?.files) {
      const previousUrls = [
        manifest.previous.files.address_index,
        manifest.previous.files.parcel_metadata
      ]
        .filter(Boolean)
        .map((url) => {
          return url.startsWith('http') ? url : `${baseCdnUrl}${url}`;
        });
      urlsToPreload.push(...previousUrls);
    }

    console.log('[SW] URLs to preload:', urlsToPreload);

    const cache = await caches.open(CACHE_NAME);

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

// TEMPORARILY DISABLED - Service worker fetch interception is corrupting static file requests
// self.addEventListener('fetch', (event) => {
//   const url = event.request.url;

//   if (
//     url.includes('address-index-v') ||
//     url.includes('parcel-metadata-v') ||
//     url.includes('/search/') ||
//     url.includes('/public/search/')
//   ) {
//     event.respondWith(handleVersionedIndexFetch(event.request));
//   }
// });

// TEMPORARILY DISABLED - Function for handling versioned index fetching
// async function handleVersionedIndexFetch(request) {
//   try {
//     const cache = await caches.open(CACHE_NAME);
//     const cachedResponse = await cache.match(request);

//     if (cachedResponse) {
//       console.log('[SW] Serving from cache:', request.url);
//       return cachedResponse;
//     }

//     console.log('[SW] Fetching from network:', request.url);
//     const networkResponse = await fetch(request);

//     if (networkResponse.ok) {
//       const responseToCache = networkResponse.clone();
//       await cache.put(request, responseToCache);
//       console.log('[SW] Cached network response:', request.url);
//     }

//     return networkResponse;
//   } catch (error) {
//     console.error('[SW] Fetch failed:', request.url, error);
//     return new Response('Service worker fetch failed', {
//       status: 500,
//       statusText: 'Service Worker Error'
//     });
//   }
// }
