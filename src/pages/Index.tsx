/**
 * Index.tsx - Main Application Page
 *
 * This is the main page users see when they visit the app.
 * It displays the time tracking grid, statistics interface, and configuration
 * with navigation to switch between them.
 *
 * In a single-page app, this is essentially our "home screen".
 */

import React, { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { StatsView } from '@/components/StatsView';
import { ColorOverrideWidget } from '@/components/ColorOverrideWidget';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useBuildInfo } from '@/hooks/useBuildInfo';
import { useCacheRefresh } from '@/hooks/useCacheRefresh';

/**
 * Theme Switch Component
 *
 * A toggle switch that allows users to switch between dark and light themes.
 * It uses the existing theme system and persists the preference in localStorage.
 */
const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();

  const isDarkMode = theme === 'dark' || (theme === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleToggle = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center space-x-3">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={isDarkMode}
        onCheckedChange={handleToggle}
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
};

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
  const { refreshApp, isRefreshing } = useCacheRefresh();

  /**
   * State Management
   *
   * currentView: Controls which interface is displayed
   * - 'grid': Shows the time tracking grid
   * - 'stats': Shows the statistics and analytics
   * - 'conf': Shows the configuration and about information
   */
  const [currentView, setCurrentView] = useState<'grid' | 'stats' | 'conf'>('grid');

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
    title: 'ExocortexLog - Time Tracking',
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

  const handleConfClick = () => {
    setCurrentView('conf');
  };

  /**
   * Page Layout Structure
   *
   * We use Tailwind CSS classes for responsive design:
   * - min-h-screen: Ensures page fills full viewport height
   * - bg-background: Theme-aware background color (changes with dark/light mode)
   * - p-2 md:p-4: Small padding on mobile, larger on desktop
   * - pb-16 md:pb-20: Extra bottom padding to avoid floating add button overlap
   * - max-w-7xl mx-auto: Center content and limit max width for readability
   */


  // Component for build information section
  const BuildInfoSection = () => {
    const buildInfo = useBuildInfo();

    if (!buildInfo) {
      return (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Loading build information...
          </p>
        </div>
      );
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Build:</span>
            <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
              {buildInfo.buildHash}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span>Built:</span>
            <span>{formatDate(buildInfo.buildDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Version:</span>
            <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
              {buildInfo.version.slice(-8)}
            </code>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-4 pb-16 md:pb-20">
      {/*
        Container with max width keeps content readable on large screens
        and centers it horizontally with mx-auto (margin-left: auto; margin-right: auto)
      */}
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              ExocortexLog
            </h1>

            {/* View Toggle Buttons */}
            <div className="flex gap-2">
              <Button
                variant={currentView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={handleGridClick}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={currentView === 'stats' ? 'default' : 'outline'}
                size="sm"
                onClick={handleStatsClick}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button
                variant={currentView === 'conf' ? 'default' : 'outline'}
                size="sm"
                onClick={handleConfClick}
              >
                <Settings className="h-4 w-4 mr-2" />
                Conf
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
          <div className="bg-card rounded-lg p-6 md:p-8 border">
            {/* Theme Settings Section */}
            <div className="mb-8 pb-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <ThemeSwitch />
              </div>
            </div>

            {/* Category Color Overrides Section */}
            <div className="mb-8 pb-6 border-b border-border">
              <ColorOverrideWidget />
            </div>

            {/* About Content */}
            <div className="prose max-w-none">
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                ExocortexLog was vibe-coded by{' '}
                <a
                  href="https://dalliance.net/"
                  className="text-primary hover:text-primary/80 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pre
                </a>
                {' '}using{' '}
                <a
                  href="https://shakespeare.diy/"
                  className="text-primary hover:text-primary/80 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  shakespeare
                </a>
              </p>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-destructive text-base md:text-lg leading-relaxed">
                  You should probably back up with the export button often, no guarantees.
                </p>
              </div>

              {/* Cache Refresh Button */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Force Refresh App
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshApp}
                    disabled={isRefreshing}
                    className="text-xs"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clears all caches and reloads app without losing data. Use if app isn't updating.
                </p>
              </div>

              {/* Build Information */}
              <BuildInfoSection />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
