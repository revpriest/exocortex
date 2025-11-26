import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production and when supported
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator &&
      window.location.protocol === 'https:'
    ) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service worker registered successfully:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('🔍 New service worker found, installing...');
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New service worker installed and waiting');
              // The PWAUpdateManager component will handle showing the update notification
            }
          });
        }
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update().catch(error => {
          console.log('🔄 Service worker update check failed:', error);
        });
      }, 60 * 60 * 1000); // Check every hour

    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
    }
  };

  // This component doesn't render anything
  return null;
}