/**
 * Index.tsx - Main Application Page
 *
 * This is the main page users see when they visit the app.
 * It displays the time tracking grid interface.
 *
 * In a single-page app, this is essentially our "home screen".
 */

import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';

/**
 * Index Component
 *
 * This is the main page component that:
 * 1. Sets SEO metadata for search engines and browser tabs
 * 2. Renders the main time tracking grid
 * 3. Provides responsive layout and styling
 */
const Index = () => {
  /**
   * Set SEO (Search Engine Optimization) metadata
   *
   * This hook updates the HTML head section with:
   * - title: Shown in browser tab and search results
   * - description: Shown in search engine results
   *
   * The @unhead/react library handles updating the HTML document
   */
  useSeoMeta({
    title: 'Exocortex - Time Tracking',
    description: 'A visual time tracking app that displays your daily events in a colorful grid pattern.',
  });

  /**
   * Page Layout Structure
   *
   * We use Tailwind CSS classes for responsive design:
   * - min-h-screen: Ensures page fills full viewport height
   * - bg-gray-900: Dark background color
   * - p-2 md:p-4: Small padding on mobile, larger on desktop
   * - pb-16 md:pb-20: Extra bottom padding to avoid floating add button overlap
   * - max-w-7xl mx-auto: Center content and limit max width for readability
   */
  return (
    <div className="min-h-screen bg-gray-900 p-2 md:p-4 pb-16 md:pb-20">
      {/*
        Container with max width keeps content readable on large screens
        and centers it horizontally with mx-auto (margin-left: auto; margin-right: auto)
      */}
      <div className="max-w-7xl mx-auto">
        {/*
          ExocortexGrid is the main component that handles:
          - Displaying events in a grid layout
          - Managing user interactions (add, edit, delete events)
          - Handling data loading and saving
          - Infinite scroll for past days

          The className="w-full" ensures it takes full width of container.
        */}
        <ExocortexGrid className="w-full" />
      </div>
    </div>
  );
};

export default Index;
