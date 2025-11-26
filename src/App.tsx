/**
 * App.tsx - Main Application Component
 *
 * This is the root component of our React application.
 * It sets up all the global providers and context that the entire app needs.
 *
 * Think of this as the "main controller" that provides services to all components.
 */

// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';

// Import UI providers and components
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';

/**
 * Head Configuration for SEO
 *
 * This sets up the HTML head section (title, meta tags, etc.)
 * The InferSeoMetaPlugin automatically generates appropriate SEO meta tags
 */
const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

/**
 * React Query Client Configuration
 *
 * React Query is a data fetching and state management library.
 * It handles caching, background updates, and stale data management.
 *
 * Configuration:
 * - refetchOnWindowFocus: false = Don't re-fetch data when user clicks back to browser tab
 * - staleTime: 60000 = Data is considered fresh for 1 minute
 * - gcTime: Infinity = Keep cached data forever (until manually invalidated)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

/**
 * Default App Configuration
 *
 * This defines the initial settings for our app.
 * Currently we have theme and color overrides, but you could add more settings here.
 */
const defaultConfig: AppConfig = {
  theme: "dark",
  colorOverrides: [],
};

/**
 * Main App Component
 *
 * This component wraps our entire application with necessary providers:
 *
 * Provider Stack (from outside to inside):
 * 1. UnheadProvider - Manages HTML head (SEO, titles, meta tags)
 * 2. AppProvider - Provides global app settings (theme, user preferences)
 * 3. QueryClientProvider - Provides data fetching and caching (React Query)
 * 4. TooltipProvider - Enables tooltip functionality for UI components
 * 5. Suspense - Shows fallback UI while components are loading
 * 6. Toaster - Renders notification messages (success, error, info)
 * 7. AppRouter - Handles page routing and displays the correct page
 */
export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="exocortexlog:app-config" defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Suspense>
              <AppRouter />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
