import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import serviceWorkerClient, {
  ServiceWorkerClient
} from './serviceWorkerClient';
import { createTestSuite, createCacheMocks } from '@lib/testUtils';

describe('ServiceWorkerClient', () => {
  const testSuite = createTestSuite({
    consoleMocks: true,
    browserEnvironment: true
  });

  let client: ServiceWorkerClient;
  let mockNavigator: {
    serviceWorker: {
      register: ReturnType<typeof vi.fn>;
      ready: Promise<ServiceWorkerRegistration>;
    };
  };
  let mockRegistration: {
    scope: string;
    active: {
      state: string;
      postMessage: ReturnType<typeof vi.fn>;
    } | null;
  };
  let mockMessageChannel: {
    port1: { onmessage: ((event: MessageEvent) => void) | null };
    port2: MessagePort;
  };
  let mockCaches: ReturnType<typeof createCacheMocks>['mockCaches'];
  let mockCache: ReturnType<typeof createCacheMocks>['mockCache'];

  beforeEach(() => {
    testSuite.beforeEachSetup();

    const cacheMocks = createCacheMocks();
    mockCache = cacheMocks.mockCache;
    mockCaches = cacheMocks.mockCaches;

    mockRegistration = {
      scope: '/test-scope/',
      active: {
        state: 'activated',
        postMessage: vi.fn()
      }
    };

    mockNavigator = {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration as ServiceWorkerRegistration)
      }
    };

    mockMessageChannel = {
      port1: { onmessage: null },
      port2: {} as MessagePort
    };

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });

    Object.defineProperty(global, 'MessageChannel', {
      value: vi.fn(() => mockMessageChannel),
      writable: true
    });

    Object.defineProperty(global, 'caches', {
      value: mockCaches,
      writable: true
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    client = new ServiceWorkerClient();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  describe('constructor', () => {
    it('should initialize with service worker support detected', () => {
      expect(client['isSupported']).toBe(true);
    });

    it('should detect no service worker support when navigator.serviceWorker is missing', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      const unsupportedClient = new ServiceWorkerClient();
      expect(unsupportedClient['isSupported']).toBe(false);
    });

    it('should detect no service worker support in non-browser environment', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const serverClient = new ServiceWorkerClient();
      expect(serverClient['isSupported']).toBe(false);
    });
  });

  describe('register', () => {
    it('should successfully register service worker', async () => {
      const result = await client.register();

      expect(result).toBe(true);
      expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith(
        '/sw.js'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Registering service worker...'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Service worker registered:',
        {
          scope: '/test-scope/',
          state: 'activated'
        }
      );
    });

    it('should return false when service worker not supported', async () => {
      client['isSupported'] = false;

      const result = await client.register();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Service worker not supported'
      );
      expect(mockNavigator.serviceWorker.register).not.toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      const error = new Error('Registration failed');
      mockNavigator.serviceWorker.register.mockRejectedValue(error);

      const result = await client.register();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Service worker registration failed:',
        error
      );
    });

    it('should wait for service worker to be ready', async () => {
      await client.register();

      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Service worker ready'
      );
    });
  });

  describe('preloadVersionedIndexes', () => {
    let client: ServiceWorkerClient;

    it('should successfully preload versioned indexes', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: true };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.preloadVersionedIndexes();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Requesting preload of versioned indexes...'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Preload completed successfully'
      );
      expect(mockRegistration.active?.postMessage).toHaveBeenCalledWith(
        { type: 'PRELOAD_VERSIONED_INDEXES' },
        [mockMessageChannel.port2]
      );
    });

    it('should return false when service worker not available', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      client['isSupported'] = false;

      const result = await client.preloadVersionedIndexes();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Service worker not available for preload'
      );
    });

    it('should return false when registration not available', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      client['registration'] = null;

      const result = await client.preloadVersionedIndexes();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Service worker not available for preload'
      );
    });

    it('should handle preload failure response', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: false, error: 'Preload failed' };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.preloadVersionedIndexes();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Preload request failed:',
        expect.any(Error)
      );
    });

    it('should handle timeout', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const result = await client.preloadVersionedIndexes({ timeout: 50 });

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Preload request failed:',
        expect.any(Error)
      );
    });

    it('should use custom timeout option', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: true };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.preloadVersionedIndexes({ timeout: 5000 });

      expect(result).toBe(true);
    });
  });

  describe('clearCache', () => {
    let client: ServiceWorkerClient;

    it('should successfully clear cache', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: true };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.clearCache();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Requesting cache clear...'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Cache cleared successfully'
      );
      expect(mockRegistration.active?.postMessage).toHaveBeenCalledWith(
        { type: 'CLEAR_CACHE' },
        [mockMessageChannel.port2]
      );
    });

    it('should return false when service worker not available', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      client['isSupported'] = false;

      const result = await client.clearCache();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Service worker not available for cache clear'
      );
    });

    it('should handle cache clear failure', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: false, error: 'Clear failed' };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.clearCache();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Cache clear request failed:',
        expect.any(Error)
      );
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status with cached files', async () => {
      const mockRequests = [
        { url: 'https://example.com/file1.json' },
        { url: 'https://example.com/file2.json' }
      ];
      mockCache.keys.mockResolvedValue(mockRequests);

      const result = await client.getCacheStatus();

      expect(result).toEqual({
        cacheExists: true,
        cachedFiles: [
          'https://example.com/file1.json',
          'https://example.com/file2.json'
        ],
        cacheSize: 2
      });
      expect(mockCaches.open).toHaveBeenCalledWith('versioned-index-cache-v1');
    });

    it('should return empty cache status when no files cached', async () => {
      mockCache.keys.mockResolvedValue([]);

      const result = await client.getCacheStatus();

      expect(result).toEqual({
        cacheExists: false,
        cachedFiles: [],
        cacheSize: 0
      });
    });

    it('should return false cache status when service worker not supported', async () => {
      client['isSupported'] = false;

      const result = await client.getCacheStatus();

      expect(result).toEqual({
        cacheExists: false,
        cachedFiles: []
      });
    });

    it('should handle cache access errors', async () => {
      mockCaches.open.mockRejectedValue(new Error('Cache access failed'));

      const result = await client.getCacheStatus();

      expect(result).toEqual({
        cacheExists: false,
        cachedFiles: []
      });
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Error getting cache status:',
        expect.any(Error)
      );
    });
  });

  describe('warmupCache', () => {
    let client: ServiceWorkerClient;

    it('should trigger preload when cache is empty', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      mockCache.keys.mockResolvedValue([]);

      const mockResponse = { success: true };
      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.warmupCache();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Cache is empty, triggering preload...'
      );
      expect(mockRegistration.active?.postMessage).toHaveBeenCalledWith(
        { type: 'PRELOAD_VERSIONED_INDEXES' },
        [mockMessageChannel.port2]
      );
    });

    it('should skip preload when cache already warm', async () => {
      client = new ServiceWorkerClient();
      await client.register();
      vi.clearAllMocks();

      const mockRequests = [{ url: 'https://example.com/file1.json' }];
      mockCache.keys.mockResolvedValue(mockRequests);

      const result = await client.warmupCache();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Cache already warm with',
        1,
        'files'
      );
      expect(mockRegistration.active?.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('backgroundPreload', () => {
    it('should start background preload without waiting', async () => {
      await client.register();
      vi.clearAllMocks();

      client.backgroundPreload();

      expect(console.log).toHaveBeenCalledWith(
        '🚀 [Background Preload] Starting immediate data preload...'
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should skip background preload when service worker not supported', async () => {
      await client.register();
      vi.clearAllMocks();

      client['isSupported'] = false;

      client.backgroundPreload();

      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Background preload skipped - SW not supported'
      );
    });

    it('should handle background preload setup errors gracefully', async () => {
      await client.register();
      vi.clearAllMocks();

      vi.spyOn(client, 'preloadVersionedIndexes').mockImplementation(() => {
        throw new Error('Setup failed');
      });

      client.backgroundPreload();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.warn).toHaveBeenCalledWith(
        '[Background Preload] Setup failed:',
        expect.any(Error)
      );
    });
  });

  describe('refreshCache', () => {
    it('should successfully refresh cache (clear + preload)', async () => {
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: true };

      let callCount = 0;
      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          callCount++;
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
          if (callCount < 2) {
            setTimeout(() => {
              if (mockMessageChannel.port1.onmessage) {
                mockMessageChannel.port1.onmessage({
                  data: mockResponse
                } as MessageEvent);
              }
            }, 10);
          }
        }
      }, 10);

      const result = await client.refreshCache();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] Refreshing cache...'
      );
    });

    it('should return false if cache clear fails', async () => {
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: false };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.refreshCache();

      expect(result).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return true when service worker is registered and active', async () => {
      await client.register();

      expect(client.isReady()).toBe(true);
    });

    it('should return false when service worker not supported', () => {
      client['isSupported'] = false;

      expect(client.isReady()).toBe(false);
    });

    it('should return false when registration is null', () => {
      client['registration'] = null;

      expect(client.isReady()).toBe(false);
    });

    it('should return false when active service worker state is not activated', async () => {
      mockRegistration.active!.state = 'installing';
      await client.register();

      expect(client.isReady()).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should return info when service worker is supported and registered', async () => {
      await client.register();

      const info = client.getInfo();

      expect(info).toEqual({
        supported: true,
        registered: true,
        state: 'activated',
        scope: '/test-scope/'
      });
    });

    it('should return unsupported info when service worker not supported', () => {
      client['isSupported'] = false;

      const info = client.getInfo();

      expect(info).toEqual({
        supported: false
      });
    });

    it('should return info with registered false when not registered', () => {
      const info = client.getInfo();

      expect(info).toEqual({
        supported: true,
        registered: false,
        state: undefined,
        scope: undefined
      });
    });
  });

  describe('isCached', () => {
    it('should return true when URL is cached', async () => {
      const testUrl = 'https://example.com/test.json';
      mockCache.match.mockResolvedValue({ ok: true });

      const result = await client.isCached(testUrl);

      expect(result).toBe(true);
      expect(mockCache.match).toHaveBeenCalledWith(testUrl);
    });

    it('should return false when URL is not cached', async () => {
      const testUrl = 'https://example.com/test.json';
      mockCache.match.mockResolvedValue(null);

      const result = await client.isCached(testUrl);

      expect(result).toBe(false);
    });

    it('should return false when service worker not supported', async () => {
      client['isSupported'] = false;

      const result = await client.isCached('https://example.com/test.json');

      expect(result).toBe(false);
    });

    it('should handle cache check errors', async () => {
      const testUrl = 'https://example.com/test.json';
      mockCache.match.mockRejectedValue(new Error('Cache error'));

      const result = await client.isCached(testUrl);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Error checking cache for URL:',
        testUrl,
        expect.any(Error)
      );
    });
  });

  describe('prefetchUrl', () => {
    it('should return true when URL is already cached', async () => {
      await client.register();
      vi.clearAllMocks();

      const testUrl = 'https://example.com/test.json';
      mockCache.match.mockResolvedValue({ ok: true });

      const result = await client.prefetchUrl(testUrl);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[SW Client] URL already cached:',
        testUrl
      );
    });

    it('should successfully prefetch uncached URL', async () => {
      await client.register();
      vi.clearAllMocks();

      const testUrl = 'https://example.com/test.json';
      mockCache.match.mockResolvedValue(null);

      const mockResponse = { success: true };
      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.prefetchUrl(testUrl);

      expect(result).toBe(true);
      expect(mockRegistration.active?.postMessage).toHaveBeenCalledWith(
        { type: 'PREFETCH_URL', url: testUrl },
        [mockMessageChannel.port2]
      );
    });

    it('should return false when service worker not supported', async () => {
      await client.register();
      vi.clearAllMocks();

      client['isSupported'] = false;

      const result = await client.prefetchUrl('https://example.com/test.json');

      expect(result).toBe(false);
    });

    it('should handle prefetch errors', async () => {
      await client.register();
      vi.clearAllMocks();

      const testUrl = 'https://example.com/test.json';
      mockCache.match.mockResolvedValue(null);

      const mockResponse = { success: false, error: 'Prefetch failed' };
      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      const result = await client.prefetchUrl(testUrl);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SW Client] Prefetch failed for URL:',
        testUrl,
        expect.any(Error)
      );
    });
  });

  describe('sendMessage (private method)', () => {
    it('should reject when no active service worker', async () => {
      await client.register();
      vi.clearAllMocks();

      mockRegistration.active = null;

      try {
        await client['sendMessage']({ type: 'TEST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(new Error('No active service worker'));
      }
    });

    it('should timeout when no response received', async () => {
      await client.register();
      vi.clearAllMocks();

      try {
        await client['sendMessage']({ type: 'TEST' }, 50);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(
          new Error('Service worker message timeout after 50ms')
        );
      }
    });

    it('should reject when service worker returns error', async () => {
      await client.register();
      vi.clearAllMocks();

      const mockResponse = { success: false, error: 'Operation failed' };

      setTimeout(() => {
        if (mockMessageChannel.port1.onmessage) {
          mockMessageChannel.port1.onmessage({
            data: mockResponse
          } as MessageEvent);
        }
      }, 10);

      try {
        await client['sendMessage']({ type: 'TEST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(new Error('Operation failed'));
      }
    });
  });
});

describe('serviceWorkerClient singleton', () => {
  const testSuite = createTestSuite({
    browserEnvironment: true
  });

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('should be an instance of ServiceWorkerClient', () => {
    expect(serviceWorkerClient).toBeInstanceOf(ServiceWorkerClient);
  });

  it('should provide the same interface as ServiceWorkerClient', () => {
    expect(typeof serviceWorkerClient.register).toBe('function');
    expect(typeof serviceWorkerClient.preloadVersionedIndexes).toBe('function');
    expect(typeof serviceWorkerClient.clearCache).toBe('function');
    expect(typeof serviceWorkerClient.getCacheStatus).toBe('function');
    expect(typeof serviceWorkerClient.warmupCache).toBe('function');
    expect(typeof serviceWorkerClient.backgroundPreload).toBe('function');
    expect(typeof serviceWorkerClient.refreshCache).toBe('function');
    expect(typeof serviceWorkerClient.isReady).toBe('function');
    expect(typeof serviceWorkerClient.getInfo).toBe('function');
    expect(typeof serviceWorkerClient.isCached).toBe('function');
    expect(typeof serviceWorkerClient.prefetchUrl).toBe('function');
  });
});
