import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import backgroundPreloader, {
  BackgroundPreloader
} from './backgroundPreloader';
import { loadAddressIndexProgressive } from '@services/loadAddressIndex';
import { createTestSuite } from '@lib/testUtils';
import { MOCK_FLEXSEARCH_BUNDLE } from '@lib/testData';

vi.mock('@services/loadAddressIndex');
vi.mock('@lib/logger', () => ({
  devLog: vi.fn(),
  devWarn: vi.fn()
}));

describe('BackgroundPreloader', () => {
  const testSuite = createTestSuite({
    consoleMocks: true,
    browserEnvironment: true
  });

  let preloader: BackgroundPreloader;
  let mockLoadAddressIndexProgressive: ReturnType<typeof vi.fn>;
  let mockDispatchEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testSuite.beforeEachSetup();

    mockLoadAddressIndexProgressive = vi.mocked(loadAddressIndexProgressive);
    mockDispatchEvent = vi.fn();

    Object.defineProperty(global, 'window', {
      value: {
        dispatchEvent: mockDispatchEvent,
        __addressIndexPreloadStarted: undefined
      },
      writable: true
    });

    Object.defineProperty(global, 'Date', {
      value: {
        now: vi.fn().mockReturnValue(1000)
      },
      writable: true
    });

    preloader = new BackgroundPreloader();

    // Reset singleton state for tests
    backgroundPreloader.reset();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  describe('constructor', () => {
    it('should initialize with default status', () => {
      const status = preloader.getStatus();

      expect(status).toEqual({
        isLoading: false,
        isComplete: false,
        error: null,
        startTime: null,
        endTime: null
      });
    });
  });

  describe('start', () => {
    beforeEach(() => {
      vi.mocked(Date.now).mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    });

    it('should not start if not in browser environment', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      await preloader.start();

      expect(mockLoadAddressIndexProgressive).not.toHaveBeenCalled();
      expect(preloader.getStatus().isLoading).toBe(false);
    });

    it('should not start if already loading', async () => {
      preloader['status'].isLoading = true;

      await preloader.start();

      expect(mockLoadAddressIndexProgressive).not.toHaveBeenCalled();
    });

    it('should not start if already complete', async () => {
      preloader['status'].isComplete = true;

      await preloader.start();

      expect(mockLoadAddressIndexProgressive).not.toHaveBeenCalled();
    });

    it('should successfully preload address index', async () => {
      const { devLog } = vi.mocked(await import('@lib/logger'));
      mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);

      await preloader.start();

      expect(mockLoadAddressIndexProgressive).toHaveBeenCalledOnce();
      expect(devLog).toHaveBeenCalledWith(
        '🚀 [Background Preloader] Starting aggressive address index preload...'
      );
      expect(devLog).toHaveBeenCalledWith(
        '✅ [Background Preloader] Address index preloaded in 1000ms'
      );
    });
    it('should update status correctly during successful preload', async () => {
      mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);

      const startPromise = preloader.start();

      expect(preloader.getStatus().isLoading).toBe(true);
      expect(preloader.getStatus().startTime).toBe(1000);

      await startPromise;

      const finalStatus = preloader.getStatus();
      expect(finalStatus.isLoading).toBe(false);
      expect(finalStatus.isComplete).toBe(true);
      expect(finalStatus.error).toBeNull();
      expect(finalStatus.endTime).toBe(2000);
    });

    it('should dispatch success event after successful preload', async () => {
      mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);

      await preloader.start();

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addressIndexPreloaded',
          detail: { duration: 1000 }
        })
      );
    });

    it('should handle preload errors gracefully', async () => {
      const testError = new Error('Network failure');
      mockLoadAddressIndexProgressive.mockRejectedValue(testError);

      await preloader.start();

      const status = preloader.getStatus();
      expect(status.isLoading).toBe(false);
      expect(status.isComplete).toBe(false);
      expect(status.error).toBe('Network failure');
      expect(status.endTime).toBe(2000);
    });

    it('should log error during failed preload', async () => {
      const { devWarn } = vi.mocked(await import('@lib/logger'));
      const testError = new Error('Network failure');
      mockLoadAddressIndexProgressive.mockRejectedValue(testError);

      await preloader.start();

      expect(devWarn).toHaveBeenCalledWith(
        '⚠️ [Background Preloader] Preload failed:',
        'Network failure'
      );
    });

    it('should dispatch error event after failed preload', async () => {
      const testError = new Error('Network failure');
      mockLoadAddressIndexProgressive.mockRejectedValue(testError);

      await preloader.start();

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addressIndexPreloadError',
          detail: { error: 'Network failure' }
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      const testError = 'String error';
      mockLoadAddressIndexProgressive.mockRejectedValue(testError);

      await preloader.start();

      const status = preloader.getStatus();
      expect(status.error).toBe('String error');
    });
  });

  describe('getStatus', () => {
    it('should return a copy of the status object', () => {
      const status1 = preloader.getStatus();
      const status2 = preloader.getStatus();

      expect(status1).not.toBe(status2);
      expect(status1).toEqual(status2);
    });

    it('should reflect current state during preload', async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });
      mockLoadAddressIndexProgressive.mockReturnValue(loadPromise);

      const startPromise = preloader.start();

      expect(preloader.getStatus().isLoading).toBe(true);
      expect(preloader.getStatus().isComplete).toBe(false);

      resolveLoad!();
      await startPromise;

      expect(preloader.getStatus().isLoading).toBe(false);
      expect(preloader.getStatus().isComplete).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset status to initial state', async () => {
      mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);
      await preloader.start();

      expect(preloader.getStatus().isComplete).toBe(true);

      preloader.reset();

      expect(preloader.getStatus()).toEqual({
        isLoading: false,
        isComplete: false,
        error: null,
        startTime: null,
        endTime: null
      });
    });
    it('should allow restart after reset', async () => {
      mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);
      await preloader.start();

      preloader.reset();
      await preloader.start();

      expect(mockLoadAddressIndexProgressive).toHaveBeenCalledTimes(2);
    });
  });

  describe('isDataReady', () => {
    it('should return false when not started', () => {
      expect(preloader.isDataReady()).toBe(false);
    });

    it('should return false when loading', async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });
      mockLoadAddressIndexProgressive.mockReturnValue(loadPromise);

      preloader.start();

      expect(preloader.isDataReady()).toBe(false);

      resolveLoad!();
      await loadPromise;
    });

    it('should return true when successfully completed', async () => {
      mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);
      await preloader.start();

      expect(preloader.isDataReady()).toBe(true);
    });

    it('should return false when completed with error', async () => {
      mockLoadAddressIndexProgressive.mockRejectedValue(
        new Error('Test error')
      );
      await preloader.start();

      expect(preloader.isDataReady()).toBe(false);
    });
  });
});

describe('backgroundPreloader singleton', () => {
  const testSuite = createTestSuite({
    browserEnvironment: true
  });

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('should be an instance of BackgroundPreloader', () => {
    expect(backgroundPreloader).toBeInstanceOf(BackgroundPreloader);
  });

  it('should have initial status when first accessed', () => {
    const status = backgroundPreloader.getStatus();

    expect(status).toEqual({
      isLoading: false,
      isComplete: false,
      error: null,
      startTime: null,
      endTime: null
    });
  });

  it('should allow manual start operation', async () => {
    const mockLoadAddressIndexProgressive = vi.mocked(
      loadAddressIndexProgressive
    );
    mockLoadAddressIndexProgressive.mockResolvedValue(MOCK_FLEXSEARCH_BUNDLE);

    // Reset singleton state to ensure clean test
    backgroundPreloader.reset();

    // Clear any previous mock calls
    mockLoadAddressIndexProgressive.mockClear();

    await backgroundPreloader.start();

    expect(mockLoadAddressIndexProgressive).toHaveBeenCalledOnce();
    expect(backgroundPreloader.getStatus().isComplete).toBe(true);
  });
});
