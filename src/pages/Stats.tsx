/**
 * Stats.tsx - Stats Page
 *
 * Provide stats details about the database between
 * two selected dates. 
 */
import React, { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB } from '@/lib/exocortex';
import { StatsView } from '@/components/StatsView';

const Stats = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);

  //Include the DB so header add-event can work.
  useEffect(() => {
    const initAll = async () => {
      const db = new ExocortexDB();
      await db.init();
      setDb(db);
    };
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  // Set SEO metadata
  useSeoMeta({
    title: 'Stats - ExocortexLog',
    description: 'Track progress between dates on your personal time-tracking app',
  });

  return (
    <PageLayout db={db} title="Stats" explain="Stats" currentView="stats">
      <StatsView />
    </PageLayout>
  );
};

export default Stats;

