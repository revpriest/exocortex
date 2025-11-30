/**
 * ExamplePage.tsx - Example of how to create a new page using the refactored components
 *
 * This demonstrates how easy it is to create new pages with consistent layout and functionality.
 */

import React from 'react';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLayout } from '@/components/PageLayout';

const ExamplePage = () => {
  // Set SEO metadata
  useSeoMeta({
    title: 'Example - ExocortexLog',
    description: 'An example page showing the refactored page structure.',
  });

  return (
    <PageLayout title="Example Page">
      {/* Just the content - no boilerplate! */}
      <Card>
        <CardHeader>
          <CardTitle>Clean & Simple</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page demonstrates how easy it is to create new pages with the refactored components.
            All the boilerplate (navigation, layout, SEO setup) is handled automatically.
          </p>
          <p className="text-muted-foreground mt-2">
            Just focus on your content - the layout, navigation, and common functionality are all reusable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benefits of the Refactoring</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Consistent layout across all pages</li>
            <li>• Reusable navigation components</li>
            <li>• Shared state management hooks</li>
            <li>• Easy to maintain and update</li>
            <li>• Focus on content, not boilerplate</li>
          </ul>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default ExamplePage;