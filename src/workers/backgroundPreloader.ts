import { loadAddressIndex } from '@services/loadAddressIndex';

interface PreloadStatus {
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  startTime: number | null;
  endTime: number | null;
}

class BackgroundPreloader {
  private status: PreloadStatus = {
    isLoading: false,
    isComplete: false,
    error: null,
    startTime: null,
    endTime: null
  };

  async start(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.status.isLoading || this.status.isComplete) {
      return;
    }

    this.status.isLoading = true;
    this.status.startTime = Date.now();
    this.status.error = null;

    console.log(
      '🚀 [Background Preloader] Starting aggressive address index preload...'
    );

    try {
      await loadAddressIndex();

      this.status.isComplete = true;
      this.status.endTime = Date.now();
      const duration = this.status.endTime - this.status.startTime!;

      console.log(
        `✅ [Background Preloader] Address index preloaded in ${duration}ms`
      );

      window.dispatchEvent(
        new CustomEvent('addressIndexPreloaded', {
          detail: { duration }
        })
      );
    } catch (error) {
      this.status.error =
        error instanceof Error ? error.message : String(error);
      this.status.endTime = Date.now();

      console.warn(
        '⚠️ [Background Preloader] Preload failed:',
        this.status.error
      );

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
  }

  isDataReady(): boolean {
    return this.status.isComplete && !this.status.error;
  }
}

const backgroundPreloader = new BackgroundPreloader();

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
