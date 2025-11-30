/**
 * About.tsx - About Page
 *
 * This page provides information about ExocortexLog as a life logger and memory aid,
 * along with instructions on how to use the app.
 */

import React from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { AboutContent } from '@/components/AboutContent';
import { usePageData } from '@/hooks/usePageData';

const About = () => {
  const { hasData, isGenerating, handleStartWithTestData, handleStartEmpty, handleGotoGrid } = usePageData();

  // Set SEO metadata
  useSeoMeta({
    title: 'About - ExocortexLog',
    description: 'Learn about ExocortexLog, a visual time tracking app for life logging and memory aid.',
  });

  return (
    <PageLayout title="ExocortexLog">
      <AboutContent
        hasData={hasData}
        isGenerating={isGenerating}
        onStartWithTestData={handleStartWithTestData}
        onStartEmpty={handleStartEmpty}
        onGotoGrid={handleGotoGrid}
      />
    </PageLayout>
  );
};

export default About;