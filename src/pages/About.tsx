/**
 * About.tsx - About Page
 *
 * This page provides information about ExocortexLog as a life logger and memory aid,
 * along with instructions on how to use the app.
 */

import React from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Heart, Brain, Play, Database as DatabaseIcon, Grid3X3, BarChart3, Settings, Database } from 'lucide-react';
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
      {/* Hero Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Brain className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Your Personal Life Logger & Memory Aid
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ExocortexLog is a visual time tracking application that helps you understand your daily patterns,
              track your activities, and build a personal archive of your life's moments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* What It Is */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            What is ExocortexLog?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground leading-relaxed">
            ExocortexLog is more than just a time tracker—it's your personal exocortex, an external
            memory system that helps you capture, organize, and reflect on your daily experiences.
            By visualizing your time in an intuitive grid format, you can discover patterns, track moods,
            and build a comprehensive record of your life.
          </p>
          <p className="text-foreground leading-relaxed">
            The app stays completely on your device—no data is sent to external servers. Your memories
            and patterns remain private and secure, accessible only to you.
          </p>
        </CardContent>
      </Card>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            How to Use the App
          </CardTitle>
          <CardDescription>
            Getting started with ExocortexLog is simple and intuitive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Add Your First Event</h3>
              <p className="text-muted-foreground">
                Click the blue <span className="font-mono bg-muted px-2 py-1 rounded">+</span> button
                in the bottom-right corner to create your first time entry. Enter a category
                (like "Work", "Exercise", or "Sleep"), set the duration, and adjust your mood sliders.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Understand the Grid</h3>
              <p className="text-muted-foreground">
                The main grid shows your daily activities as colored blocks. Each row represents a day,
                and columns represent hours. Colors indicate different categories, and smiley faces show your mood.
                Scroll down to see past days—older data loads automatically.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Track Your Patterns</h3>
              <p className="text-muted-foreground">
                Use the <span className="font-mono bg-muted px-2 py-1 rounded">Stats</span> view to analyze
                your time distribution, see trends, and understand your daily rhythms. Track how different
                activities affect your mood and energy levels over time.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              4
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Customize & Export</h3>
              <p className="text-muted-foreground">
                Visit the <span className="font-mono bg-muted px-2 py-1 rounded">Conf</span> section to
                customize category colors, manage your data, and export your timeline as JSON for backup.
                Regular exports are recommended since all data is stored locally in your browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Privacy-First</h3>
                <p className="text-sm text-muted-foreground">
                  All data stored locally in your browser. No cloud storage, no tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Grid3X3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Visual Time Grid</h3>
                <p className="text-sm text-muted-foreground">
                  Intuitive 24-hour grid layout makes patterns instantly visible.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Mood Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track happiness, wakefulness, and health for each activity.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Highly Customizable</h3>
                <p className="text-sm text-muted-foreground">
                  Custom colors, themes, and flexible category system.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips & Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Effective Life Logging</CardTitle>
          <CardDescription>
            Make the most of your ExocortexLog experience with these best practices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-primary font-semibold">•</span>
            <p className="text-sm text-foreground">
              <strong>Be consistent:</strong> Try to log events at the same times each day to build a routine.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-semibold">•</span>
            <p className="text-sm text-foreground">
              <strong>Use meaningful categories:</strong> Create categories that reflect your actual activities and lifestyle.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-semibold">•</span>
            <p className="text-sm text-foreground">
              <strong>Add notes when significant:</strong> Journal entries for important events provide valuable context later.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-semibold">•</span>
            <p className="text-sm text-foreground">
              <strong>Backup regularly:</strong> Use the export feature weekly to prevent data loss.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-semibold">•</span>
            <p className="text-sm text-foreground">
              <strong>Review weekly:</strong> Check your stats every week to identify patterns and make adjustments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Ready to start tracking your life?
            </h3>
            <p className="text-muted-foreground">
              {hasData === null
                ? "Checking your data..."
                : hasData
                  ? "You already have data. Continue tracking or explore your patterns."
                  : "Start fresh with an empty timeline or try sample data to explore."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleStartWithTestData}
                disabled={isGenerating || hasData === null}
                className="flex items-center gap-2"
              >
                <DatabaseIcon className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Start with test data'}
              </Button>
              <Button
                onClick={hasData ? handleGotoGrid : handleStartEmpty}
                variant="outline"
                disabled={hasData === null}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {hasData === null
                  ? 'Loading...'
                  : hasData
                    ? 'Go to grid'
                    : 'Start empty'
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default About;