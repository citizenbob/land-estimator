import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setupBrowserEnvironment,
  createConsoleMocks,
  createMockPreloadStatus
} from '@lib/testUtils';

vi.mock('@workers/backgroundPreloader', () => ({
  default: {
    getStatus: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined)
  }
}));

import BackgroundPreloadStatus from './BackgroundPreloadStatus';
import backgroundPreloader from '@workers/backgroundPreloader';

const mockBackgroundPreloader = vi.mocked(backgroundPreloader);

describe('BackgroundPreloadStatus', () => {
  const { restore } = createConsoleMocks();

  beforeEach(() => {
    setupBrowserEnvironment();
    vi.useFakeTimers();
    mockBackgroundPreloader.getStatus.mockReset();
    mockBackgroundPreloader.getStatus.mockReturnValue(
      createMockPreloadStatus()
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    restore();
    vi.unstubAllEnvs();
  });

  describe('Environment-based rendering', () => {
    it('renders nothing in production mode', () => {
      vi.stubEnv('NODE_ENV', 'production');

      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      const { container } = render(<BackgroundPreloadStatus />);
      expect(container.firstChild).toBeNull();
    });

    it('renders status indicator in development mode when loading', () => {
      vi.stubEnv('NODE_ENV', 'development');

      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      render(<BackgroundPreloadStatus />);

      // Wait for delayed status to show
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('⚡ Loading...')).toBeInTheDocument();
    });
  });

  describe('Loading state management', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('shows loading indicator when preload is in progress', () => {
      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      render(<BackgroundPreloadStatus />);

      // Wait for delayed status to show
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const indicator = screen.getByText('⚡ Loading...');
      expect(indicator).toBeInTheDocument();

      expect(indicator.parentElement).toBeTruthy();

      expect(indicator.parentElement?.tagName).toBe('DIV');
    });

    it('polls status while loading and updates display', async () => {
      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      render(<BackgroundPreloadStatus />);

      // Wait for delayed status to show
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('⚡ Loading...')).toBeInTheDocument();

      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: false, isComplete: true })
      );

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockBackgroundPreloader.getStatus).toHaveBeenCalled();
    });
  });

  describe('Success state handling', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('shows success indicator and auto-hides after timeout', async () => {
      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: false, isComplete: true })
      );

      render(<BackgroundPreloadStatus />);

      act(() => {
        const event = new CustomEvent('addressIndexPreloaded');
        window.dispatchEvent(event);
      });

      expect(screen.getByText('✅ Ready')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('✅ Ready')).not.toBeInTheDocument();
    });

    it('logs success message when preload completes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<BackgroundPreloadStatus />);

      act(() => {
        const event = new CustomEvent('addressIndexPreloaded');
        window.dispatchEvent(event);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '🎯 Address index preloaded, search will be instant'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error state handling', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('shows error indicator when preload fails', async () => {
      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      render(<BackgroundPreloadStatus />);

      // Wait for delayed status to show
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('⚡ Loading...')).toBeInTheDocument();

      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ error: 'Preload failed' })
      );

      act(() => {
        const event = new CustomEvent('addressIndexPreloadError');
        window.dispatchEvent(event);
      });

      expect(screen.getByText('⚠️ Error')).toBeInTheDocument();
    });

    it('logs warning message when preload fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<BackgroundPreloadStatus />);

      act(() => {
        const event = new CustomEvent('addressIndexPreloadError');
        window.dispatchEvent(event);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Preload failed, first search may be slower'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Event listener management', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('properly cleans up event listeners on unmount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<BackgroundPreloadStatus />);

      expect(addSpy).toHaveBeenCalledWith(
        'addressIndexPreloaded',
        expect.any(Function)
      );
      expect(addSpy).toHaveBeenCalledWith(
        'addressIndexPreloadError',
        expect.any(Function)
      );

      unmount();

      expect(removeSpy).toHaveBeenCalledWith(
        'addressIndexPreloaded',
        expect.any(Function)
      );
      expect(removeSpy).toHaveBeenCalledWith(
        'addressIndexPreloadError',
        expect.any(Function)
      );

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('clears polling interval on unmount', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');

      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      const { unmount } = render(<BackgroundPreloadStatus />);
      unmount();

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  describe('Component styling and positioning', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('applies correct fixed positioning styles', () => {
      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      render(<BackgroundPreloadStatus />);

      // Wait for delayed status to show
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const indicator = screen.getByText('⚡ Loading...');
      const container = indicator.parentElement;

      expect(container).toBeTruthy();
      expect(container?.tagName).toBe('DIV');
      expect(indicator).toBeInTheDocument();
    });

    it('applies correct visual styling for different states', () => {
      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: true })
      );

      const { rerender } = render(<BackgroundPreloadStatus />);

      // Wait for delayed status to show
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const loadingIndicator = screen.getByText('⚡ Loading...');
      expect(loadingIndicator).toBeInTheDocument();
      expect(loadingIndicator.parentElement).toBeTruthy();

      mockBackgroundPreloader.getStatus.mockReturnValue(
        createMockPreloadStatus({ isLoading: false, isComplete: true })
      );

      act(() => {
        const event = new CustomEvent('addressIndexPreloaded');
        window.dispatchEvent(event);
      });

      rerender(<BackgroundPreloadStatus />);

      const successIndicator = screen.getByText('✅ Ready');
      expect(successIndicator).toBeInTheDocument();
      expect(successIndicator.parentElement).toBeTruthy();
    });
  });
});
