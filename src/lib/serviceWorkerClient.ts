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
  // Force preload even if already cached
  force?: boolean;
  // Timeout in milliseconds
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

      // Wait for the service worker to be ready
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

      // Send message with response port
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
}

// Create singleton instance
const serviceWorkerClient = new ServiceWorkerClient();

// Auto-register on client-side
if (typeof window !== 'undefined') {
  // Register service worker when the page loads
  window.addEventListener('load', async () => {
    const registered = await serviceWorkerClient.register();

    if (registered) {
      // Start preloading indexes in the background
      setTimeout(async () => {
        await serviceWorkerClient.preloadVersionedIndexes();
      }, 1000);
      // Delay to avoid interfering with initial page load
    }
  });
}

export default serviceWorkerClient;
export { ServiceWorkerClient };
export type { ServiceWorkerMessage, PreloadOptions };
