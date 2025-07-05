/**
 * Service Worker Client
 * Handles registration and communication with the service worker for versioned index preloading
 */

interface ServiceWorkerMessage {
  type: string;
  success?: boolean;
  error?: string;
}

interface PreloadOptions {
  force?: boolean;
  timeout?: number;
}

class ServiceWorkerClient {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported =
      typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('[SW Client] Service worker not supported');
      return false;
    }

    try {
      console.log('[SW Client] Registering service worker...');
      this.registration = await navigator.serviceWorker.register('/sw.js');

      console.log('[SW Client] Service worker registered:', {
        scope: this.registration.scope,
        state: this.registration.active?.state
      });

      await navigator.serviceWorker.ready;
      console.log('[SW Client] Service worker ready');

      return true;
    } catch (error) {
      console.error('[SW Client] Service worker registration failed:', error);
      return false;
    }
  }

  /**
   * Preload versioned index files
   */
  async preloadVersionedIndexes(
    options: PreloadOptions = {}
  ): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      console.log('[SW Client] Service worker not available for preload');
      return false;
    }

    const { timeout = 30000 } = options;

    try {
      console.log('[SW Client] Requesting preload of versioned indexes...');

      const success = await this.sendMessage(
        { type: 'PRELOAD_VERSIONED_INDEXES' },
        timeout
      );

      if (success) {
        console.log('[SW Client] Preload completed successfully');
        return true;
      } else {
        console.warn('[SW Client] Preload failed');
        return false;
      }
    } catch (error) {
      console.error('[SW Client] Preload request failed:', error);
      return false;
    }
  }

  /**
   * Preload static files
   */
  async preloadStaticFiles(options: PreloadOptions = {}): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      console.log(
        '[SW Client] Service worker not available for static preload'
      );
      return false;
    }

    const { timeout = 30000 } = options;

    try {
      console.log('[SW Client] Requesting preload of static files...');

      const success = await this.sendMessage(
        { type: 'PRELOAD_STATIC_FILES' },
        timeout
      );

      if (success) {
        console.log('[SW Client] Static files preload completed successfully');
        return true;
      } else {
        console.warn('[SW Client] Static files preload failed');
        return false;
      }
    } catch (error) {
      console.error('[SW Client] Static files preload request failed:', error);
      return false;
    }
  }

  /**
   * Clear the versioned index cache
   */
  async clearCache(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      console.log('[SW Client] Service worker not available for cache clear');
      return false;
    }

    try {
      console.log('[SW Client] Requesting cache clear...');

      const success = await this.sendMessage({ type: 'CLEAR_CACHE' }, 5000);

      if (success) {
        console.log('[SW Client] Cache cleared successfully');
        return true;
      } else {
        console.warn('[SW Client] Cache clear failed');
        return false;
      }
    } catch (error) {
      console.error('[SW Client] Cache clear request failed:', error);
      return false;
    }
  }

  /**
   * Get cache status for versioned indexes
   */
  async getCacheStatus(): Promise<{
    cacheExists: boolean;
    cachedFiles: string[];
    cacheSize?: number;
  }> {
    if (!this.isSupported) {
      return { cacheExists: false, cachedFiles: [] };
    }

    try {
      const cache = await caches.open('versioned-index-cache-v1');
      const requests = await cache.keys();
      const cachedFiles = requests.map((req) => req.url);

      return {
        cacheExists: cachedFiles.length > 0,
        cachedFiles,
        cacheSize: cachedFiles.length
      };
    } catch (error) {
      console.error('[SW Client] Error getting cache status:', error);
      return { cacheExists: false, cachedFiles: [] };
    }
  }

  /**
   * Warm up the cache by preloading if needed
   */
  async warmupCache(): Promise<boolean> {
    const status = await this.getCacheStatus();

    if (!status.cacheExists || status.cachedFiles.length === 0) {
      console.log('[SW Client] Cache is empty, triggering preload...');
      return await this.preloadVersionedIndexes();
    }

    console.log(
      '[SW Client] Cache already warm with',
      status.cachedFiles.length,
      'files'
    );
    return true;
  }

  /**
   * Background preload - starts loading data immediately without blocking
   * This eliminates cold start delays by preloading before user interaction
   */
  async backgroundPreload(): Promise<void> {
    if (!this.isSupported) {
      console.log('[SW Client] Background preload skipped - SW not supported');
      return;
    }

    try {
      console.log('🚀 [Background Preload] Starting immediate data preload...');

      this.preloadVersionedIndexes()
        .then((success) => {
          if (success) {
            console.log('✅ [Background Preload] Data preloaded successfully');
          } else {
            console.warn('⚠️ [Background Preload] Preload failed');
          }
        })
        .catch((error) => {
          console.warn('⚠️ [Background Preload] Preload error:', error);
        });
    } catch (error) {
      console.warn('[Background Preload] Setup failed:', error);
    }
  }

  /**
   * Force refresh the cache (clear + preload)
   */
  async refreshCache(): Promise<boolean> {
    console.log('[SW Client] Refreshing cache...');

    const cleared = await this.clearCache();
    if (!cleared) {
      return false;
    }

    return await this.preloadVersionedIndexes();
  }

  /**
   * Send a message to the service worker and wait for response
   */
  private async sendMessage(
    message: Record<string, unknown>,
    timeout: number = 10000
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.registration?.active) {
        reject(new Error('No active service worker'));
        return;
      }

      const messageChannel = new MessageChannel();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Service worker message timeout after ${timeout}ms`));
      }, timeout);

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        const response: ServiceWorkerMessage = event.data;

        if (response.success) {
          resolve(true);
        } else {
          reject(
            new Error(response.error || 'Service worker operation failed')
          );
        }
      };

      this.registration.active.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Check if service worker is registered and active
   */
  isReady(): boolean {
    return this.isSupported && this.registration?.active?.state === 'activated';
  }

  /**
   * Get service worker registration info
   */
  getInfo() {
    if (!this.isSupported) {
      return { supported: false };
    }

    return {
      supported: true,
      registered: !!this.registration,
      state: this.registration?.active?.state,
      scope: this.registration?.scope
    };
  }

  /**
   * Check if a specific URL is cached
   */
  async isCached(url: string): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const cache = await caches.open('versioned-index-cache-v1');
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      console.error('[SW Client] Error checking cache for URL:', url, error);
      return false;
    }
  }

  /**
   * Prefetch a specific URL if not already cached
   */
  async prefetchUrl(url: string): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      if (await this.isCached(url)) {
        console.log('[SW Client] URL already cached:', url);
        return true;
      }

      const success = await this.sendMessage(
        { type: 'PREFETCH_URL', url },
        10000
      );

      return success;
    } catch (error) {
      console.error('[SW Client] Prefetch failed for URL:', url, error);
      return false;
    }
  }
}

const serviceWorkerClient = new ServiceWorkerClient();

if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    const registered = await serviceWorkerClient.register();

    if (registered) {
      // Disabled: backgroundPreload is handled by dedicated backgroundPreloader.ts
      // serviceWorkerClient.backgroundPreload();

      setTimeout(async () => {
        try {
          await serviceWorkerClient.warmupCache();
        } catch (error) {
          console.warn('[SW Client] Cache warmup failed:', error);
        }
      }, 1000);
    }
  });

  window.addEventListener('online', async () => {
    console.log('[SW Client] Back online, checking cache freshness...');
  });
}

export default serviceWorkerClient;
export { ServiceWorkerClient };
export type { ServiceWorkerMessage, PreloadOptions };
