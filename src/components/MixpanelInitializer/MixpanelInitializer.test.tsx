import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupBrowserEnvironment, createConsoleMocks } from '@lib/testUtils';

vi.mock('@config/mixpanelClient', () => ({
  default: {
    register: vi.fn(),
    init: vi.fn(),
    track: vi.fn()
  }
}));

import MixpanelInitializer from './MixpanelInitializer';
import mixpanel from '@config/mixpanelClient';

const mockMixpanel = vi.mocked(mixpanel);

describe('MixpanelInitializer', () => {
  let consoleSpies: ReturnType<typeof createConsoleMocks>;

  beforeEach(() => {
    setupBrowserEnvironment();
    consoleSpies = createConsoleMocks();

    mockMixpanel.register.mockReset();
    mockMixpanel.init.mockReset();
    mockMixpanel.track.mockReset();
    mockMixpanel.register.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    consoleSpies?.restore();
  });

  describe('Component lifecycle', () => {
    it('renders without crashing and returns null', () => {
      const { container } = render(<MixpanelInitializer />);
      expect(container.firstChild).toBeNull();
    });

    it('does not run on server side (SSR)', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const { container } = render(<MixpanelInitializer />);

      expect(container.firstChild).toBeNull();

      expect(mockMixpanel.register).toHaveBeenCalled();
    });
  });

  describe('Mixpanel initialization', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Test User Agent'
      });
      Object.defineProperty(document, 'referrer', {
        writable: true,
        value: 'https://example.com'
      });
    });

    it('initiates Mixpanel initialization on mount when document is ready', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<MixpanelInitializer />);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[Mixpanel] Initializing analytics...'
      );
    });

    it('waits for window load event when document is not ready', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(<MixpanelInitializer />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'load',
        expect.any(Function)
      );
      expect(mockMixpanel.register).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    });

    it('registers analytics properties when token is configured', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

      render(<MixpanelInitializer />);

      expect(mockMixpanel.register).toHaveBeenCalledWith({
        page_load_time: mockDate.getTime(),
        user_agent: 'Test User Agent',
        referrer: 'https://example.com'
      });

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[Mixpanel] Analytics initialized successfully'
      );
    });

    it('handles direct traffic (no referrer)', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      Object.defineProperty(document, 'referrer', {
        writable: true,
        value: ''
      });

      render(<MixpanelInitializer />);

      expect(mockMixpanel.register).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer: 'direct'
        })
      );
    });

    it('logs warning when token is not configured', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', '');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<MixpanelInitializer />);

      expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
        '[Mixpanel] Token not configured, analytics disabled'
      );
      expect(mockMixpanel.register).not.toHaveBeenCalled();
    });

    it('handles initialization errors gracefully', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      const initError = new Error('Mixpanel initialization failed');
      mockMixpanel.register.mockImplementation(() => {
        throw initError;
      });

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<MixpanelInitializer />);

      expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
        '[Mixpanel] Initialization failed:',
        initError
      );
    });
  });

  describe('Event listener management', () => {
    it('properly cleans up event listeners on unmount', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<MixpanelInitializer />);

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
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<MixpanelInitializer />);
      unmount();

      expect(removeEventListenerSpy).not.toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Analytics property registration', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'test-token');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });
    });

    it('includes correct page load timestamp', () => {
      const mockTimestamp = 1705315800000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      render(<MixpanelInitializer />);

      expect(mockMixpanel.register).toHaveBeenCalledWith(
        expect.objectContaining({
          page_load_time: mockTimestamp
        })
      );
    });

    it('captures user agent correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Test Browser)'
      });

      render(<MixpanelInitializer />);

      expect(mockMixpanel.register).toHaveBeenCalledWith(
        expect.objectContaining({
          user_agent: 'Mozilla/5.0 (Test Browser)'
        })
      );
    });

    it('captures referrer correctly', () => {
      Object.defineProperty(document, 'referrer', {
        writable: true,
        value: 'https://example.com'
      });

      render(<MixpanelInitializer />);

      expect(mockMixpanel.register).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer: 'https://example.com'
        })
      );
    });
  });

  describe('Environment-specific behavior', () => {
    it('handles development environment', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'dev-token');
      vi.stubEnv('NODE_ENV', 'development');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<MixpanelInitializer />);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[Mixpanel] Analytics initialized successfully'
      );
    });

    it('handles production environment', () => {
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', 'prod-token');
      vi.stubEnv('NODE_ENV', 'production');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<MixpanelInitializer />);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        '[Mixpanel] Analytics initialized successfully'
      );
    });

    it('handles test environment gracefully', () => {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('NEXT_PUBLIC_MIXPANEL', '');

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      render(<MixpanelInitializer />);

      expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
        '[Mixpanel] Token not configured, analytics disabled'
      );
    });
  });
});
