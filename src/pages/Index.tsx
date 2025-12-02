/**
 * Index.tsx - Main Application Page
 * ... [rest omitted for brevity]
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { ExocortexDB } from '@/lib/exocortex';
import { PageLayout } from '@/components/PageLayout';
import { NewUserWelcomeDialog } from '../components/NewUserWelcomeDialog';

const Index = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [forceGridRefresh, setForceGridRefresh] = useState(0);
  const [skipDate, setSkipDate] = useState<Date|null>(null);
  useEffect(() => {
    const initAll = async () => {
      const db = new ExocortexDB();
      await db.init();
      setDb(db);
    };
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, []);
  const [searchParams] = useSearchParams();
  const getCurrentView = (): 'grid' | 'stats' | 'conf' => {
    const view = searchParams.get('view');
    return (view === 'stats' || view === 'conf') ? view : 'grid';
  };
  const currentView = getCurrentView();
  useSeoMeta({
    title: 'ExocortexLog - Time Tracking',
    description: 'A visual time tracking app that displays your daily events in a colorful grid pattern.',
  });
  useEffect(() => {
    const checkDatabaseEmpty = async () => {
      try {
        const db = new ExocortexDB();
        await db.init();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const days = await db.getEventsByDateRangeOnly(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        const hasEvents = days.some(day => day.events.length > 0);
        if (!hasEvents) {
          setShowWelcomeDialog(true);
        }
      } catch (error) {
        console.error('Failed to check database:', error);
      }
    };
    checkDatabaseEmpty();
  }, [currentView]);

  const handleWelcomeGenerateTestData = async () => {
    const t = await db?.generateTestData();
    setError(t);
  };

  return (
    <PageLayout
      setSkipDate={setSkipDate}
      triggerRefresh={setForceGridRefresh}
      currentView={currentView}
      db={db}
      title="Time Grid"
      explain="Jump to today"
    >
      <NewUserWelcomeDialog
        isOpen={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
        onGenerateTestData={async () => {
          await handleWelcomeGenerateTestData();
          setForceGridRefresh(prev => prev + 1);
          setShowWelcomeDialog(false);
        }}
        onAbout={() => { navigate('/about'); }}
      />
      {/* Only show the grid if db exists */}
      {db ? (
        <ExocortexGrid skipDate={skipDate} setSkipDate={setSkipDate} db={db} className="w-full" refreshTrigger={forceGridRefresh} />
      ) : (
        <div className="flex items-center justify-center h-64 w-full text-lg text-muted-foreground">Loading...</div>
      )}
    </PageLayout>
  );
};

export default Index;
