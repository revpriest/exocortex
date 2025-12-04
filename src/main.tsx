/**
 * main.tsx - Application Entry Point
 *
 * This is the first file that runs when your app starts in the browser.
 * It sets up the React application and renders it to the DOM.
 */

import { createRoot } from 'react-dom/client';

// Import polyfills first - these add missing browser features for older browsers
import './lib/polyfills.ts';

// Import our main App component and error boundary
import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';

// Import global CSS styles for the entire application
import './index.css';

// NOTE: You could add custom fonts here if needed
// Example: import '@fontsource-variable/inter';

/**
 * Application Version
 *
 * This constant represents the current version of ExocortexLog.
 * Update this value when releasing new versions.
 */
export const APP_VERSION = '0.1.4';

/**
 * Service Worker Registration
 *
 * Service workers enable offline functionality and faster load times.
 * They run in the background and can cache assets for offline use.
 */
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Wait for the page to fully load before registering
  window.addEventListener('load', () => {
    console.log('Attempting to register service worker...');

    // Register the service worker file (sw.js in public folder)
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ ServiceWorker registration successful with scope: ', registration.scope);
        console.log('ServiceWorker state:', registration.installing ? 'installing' : 'installed');

        // Periodically check for service worker updates (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.log('❌ ServiceWorker registration failed: ', error);
      });
  });
} else if (typeof window !== 'undefined') {
  console.log('⚠️ Service workers are not supported in this browser');
}

/**
 * Create and Mount React App
 *
 * This is where React takes control of the webpage:
 * 1. Find the HTML element with id="root" (defined in index.html)
 * 2. Create a React "root" there
 * 3. Render our App component inside an ErrorBoundary
 *
 * The ErrorBoundary catches any errors in the app and shows a nice error message
 * instead of crashing the entire page.
 */
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }
}
