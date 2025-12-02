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
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { ExocortexDB } from '@/lib/exocortex';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw, Database, HardDrive, Download, Upload, Trash2, ChevronUp, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { PageLayout } from '@/components/PageLayout';
import { NewUserWelcomeDialog } from '../components/NewUserWelcomeDialog';




/**
 * Index Component
 */
const Index = () => {
  // Database instance for storing and retrieving events
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [error, setError] = useState<string | null>(null);

  //So Welcome dialog can link to /about we need to navigate
  const navigate = useNavigate();

  // Welcome dialog state for new users
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

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

        // Check if any events exist in the last 7 days
        const hasEvents = days.some(day => day.events.length > 0);

        // Show welcome dialog if no events found in the last week (truly empty database)
        if (!hasEvents) {
          setShowWelcomeDialog(true);
        }
      } catch (error) {
        console.error('Failed to check database:', error);
      }
    };

    checkDatabaseEmpty();
  }, [currentView]); // Dependency on currentView

  /**
   * Generate test data for welcome dialog
   */
  const handleWelcomeGenerateTestData = async () => {
    const t = await db.generateTestData();
    setError(t);
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
      {/* New User Welcome Dialog */}
      <NewUserWelcomeDialog
        isOpen={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
        onGenerateTestData={async () => {
          await handleWelcomeGenerateTestData();
          // Trigger grid refresh
          setForceGridRefresh(prev => prev + 1);
          setShowWelcomeDialog(false);
        }}
        onAbout={() => { navigate('/about'); }}
      />

      {/* Main Content Area */}
      <ExocortexGrid skipDate={skipDate} setSkipDate={setSkipDate} db={db} className="w-full" refreshTrigger={forceGridRefresh} />
    </PageLayout>
  );
};

export default Index;
