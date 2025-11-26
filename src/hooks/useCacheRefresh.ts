/**
 * useCacheRefresh.ts - Cache Invalidation Hook
 *
 * This hook provides functionality to clear caches and reload the app
 * without losing IndexedDB data. Useful for forcing updates when
 * automatic PWA updates aren't working.
 */

import { useState } from 'react';

export function useCacheRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshApp = async () => {
    setIsRefreshing(true);

    try {
      console.log('🔄 Manual cache refresh requested');

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('🧹 All caches cleared');
      }

      // If service worker is registered, unregister it to force reload
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) {
          await registration.unregister();
          console.log('🗑️ Service worker unregistered');
        }
      }

      // Show brief loading message
      console.log('📱 Reloading application...');

      // Force reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error) {
      console.error('❌ Failed to refresh app:', error);
      setIsRefreshing(false);
      
      // Fallback: just reload the page
      window.location.reload();
    }
  };

  return {
    refreshApp,
    isRefreshing
  };
}