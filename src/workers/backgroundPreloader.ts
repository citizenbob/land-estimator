import { loadAddressIndexProgressive } from '@services/loadAddressIndex';
import { devLog, devWarn } from '@lib/logger';

interface PreloadStatus {
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  startTime: number | null;
  endTime: number | null;
}

/**
 * Extend window interface for Fast Refresh-resistant deduplication
 */
declare global {
  interface Window {
    __addressIndexPreloadStarted?: boolean;
  }
}

class BackgroundPreloader {
  private static instance: BackgroundPreloader | null = null;

  private status: PreloadStatus = {
    isLoading: false,
    isComplete: false,
    error: null,
    startTime: null,
    endTime: null
  };

  static getInstance(): BackgroundPreloader {
    if (!BackgroundPreloader.instance) {
      BackgroundPreloader.instance = new BackgroundPreloader();
    }
    return BackgroundPreloader.instance;
  }

  async start(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    // Use window property for Fast Refresh-resistant deduplication
    if (window.__addressIndexPreloadStarted) {
      devLog(
        '🔄 [Background Preloader] Already started elsewhere, skipping...'
      );
      return;
    }

    if (this.status.isLoading || this.status.isComplete) {
      return;
    }

    window.__addressIndexPreloadStarted = true;

    this.status.isLoading = true;
    this.status.startTime = Date.now();
    this.status.error = null;

    // Small delay to let server warmup complete first (skip in tests)
    if (process.env.NODE_ENV !== 'test') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    devLog(
      '🚀 [Background Preloader] Starting aggressive address index preload...'
    );

    try {
      await loadAddressIndexProgressive();

      this.status.isComplete = true;
      this.status.endTime = Date.now();
      const duration =
        (this.status.endTime ?? 0) - (this.status.startTime ?? 0);

      devLog(
        `✅ [Background Preloader] Address index preloaded in ${duration}ms`
      );

      window.dispatchEvent(
        new CustomEvent('addressIndexPreloaded', {
          detail: { duration }
        })
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? (error as Error).message : String(error);
      this.status.error = errorMessage;
      this.status.endTime = Date.now();

      devWarn('⚠️ [Background Preloader] Preload failed:', this.status.error);

      window.dispatchEvent(
        new CustomEvent('addressIndexPreloadError', {
          detail: { error: this.status.error }
        })
      );
    } finally {
      this.status.isLoading = false;
    }
  }

  getStatus(): PreloadStatus {
    return { ...this.status };
  }

  reset(): void {
    this.status = {
      isLoading: false,
      isComplete: false,
      error: null,
      startTime: null,
      endTime: null
    };

    // Reset the global flag so start() can be called again
    if (typeof window !== 'undefined') {
      window.__addressIndexPreloadStarted = false;
    }
  }

  isDataReady(): boolean {
    return this.status.isComplete && !this.status.error;
  }
}

const backgroundPreloader = BackgroundPreloader.getInstance();

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => backgroundPreloader.start(), 100);
    });
  } else {
    setTimeout(() => backgroundPreloader.start(), 100);
  }
}

export default backgroundPreloader;
export { BackgroundPreloader };
export type { PreloadStatus };
