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
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { ExocortexDB } from '@/lib/exocortex';
import { PageLayout } from '@/components/PageLayout';
import { NewUserWelcomeDialog } from '../components/NewUserWelcomeDialog';

/**
 * Index Component
 */
const Index = () => {
  // Database instance for storing and retrieving events
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  //So Welcome dialog can link to /about we need to navigate
  const navigate = useNavigate();

  // Welcome dialog state for new users
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  // Force grid refresh trigger
  const [forceGridRefresh, setForceGridRefresh] = useState(0);

  // Force to generate empty days and skip to that day
  const [skipDate, setSkipDate] = useState<Date | null>(null);
  // Track whether we already applied an initial skip-from-query to
  // avoid re-applying or conflicting with grid internal state.
  const [hasAppliedInitialSkip, setHasAppliedInitialSkip] = useState(false);

  // React Router hooks for URL-based navigation
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const initAll = async () => {
      console.log('[Index] Initialising DB for grid page');
      try {
        const database = new ExocortexDB();
        await database.init();
        console.log('[Index] DB initialised');
        setDb(database);
        setDbError(null);

        // If we already saw a ?date= param before DB was ready, ensure
        // ExocortexGrid sees the skipDate value after it mounts.
        if (hasAppliedInitialSkip && skipDate) {
          console.log('[Index] Applying previously captured skipDate to grid after DB init', skipDate.toISOString());
        }
      } catch (error) {
        console.error('Failed to initialize database on main page:', error);
        const message = error instanceof Error ? error.message : 'Unknown database error.';
        setDb(null);
        setDbError(message);
      }
    };

    void initAll();
  }, [hasAppliedInitialSkip, skipDate]); // re-run if we captured a skip before DB init

  // Initialise skipDate from ?date=YYYY-MM-DD when first loading
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam) return;

    const parsed = new Date(`${dateParam}T00:00:00`);
    console.log('[Index] Found ?date param', dateParam, 'parsed to', parsed.toISOString());
    if (!Number.isNaN(parsed.getTime())) {
      setSkipDate(parsed);
      setHasAppliedInitialSkip(true);

      // Clear the date param so subsequent navigations don't re-apply it
      const params = new URLSearchParams(searchParams);
      params.delete('date');
      console.log('[Index] Clearing ?date param after applying skip');
      setSearchParams(params, { replace: true });
    } else {
      console.warn('[Index] Invalid ?date param, ignoring:', dateParam);
    }
  }, [searchParams, setSearchParams]);

  /**
   * Get current view from URL query parameter
   * Defaults to 'grid' if no view parameter is provided
   */
  const getCurrentView = (): 'grid' | 'stats' | 'conf' => {
    const view = searchParams.get('view');
    return view === 'stats' || view === 'conf' ? view : 'grid';
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
    const checkDatabaseEmpty = async () => {
      try {
        const database = new ExocortexDB();
        await database.init();

        const hasEvents = await database.eventsExist();

        // Show welcome dialog if no events found in the last week (truly empty database)
        if (!hasEvents) {
          setShowWelcomeDialog(true);
        }
      } catch (error) {
        console.error('Failed to check database:', error);
      }
    };

    void checkDatabaseEmpty();
  }, [currentView]); // Dependency on currentView

  /**
   * Generate test data for welcome dialog
   */
  const handleWelcomeGenerateTestData = async () => {
    if (db != null) {
      await db.generateTestData();
      setDbError(null);
    } else {
      setDbError('Database is not available.');
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
    <PageLayout
      setSkipDate={setSkipDate}
      triggerRefresh={setForceGridRefresh}
      currentView={currentView}
      db={db}
      title="Time Grid"
      explain="Jump to today"
    >
      {/* New User Welcome Dialog */}
      <NewUserWelcomeDialog
        isOpen={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
        onGenerateTestData={async () => {
          await handleWelcomeGenerateTestData();
          // Trigger grid refresh
          setForceGridRefresh((prev) => prev + 1);
          setShowWelcomeDialog(false);
        }}
        onAbout={() => {
          navigate('/about');
        }}
      />

      {/* Main Content Area */}
      <ExocortexGrid
        skipDate={skipDate}
        db={db}
        dbError={dbError}
        className="w-full"
        refreshTrigger={forceGridRefresh}
        setRefreshTrigger={setForceGridRefresh}
      />
    </PageLayout>
  );
};

export default Index;
