/**
 * Stats.tsx - Stats Page
 *
 * Provide stats details about the database between
 * two selected dates. 
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB } from '@/lib/exocortex';
import { StatsView } from '@/components/StatsView';

const Stats = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [searchParams] = useSearchParams();

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

  const startParam = searchParams.get('start');
  const daysParam = searchParams.get('days');

  const initialStart = startParam ? new Date(`${startParam}T00:00:00`) : undefined;

  const allowedWindows = [1, 2, 3, 4, 5, 6, 7, 14, 28] as const;
  type NumericWindowOption = (typeof allowedWindows)[number];

  let initialWindow: NumericWindowOption | 'month' | undefined;
  if (daysParam === 'month') {
    initialWindow = 'month';
  } else if (daysParam) {
    const num = Number(daysParam);
    if (allowedWindows.includes(num as NumericWindowOption)) {
      initialWindow = num as NumericWindowOption;
    }
  }

  return (
    <PageLayout db={db} title="Stats" explain="Stats" currentView="stats">
      <StatsView
        initialStart={initialStart}
        initialWindow={initialWindow}
      />
    </PageLayout>
  );
};

export default Stats;
