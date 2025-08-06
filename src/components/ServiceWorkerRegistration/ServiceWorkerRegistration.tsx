'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * Handles service worker registration and background preloading
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        console.log('[SW Registration] Initializing service worker...');

        const { default: serviceWorkerClient } = await import(
          '@workers/serviceWorkerClient'
        );

        const registration = await serviceWorkerClient.register();

        if (registration) {
          console.log(
            '[SW Registration] Service worker registered successfully'
          );

          setTimeout(async () => {
            try {
              console.log(
                '[SW Registration] Starting static file cache warmup...'
              );
              await serviceWorkerClient.preloadStaticFiles();
              console.log('[SW Registration] Static files cached successfully');
              console.log('[SW Registration] Cache warmup completed');
            } catch (preloadError) {
              console.warn(
                '[SW Registration] Cache warmup failed:',
                preloadError
              );
            }
          }, 1000);
        } else {
          console.log(
            '[SW Registration] Service worker registration failed or not supported'
          );
        }
      } catch (error) {
        console.error(
          '[SW Registration] Service worker initialization failed:',
          error
        );
      }
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      const handleLoad = () => {
        registerServiceWorker();
        window.removeEventListener('load', handleLoad);
      };
      window.addEventListener('load', handleLoad);

      return () => {
        window.removeEventListener('load', handleLoad);
      };
    }
  }, []);

  return null;
}
