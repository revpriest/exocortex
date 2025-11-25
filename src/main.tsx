import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// FIXME: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

// PWA Install Prompt Handler
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  console.log('PWA install prompt available');
});

window.addEventListener('appinstalled', () => {
  // Log install to analytics
  console.log('PWA was installed');
  // Clear the deferredPrompt
  deferredPrompt = null;
});

// Make the deferredPrompt available globally for the install button
(window as any).deferredPrompt = deferredPrompt;

// Register service worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
