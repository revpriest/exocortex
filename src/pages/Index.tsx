/**
 * Index.tsx - Main Application Page
 *
 * This is the main page users see when they visit the app.
 * It displays both the time tracking grid and statistics interfaces
 * with navigation to switch between them.
 *
 * In a single-page app, this is essentially our "home screen".
 */

import React, { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { StatsView } from '@/components/StatsView';
import { Button } from '@/components/ui/button';
import { Grid3X3, BarChart3, HelpCircle } from 'lucide-react';

/**
 * Index Component
 *
 * This is the main page component that:
 * 1. Sets SEO metadata for search engines and browser tabs
 * 2. Provides navigation between grid, stats, and help views
 * 3. Renders the appropriate view based on user selection
 * 4. Provides responsive layout and styling
 */
const Index = () => {
  /**
   * State Management
   *
   * currentView: Controls which interface is displayed
   * - 'grid': Shows the time tracking grid
   * - 'stats': Shows the statistics and analytics
   * - 'help': Shows the help/about information
   */
  const [currentView, setCurrentView] = useState<'grid' | 'stats' | 'help'>('grid');

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
   * Navigation Handler Functions
   *
   * These functions handle switching between the different views.
   * They update the state which triggers a re-render with the new view.
   */
  const handleGridClick = () => {
    setCurrentView('grid');
  };

  const handleStatsClick = () => {
    setCurrentView('stats');
  };

  const handleHelpClick = () => {
    setCurrentView('help');
  };

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
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Exocortex
            </h1>

            {/* View Toggle Buttons */}
            <div className="flex gap-2">
              <Button
                variant={currentView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={handleGridClick}
                className={
                  currentView === 'grid'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                }
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={currentView === 'stats' ? 'default' : 'outline'}
                size="sm"
                onClick={handleStatsClick}
                className={
                  currentView === 'stats'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                }
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button
                variant={currentView === 'help' ? 'default' : 'outline'}
                size="sm"
                onClick={handleHelpClick}
                className={
                  currentView === 'help'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                }
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {/*
          Conditionally render the grid, stats, or help view based on currentView state.
          The className="w-full" ensures the component takes full width of container.
        */}
        {currentView === 'grid' ? (
          <ExocortexGrid className="w-full" />
        ) : currentView === 'stats' ? (
          <StatsView className="w-full" />
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 md:p-8">
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                Exocortex was vibe-coded by{' '}
                <a
                  href="https://dalliance.net/"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pre
                </a>
                {' '}using{' '}
                <a
                  href="https://shakespeare.diy/"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  shakespeare
                </a>
              </p>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-yellow-400 text-base md:text-lg leading-relaxed">
                  You should probably back up with the export button often, no guarantees.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
