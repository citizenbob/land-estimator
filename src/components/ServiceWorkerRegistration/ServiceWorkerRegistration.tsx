'use client';

import { useEffect } from 'react';
import serviceWorkerClient from '@lib/serviceWorkerClient';

/**
 * Service Worker Registration Component
 * Handles automatic registration and preloading of versioned indexes
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') {
      return;
    }

    const initServiceWorker = async () => {
      try {
        console.log('[SW Registration] Initializing service worker...');

        const registered = await serviceWorkerClient.register();

        if (registered) {
          console.log(
            '[SW Registration] Service worker registered successfully'
          );

          // Start preloading indexes in the background after a short delay
          // to avoid interfering with initial page load
          setTimeout(async () => {
            try {
              console.log('[SW Registration] Starting background preload...');
              await serviceWorkerClient.preloadVersionedIndexes();
              console.log('[SW Registration] Background preload completed');
            } catch (error) {
              console.warn(
                '[SW Registration] Background preload failed:',
                error
              );
            }
          }, 2000);
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

    // Register service worker when the page loads
    if (document.readyState === 'complete') {
      initServiceWorker();
    } else {
      window.addEventListener('load', initServiceWorker);
      return () => window.removeEventListener('load', initServiceWorker);
    }
  }, []);

  // This component doesn't render anything
  return null;
}
