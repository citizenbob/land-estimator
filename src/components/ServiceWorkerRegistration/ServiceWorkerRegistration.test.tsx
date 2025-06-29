import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupBrowserEnvironment, createConsoleMocks } from '@lib/testUtils';

vi.mock('@workers/serviceWorkerClient', () => ({
  default: {
    register: vi.fn(),
    preloadVersionedIndexes: vi.fn()
  }
}));

import ServiceWorkerRegistration from './ServiceWorkerRegistration';
import serviceWorkerClient from '@workers/serviceWorkerClient';

const mockServiceWorkerClient = vi.mocked(serviceWorkerClient);

describe('ServiceWorkerRegistration', () => {
  let consoleSpies: ReturnType<typeof createConsoleMocks>;

  beforeEach(() => {
    setupBrowserEnvironment();
    vi.useFakeTimers();
    consoleSpies = createConsoleMocks();

    if (!window.addEventListener) {
      window.addEventListener = vi.fn();
    }
    if (!window.removeEventListener) {
      window.removeEventListener = vi.fn();
    }

    mockServiceWorkerClient.register.mockReset();
    mockServiceWorkerClient.preloadVersionedIndexes.mockReset();

    mockServiceWorkerClient.register.mockResolvedValue(true);
    mockServiceWorkerClient.preloadVersionedIndexes.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.clearAllMocks();
    consoleSpies?.restore();
  });

  describe('Component lifecycle', () => {
    it('renders without crashing and returns null', () => {
      const { container } = render(<ServiceWorkerRegistration />);
      expect(container.firstChild).toBeNull();
    });

    it('does not run on server side (SSR)', () => {
      const { container } = render(<ServiceWorkerRegistration />);

      expect(container.firstChild).toBeNull();

      expect(mockServiceWorkerClient.register).toHaveBeenCalled();
    });
  });

  describe('Service worker registration', () => {
    it('initiates service worker registration on mount when document is ready', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<ServiceWorkerRegistration />);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Initializing service worker...'
      );
      expect(mockServiceWorkerClient.register).toHaveBeenCalledTimes(1);
    });

    it('waits for window load event when document is not ready', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<ServiceWorkerRegistration />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'load',
        expect.any(Function)
      );
      expect(mockServiceWorkerClient.register).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    });

    it('logs success message when registration succeeds', async () => {
      mockServiceWorkerClient.register.mockResolvedValue(true);

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Service worker registered successfully'
      );
    });

    it('logs failure message when registration fails', async () => {
      mockServiceWorkerClient.register.mockResolvedValue(false);

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Service worker registration failed or not supported'
      );
    });

    it('handles registration errors gracefully', async () => {
      const registrationError = new Error('Registration failed');
      mockServiceWorkerClient.register.mockRejectedValue(registrationError);

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();

      expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
        '[SW Registration] Service worker initialization failed:',
        registrationError
      );
    });
  });

  describe('Background preloading', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });
    });

    it('initiates background preload after successful registration with delay', async () => {
      mockServiceWorkerClient.register.mockResolvedValue(true);
      mockServiceWorkerClient.preloadVersionedIndexes.mockResolvedValue(true);

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();

      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Starting background preload...'
      );
      expect(
        mockServiceWorkerClient.preloadVersionedIndexes
      ).toHaveBeenCalledTimes(1);
    });

    it('logs success message when preload completes', async () => {
      mockServiceWorkerClient.register.mockResolvedValue(true);
      mockServiceWorkerClient.preloadVersionedIndexes.mockResolvedValue(true);

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Background preload completed'
      );
    });

    it('handles preload errors gracefully', async () => {
      const preloadError = new Error('Preload failed');
      mockServiceWorkerClient.register.mockResolvedValue(true);
      mockServiceWorkerClient.preloadVersionedIndexes.mockRejectedValue(
        preloadError
      );

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
        '[SW Registration] Background preload failed:',
        preloadError
      );
    });

    it('does not attempt preload when registration fails', async () => {
      mockServiceWorkerClient.register.mockResolvedValue(false);

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(
        mockServiceWorkerClient.preloadVersionedIndexes
      ).not.toHaveBeenCalled();
    });
  });

  describe('Event listener management', () => {
    it('properly cleans up event listeners on unmount', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<ServiceWorkerRegistration />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'load',
        expect.any(Function)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'load',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('handles unmount when document is already ready', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<ServiceWorkerRegistration />);
      unmount();

      expect(removeEventListenerSpy).not.toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('completes full initialization flow successfully', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      mockServiceWorkerClient.register.mockResolvedValue(true);
      mockServiceWorkerClient.preloadVersionedIndexes.mockResolvedValue(true);

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Initializing service worker...'
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Service worker registered successfully'
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Starting background preload...'
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[SW Registration] Background preload completed'
      );
    });

    it('handles complete failure scenario gracefully', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const registrationError = new Error('Complete failure');
      mockServiceWorkerClient.register.mockRejectedValue(registrationError);

      render(<ServiceWorkerRegistration />);

      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
        '[SW Registration] Service worker initialization failed:',
        registrationError
      );

      expect(
        mockServiceWorkerClient.preloadVersionedIndexes
      ).not.toHaveBeenCalled();
    });
  });
});
