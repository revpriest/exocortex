/**
 * Cache Reset Utility
 * 
 * Provides functionality to clear all browser caches and service worker caches
 * while preserving IndexedDB data. Used for PWA cache management.
 */

/**
 * Resets all application caches and reloads the app
 * - Clears all browser caches
 * - Unregisters service workers
 * - Preserves IndexedDB data
 * - Reloads the app from network
 */
export async function resetCacheAndReload(): Promise<void> {
  try {
    console.log('🗑️ Starting cache reset...');
    
    // 1. Clear all browser caches
    await clearAllCaches();
    console.log('✅ Browser caches cleared');
    
    // 2. Unregister service workers
    await unregisterServiceWorkers();
    console.log('✅ Service workers unregistered');
    
    // 3. Reload the page from network (bypassing cache)
    console.log('🔄 Reloading app from network...');
    window.location.href = window.location.origin + '?t=' + Date.now();
    
  } catch (error) {
    console.error('❌ Cache reset failed:', error);
    
    // Fallback: just reload the page with cache busting
    window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
  }
}

/**
 * Clears all browser caches
 */
async function clearAllCaches(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  }
}

/**
 * Unregisters all service workers
 */
async function unregisterServiceWorkers(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(registration => registration.unregister())
    );
  }
}

/**
 * Check if there are active service workers
 */
export async function hasActiveServiceWorkers(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  }
  return false;
}

/**
 * Check if there are cached assets
 */
export async function hasCachedAssets(): Promise<boolean> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    return cacheNames.length > 0;
  }
  return false;
}
