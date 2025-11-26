/**
 * Index.tsx - Main Application Page
 *
 * This is the main page users see when they visit the app.
 * It displays both the time tracking grid and statistics interfaces
 * with navigation to switch between them.
 *
 * In a single-page app, this is essentially our "home screen".
 */

import React, { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { StatsView } from '@/components/StatsView';
import { ColorOverrideWidget } from '@/components/ColorOverrideWidget';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw, Database, HardDrive } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { resetCacheAndReload, hasActiveServiceWorkers, hasCachedAssets } from '@/lib/cacheReset';
import { APP_VERSION } from '../main';

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
 * Cache Reset Section Component
 *
 * Provides cache management functionality including clearing browser caches
 * and service worker caches while preserving IndexedDB data.
 */
const CacheResetSection = () => {
  const [hasServiceWorker, setHasServiceWorker] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Check cache and service worker status on mount
  useEffect(() => {
    const checkCacheStatus = async () => {
      try {
        const [swStatus, cacheStatus] = await Promise.all([
          hasActiveServiceWorkers(),
          hasCachedAssets()
        ]);
        setHasServiceWorker(swStatus);
        setHasCache(cacheStatus);
      } catch (error) {
        console.error('Failed to check cache status:', error);
      }
    };

    checkCacheStatus();
  }, []);

  const handleResetCache = async () => {
    setIsResetting(true);
    try {
      await resetCacheAndReload();
    } catch (error) {
      console.error('Cache reset failed:', error);
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Cache Management
        </CardTitle>
        <CardDescription>
          Manage application caches and service workers to troubleshoot update issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">IndexedDB:</span>
            <span className="text-green-600 font-medium">Preserved</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Service Worker:</span>
            <span className={hasServiceWorker ? "text-blue-600 font-medium" : "text-gray-500"}>
              {hasServiceWorker ? "Active" : "Not Active"}
            </span>
          </div>
        </div>

        {hasCache && (
          <div className="text-sm text-muted-foreground">
            Cached assets detected. Use reset below if you're experiencing update issues.
          </div>
        )}

        {/* Reset Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isResetting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting...' : 'Reset Cache & Reload'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Application Cache?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all browser caches and service workers, then reload the app from the network.
                Your time tracking data in IndexedDB will be preserved.
                <br /><br />
                Use this if the app isn't updating properly or if you're experiencing display issues.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetCache} disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Reset Cache'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> This action is safe and won't delete your tracked events.</p>
          <p>Only the application cache and service workers will be cleared.</p>
        </div>
      </CardContent>
    </Card>
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
          <div className="space-y-6">
            {/* Theme Settings Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <ThemeSwitch />
                </div>
              </CardContent>
            </Card>

            {/* Category Color Overrides Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category Colors</CardTitle>
                <CardDescription>
                  Customize colors for different event categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorOverrideWidget />
              </CardContent>
            </Card>

            {/* Cache Management Section */}
            <CacheResetSection />

            {/* About Content */}
            <Card>
              <CardContent className="pt-6">
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

                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-muted-foreground text-sm">
                      Version: {APP_VERSION}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
