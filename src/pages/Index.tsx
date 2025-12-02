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
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { ExocortexDB } from '@/lib/exocortex';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw, Database, HardDrive, Download, Upload, Trash2, ChevronUp, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { resetCacheAndReload, hasActiveServiceWorkers, hasCachedAssets } from '@/lib/cacheReset';
import { PageLayout } from '@/components/PageLayout';
import { DataExporter } from '@/lib/dataExport';
import { NewUserWelcomeDialog } from '../components/NewUserWelcomeDialog';




/**
 * Index Component
 *
 * This is the main page component that:
 * 1. Sets SEO metadata for search engines and browser tabs
 * 2. Provides navigation between grid, stats, and help views
 * 3. Renders the appropriate view based on URL query parameters
 * 4. Provides responsive layout and styling
 */
const Index = () => {
  // Database instance for storing and retrieving events
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Welcome dialog state for new users
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true);

  // Force grid refresh trigger
  const [forceGridRefresh, setForceGridRefresh] = useState(0);

  // Force to generate empty days and skip to that day
  const [skipDate, setSkipDate] = useState<Date|null>(null);


  useEffect(() => {
    const initAll = async () => {
      const db = new ExocortexDB();
      await db.init();
      setDb(db);
    };

    // Execute initialization and handle any errors
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, []); // Empty dependency array means this runs only once on mount


  // React Router hooks for URL-based navigation
  const [searchParams, setSearchParams] = useSearchParams();
  /**
   * Get current view from URL query parameter
   * Defaults to 'grid' if no view parameter is provided
   */
  const getCurrentView = (): 'grid' | 'stats' | 'conf' => {
    const view = searchParams.get('view');
    return (view === 'stats' || view === 'conf') ? view : 'grid';
  };

  const currentView = getCurrentView();

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
   * Only runs on grid view, not on stats, conf, or about pages
   */
  useEffect(() => {
    // Only check for new user dialog when on grid view
    if (currentView !== 'grid') {
      setIsCheckingDatabase(false);
      return;
    }

    const checkDatabaseEmpty = async () => {
      try {
        const db = new ExocortexDB();
        await db.init();

        // Check if database has any events by querying a wider date range
        // This is more reliable than just checking today
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Check last 7 days

        const days = await db.getEventsByDateRangeOnly(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        setIsCheckingDatabase(false);

        // Check if any events exist in the last 7 days
        const hasEvents = days.some(day => day.events.length > 0);

        // Show welcome dialog if no events found in the last week (truly empty database)
        if (!hasEvents) {
          setShowWelcomeDialog(true);
        }
      } catch (error) {
        console.error('Failed to check database:', error);
        setIsCheckingDatabase(false);
      }
    };

    checkDatabaseEmpty();
  }, [currentView]); // Dependency on currentView

  /**
   * Generate test data for welcome dialog
   */
  const handleWelcomeGenerateTestData = async () => {
    const db = new ExocortexDB();
    await db.init();

    try {
      // Clear existing data first
      await db.clearAllEvents();

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
        await db.addEvent(event);
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
    <PageLayout setSkipDate={setSkipDate} triggerRefresh={setForceGridRefresh} currentView={currentView} db={db} title="Time Grid" explain="Jump to today">
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
            onAbout={() => {
              navigate('/about');
            }}
          />
        )}

        {/* Main Content Area */}
        <ExocortexGrid skipDate={skipDate} setSkipDate={setSkipDate} db={db} className="w-full" refreshTrigger={forceGridRefresh} />
      </div>
    </PageLayout>
  );
};

export default Index;
