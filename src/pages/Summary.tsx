/**
 * Summary.tsx - Summary Page
 *
 * Provide summary of recent events, especially 
 * those with notes
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Heart, Brain, Play, Database as DatabaseIcon, Grid3X3, BarChart3, Settings, Database, Bell, Moon, Volume2 } from 'lucide-react';
import { usePageData } from '@/hooks/usePageData';
import { ExocortexDB } from '@/lib/exocortex';

const Summary = () => {
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
    title: 'Summary - ExocortexLog',
    description: 'View summary of recent notable events',
  });

  return (
    <PageLayout db={db} title="Summary" explain="Summary" currentView="summary">

    </PageLayout>
  );
};

export default Summary;

