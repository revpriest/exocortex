/**
 * Index.tsx - Main Application Page
 *
 * This is the main page users see when they visit the app.
 * It displays both the time tracking grid and statistics interfaces
 * with navigation to switch between them.
 *
 * In a single-page app, this is essentially our "home screen".
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { StatsView } from '@/components/StatsView';
import { ColorOverrideWidget } from '@/components/ColorOverrideWidget';
import { ExocortexDB } from '@/lib/exocortex';
import { DataExporter } from '@/lib/dataExport';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw, Database, HardDrive, Download, Upload, Trash2, ChevronUp, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { resetCacheAndReload, hasActiveServiceWorkers, hasCachedAssets } from '@/lib/cacheReset';
import { APP_VERSION } from '../main';

/**
 * New User Welcome Dialog Component
 *
 * Shows a welcome dialog for first-time users when the database is empty.
 * Offers to generate sample data to help them understand the app.
 */
const NewUserWelcomeDialog = ({ isOpen, onClose, onGenerateTestData }: {
  isOpen: boolean;
  onClose: () => void;
  onGenerateTestData: () => void;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    await onGenerateTestData();
    setIsGenerating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg">Welcome to ExocortexLog!</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-base text-foreground">
            New user? Would you like some random test data to explore the app?
          </p>
          <p className="text-sm text-muted-foreground">
            The test data can be deleted in the conf screen.
          </p>
        </div>
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="bg-secondary border-border"
          >
            No
          </Button>
          <Button
            onClick={handleGenerateTest}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {isGenerating ? 'Generating...' : 'Yes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
          Clear caches and update to latest version.
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
      </CardContent>
    </Card>
  );
};

/**
 * Database Management Section Component
 *
 * Provides database operations including import, export, test data generation,
 * and database clearing functionality.
 */
const DBManagementSection = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTestConfirm, setShowTestConfirm] = useState(false);

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);
    };

    initDb().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, []);

  const handleExport = async () => {
    if (!db) return;

    try {
      await DataExporter.exportDatabase(db);
      setError('Export completed! Check your downloads folder for the JSON file.');
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export database. Please try again.');
    }
  };

  const handleImportDatabase = async () => {
    if (!db) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const isValid = await DataExporter.validateExportFile(file);
        if (!isValid) {
          setError('Invalid export file. Please select a valid ExocortexLog export file.');
          return;
        }

        await DataExporter.importDatabase(db, file);
        setError(`Successfully imported events from ${file.name}`);
        setTimeout(() => setError(null), 3000);
      } catch (error) {
        console.error('Import failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to import database. Please try again.');
      }
    };

    input.click();
  };

  const handleImportLegacyDatabase = () => {
    if (!db) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await DataExporter.importLegacyDatabase(db, file);
        setError('Legacy data imported successfully. Categories from multiple tags have been combined.');
        setTimeout(() => setError(null), 5000);
      } catch (error) {
        console.error('Failed to import legacy data:', error);
        setError(`Legacy import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const generateCategoryNotes = (category: string): string => {
    const notesByCategory: Record<string, string[]> = {
      'Work': [
        'Productive morning session',
        'Good meetings with the team',
        'Made good progress on the project',
        'Challenging but rewarding work',
        'Focus was high today'
      ],
      'Exercise': [
        'Great workout! Feeling energized',
        'Pushed myself harder than usual',
        'Nice and relaxing session',
        'Cardio felt good today',
        'Strength training was productive'
      ],
      'Meal': [
        'Delicious and satisfying',
        'Healthy choice, feeling good',
        'Quick bite between tasks',
        'Enjoyed this meal',
        'Felt nourished and ready'
      ],
      'Break': [
        'Needed this rest',
        'Quick recharge session',
        'Nice coffee break',
        'Mindful moment of peace',
        'Good time to reflect'
      ],
      'Study': [
        'Learned something new',
        'Deep focus achieved',
        'Interesting material today',
        'Productive study session',
        'Challenging concepts clicked'
      ],
      'Slack': [
        'Good conversation with colleagues',
        'Team discussion was helpful',
        'Quick catch-up with friends',
        'Interesting threads today',
        'Social time well spent'
      ]
    };

    const categoryNotes = notesByCategory[category] || [
      'Interesting activity',
      'Good use of time',
      'Felt productive',
      'Nice moment today',
      'Time well spent'
    ];

    return categoryNotes[Math.floor(Math.random() * categoryNotes.length)];
  };

  const handleGenerateTestData = async () => {
    if (!db) return;

    try {
      await db.clearAllEvents();

      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const events: Omit<any, 'id'>[] = [];

      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayEvents: Omit<any, 'id'>[] = [];

        const sleepStartHour = 20 + Math.floor(Math.random() * 3);
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random();

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (sleepEnd >= today) {
          const maxDuration = today.getTime() - sleepStart.getTime();
          const adjustedDurationHours = Math.max(6, (maxDuration / (60 * 60 * 1000)) - 0.5);
          sleepEnd = new Date(sleepStart.getTime() + adjustedDurationHours * 60 * 60 * 1000);
        }

        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          notes: Math.random() > 0.7 ? [
            'Had some interesting dreams',
            'Woke up feeling refreshed',
            'Slept through the night',
            'A bit restless but okay',
            'Deep sleep cycle felt good'
          ][Math.floor(Math.random() * 5)] : undefined,
          happiness: 0.8,
          wakefulness: Math.random() * 0.02,
          health: 0.9,
        };

        dayEvents.push(sleepEvent);

        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0);

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();
          if (timeUntilSleep < 30 * 60 * 1000) break;

          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];
          const happiness = Math.random() * 0.4 + 0.5;
          const wakefulness = Math.random() * 0.4 + 0.5;
          const health = Math.random() * 0.3 + 0.6;

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            notes: Math.random() > 0.6 ? generateCategoryNotes(category) : undefined,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);
          currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000);
        }

        events.push(...dayEvents);
      }

      for (const event of events) {
        await db.addEvent(event);
      }

      setError(`Successfully generated ${events.length} test events for the past 30 days with realistic sleep patterns`);
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Failed to generate test data:', error);
      setError('Failed to generate test data. Please try again.');
    }
  };

  const confirmGenerateTestData = async () => {
    await handleGenerateTestData();
    setShowTestConfirm(false);
  };

  const cancelGenerateTestData = () => {
    setShowTestConfirm(false);
  };

  const handleClearAllData = async () => {
    if (!db) return;

    try {
      await db.clearAllEvents();
      setError('All data has been cleared successfully');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      setError('Failed to clear data. Please try again.');
    }
  };

  const confirmClearAllData = () => {
    handleClearAllData();
    setShowClearConfirm(false);
  };

  const cancelClearAllData = () => {
    setShowClearConfirm(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Management
        </CardTitle>
        <CardDescription>
          Import, export, and manage your time tracking data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!db}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleImportDatabase}
            disabled={!db}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleImportLegacyDatabase}
            disabled={!db}
            className="w-full bg-orange-600/20 border-orange-600 text-orange-400 hover:bg-orange-600/30"
          >
            <Upload className="h-4 w-4 mr-2" />
            Legacy
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTestConfirm(true)}
            disabled={!db}
            className="w-full"
          >
            <Database className="h-4 w-4 mr-2" />
            Test Data
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowClearConfirm(true)}
            disabled={!db}
            className="w-full bg-destructive border-destructive text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className={`px-3 py-2 rounded-md text-sm ${
            error.includes('Successfully')
              ? 'bg-green-900/20 border border-green-600 text-green-400'
              : 'bg-red-900/20 border border-red-600 text-red-400'
          }`}>
            {error}
          </div>
        )}
      </CardContent>

      {/* Clear Database Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Delete Entire Database</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will delete the entire database. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelClearAllData}
              className="bg-secondary border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearAllData}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Test Data Confirmation Dialog */}
      <Dialog open={showTestConfirm} onOpenChange={setShowTestConfirm}>
        <DialogContent className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Generate Test Data</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will create 30 days of random test data with various activities and diary notes. This will replace any existing data.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelGenerateTestData}
              className="bg-secondary border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmGenerateTestData}
              className="bg-primary hover:bg-primary/90"
            >
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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

  // Welcome dialog state for new users
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true);

  // Force grid refresh trigger
  const [forceGridRefresh, setForceGridRefresh] = useState(0);

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
   * Check for empty database and show welcome dialog for new users
   */
  useEffect(() => {
    const checkDatabaseEmpty = async () => {
      try {
        const database = new ExocortexDB();
        await database.init();

        // Check if database has any events
        const today = new Date().toISOString().split('T')[0];
        const events = await database.getEventsByDate(today);

        setIsCheckingDatabase(false);

        // Show welcome dialog if no events found for today (likely empty database)
        if (events.length === 0) {
          // Also check a few past days to be sure
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const yesterdayEvents = await database.getEventsByDate(yesterdayStr);

          if (yesterdayEvents.length === 0) {
            setShowWelcomeDialog(true);
          }
        }
      } catch (error) {
        console.error('Failed to check database:', error);
        setIsCheckingDatabase(false);
      }
    };

    checkDatabaseEmpty();
  }, []);

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
   * Generate test data for welcome dialog
   */
  const handleWelcomeGenerateTestData = async () => {
    const database = new ExocortexDB();
    await database.init();

    try {
      // Clear existing data first
      await database.clearAllEvents();

      // Categories for test data (excluding Sleep - we'll handle that specially)
      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];

      // Generate events for the past 7 days (shorter period for new users)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago

      const events: Omit<any, 'id'>[] = [];

      // Generate events for each day
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayEvents: Omit<any, 'id'>[] = [];

        // Create sleep event that starts around 22:00 and lasts 7-8 hours
        const sleepStartHour = 20 + Math.floor(Math.random() * 3); // 20:00, 21:00, or 22:00
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random(); // 7-8 hours

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        // Sleep event with typical sleep values
        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          notes: Math.random() > 0.7 ? [
            'Had some interesting dreams',
            'Woke up feeling refreshed',
            'Slept through the night',
            'A bit restless but okay',
            'Deep sleep cycle felt good'
          ][Math.floor(Math.random() * 5)] : undefined,
          happiness: 0.8,
          wakefulness: Math.random() * 0.02,
          health: 0.9,
        };

        dayEvents.push(sleepEvent);

        // Fill the rest of the day with other activities
        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0); // Start at 7:00 AM

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();
          if (timeUntilSleep < 30 * 60 * 1000) break; // Less than 30 minutes before sleep

          // Random duration between 30 minutes and 3 hours
          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];
          const happiness = Math.random() * 0.4 + 0.5;
          const wakefulness = Math.random() * 0.4 + 0.5;
          const health = Math.random() * 0.3 + 0.6;

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            notes: Math.random() > 0.6 ? [
              'Productive session',
              'Good progress made',
              'Felt energized',
              'Nice break',
              'Interesting activity'
            ][Math.floor(Math.random() * 5)] : undefined,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);
          currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
        }

        // Add all events for this day
        events.push(...dayEvents);
      }

      // Add all events to database
      for (const event of events) {
        await database.addEvent(event);
      }
    } catch (error) {
      console.error('Failed to generate test data:', error);
    }
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
        {/* New User Welcome Dialog */}
        {!isCheckingDatabase && (
          <NewUserWelcomeDialog
            isOpen={showWelcomeDialog}
            onClose={() => setShowWelcomeDialog(false)}
            onGenerateTestData={async () => {
              await handleWelcomeGenerateTestData();
              // Trigger grid refresh
              setForceGridRefresh(prev => prev + 1);
              setShowWelcomeDialog(false);
            }}
          />
        )}
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
          <ExocortexGrid className="w-full" refreshTrigger={forceGridRefresh} />
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

            {/* Database Management Section */}
            <DBManagementSection />

            {/* About Content */}
            <Card>
              <CardContent className="pt-6">
                <div className="prose max-w-none">
                  <p className="text-destructive text-base md:text-lg leading-relaxed">
                    You should probably back up with the export button often, no guarantees.
                  </p>

                  <div className="mt-6 pt-6 border-t border-border">
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
