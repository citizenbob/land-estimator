/**
 * Background Preload Status Component
 * Shows a subtle indicator when background preloading is in progress or complete
 */

'use client';

import React, { useState, useEffect } from 'react';
import backgroundPreloader from '@workers/backgroundPreloader';

export default function BackgroundPreloadStatus() {
  const [status, setStatus] = useState(backgroundPreloader.getStatus());
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handlePreloaded = () => {
      console.log('🎯 Address index preloaded, search will be instant');
      setStatus(backgroundPreloader.getStatus());

      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handlePreloadError = () => {
      console.warn('Preload failed, first search may be slower');
      setStatus(backgroundPreloader.getStatus());
    };

    window.addEventListener(
      'addressIndexPreloaded',
      handlePreloaded as EventListener
    );
    window.addEventListener(
      'addressIndexPreloadError',
      handlePreloadError as EventListener
    );

    const initialStatus = backgroundPreloader.getStatus();
    if (initialStatus.isLoading) {
      setShowStatus(true);
    }

    const interval = setInterval(() => {
      const currentStatus = backgroundPreloader.getStatus();
      setStatus(currentStatus);

      if (!currentStatus.isLoading && showStatus) {
        setShowStatus(false);
      }
    }, 500);

    return () => {
      window.removeEventListener(
        'addressIndexPreloaded',
        handlePreloaded as EventListener
      );
      window.removeEventListener(
        'addressIndexPreloadError',
        handlePreloadError as EventListener
      );
      clearInterval(interval);
    };
  }, [showStatus]);

  if (process.env.NODE_ENV !== 'development' || !showStatus) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: status.isComplete
          ? '#10b981'
          : status.error
            ? '#ef4444'
            : '#3b82f6',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        opacity: 0.9,
        transition: 'all 0.3s ease'
      }}
    >
      {status.isLoading && '🚀 Preloading...'}
      {status.isComplete && !status.error && '✅ Ready'}
      {status.error && '⚠️ Error'}
    </div>
  );
}
