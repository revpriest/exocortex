/**
 * About.tsx - About Page
 *
 * This page provides information about ExocortexLog as a life logger and memory aid,
 * along with instructions on how to use the app.
 */

import React, { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Heart, Play, Newspaper as NewsIcon, Database as DatabaseIcon, Brain as BrainIcon, BarChart3, Settings, Database, Image as ImageIcon } from 'lucide-react';
import { usePageData } from '@/hooks/usePageData';
import { ExocortexDB } from '@/lib/exocortex';

const About = () => {
  const { hasData, isGenerating, handleStartWithTestData, handleStartEmpty, handleGotoGrid } = usePageData();
  const [db, setDb] = useState<ExocortexDB | null>(null);

  //Include the DB so header add-event can work.
  useEffect(() => {
    const initAll = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);
    };
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  // Set SEO metadata
  useSeoMeta({
    title: 'About - ExocortexLog',
    description: 'Learn about ExocortexLog, a visual time tracking app for life logging and memory aid.',
  });

  return (
    <PageLayout db={db} title="About" explain="about" currentView="about">
      {/* Hero Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <img src="news/img/exocortexlog.png" style={{width: "120px"}}/>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Your Personal Life Logger & Memory Aid
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ExocortexLog is a time tracking application and memory log
              to track and understand your life. 
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
               It is a crutch for
              a poor memory, a way to build a diary you can look back on.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* What It Is */}
      <Card>
        <CardHeader>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  What is ExocortexLog?
                </CardTitle>
              </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You see a detective on the TV and he's interviewing all
          the suspects asking them what they were doing on the night
          of the murder a month ago last Tuesday night.
          </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          And on the TV, the suspects all know!
          </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          But most real people would barely have any clue. If you're
          lucky it'd have been a night planned in your calendar, but mostly:
          Dunno. Watching TV maybe? No idea what show. Was I at the gym
          that night?
          </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          As we all get older this problem increases I'm told.
          Eventually full on senility sets in.
          </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          But what if you have already built the habit to record
          what you're doing? To be able to look back and revise
          and review how you spent your days? An external aid
          as a crutch to your own forgetful brain's cortex?
          </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          That's what Exocortex Log is for.
          </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The app stays completely on your device
            no data is sent to external servers. Your memories
            and patterns remain private and secure, accessible only to you.
          </p>

        </CardContent>
      </Card>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                How to Use the App
              </CardTitle>
              </div>
            </div>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CardDescription>
                Getting started.
              </CardDescription>
              </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Fill with a test data</h3>
              <p className="text-muted-foreground">
                When you open the app with an empty DB, it offers you the chance
                to load up on test data. Accept that offer, or press the button
                for test data at the bottom of the conf screen.
              </p>
              <p className="text-muted-foreground">
                The grid will fill up with fake events over the last few days so
                you can test all the functions of the app before you build a personal log.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Add Your First Event</h3>
              <p className="text-muted-foreground">
                Click the blue <span className="font-mono bg-muted px-2 py-1 rounded">+</span> button
                in the title row to create your first time entry. 
              </p>
              <p className="text-muted-foreground">
                Enter a category
                (like "Work", "Exercise", or "Sleep"), when you finished, and adjust your mood sliders.
                The fastest way to use it is to just add an event when you finish
                doing a thing and are starting a new thing. So it's optimized to
                just add from the last thing to the current time.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Review your log</h3>
              <p className="text-muted-foreground">
                The <span className="font-mono bg-muted px-2 py-1 rounded">Grid</span> view 
                shows your daily activities as colored blocks. 
                Each row represents a day, and columns represent hours. Colors 
                indicate different categories, and smiley faces show your mood.
                Scroll down to see past days older data loads automatically.
              </p>
              <p className="text-muted-foreground">
                The <span className="font-mono bg-muted px-2 py-1 rounded">Summary</span> view 
                highlights only those events notable enough to have notes. Mundane
                events are collapsed to save room.
              </p>
              <p className="text-muted-foreground">
                Use the <span className="font-mono bg-muted px-2 py-1 rounded">Stats</span> view to 
                view graphs and stats on your past log. Track how different
                activities affect your mood and energy levels over time. 
              </p>
              <p className="text-muted-foreground">
                The app can be installed as a Progressive Web App
                for use offline, and all data is stored only on
                you local machine, never shared to any server.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              4
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Make Logging a Habit</h3>
              <p className="text-muted-foreground">
                Many people find it helpful to set up a repeating reminder in their 
                phone's alarm or reminder app to nudge them to update ExocortexLog 
                regularly. For example, you might add an alarm every hour or
                a few times a day to quickly record what you're doing.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              5
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Customize & Export</h3>
              <p className="text-muted-foreground">
                Visit the <span className="font-mono bg-muted px-2 py-1 rounded">Conf</span> section to
                customize category colors, manage your data, and export your timeline as 
                JSON for backup.  Regular exports are recommended since all data is stored 
                locally in your browser. Nobody else can rescue your data! You are responsible
                for it!
              </p>
              <p className="text-muted-foreground">
                The conf page also has a button to clear caches and
                check for upgrades of the app. Make sure to be online
                when you press that!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Preview - Screenshots */}
      <Card className="border-primary/30 bg-background/60">
        <CardHeader>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                See the app in action
              </CardTitle>
            </div>
            <div className="flex justify-center">
              <CardDescription>
                Screenshots of the main Time Grid, Summary, and Stats pages with sample data.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <aside className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
              <h3 className="mb-2 font-semibold text-foreground">Time Grid view</h3>
              <p className="mb-3 text-muted-foreground">
                The Time Grid lays out your day as a colourful 24-hour timeline so you can see patterns at a glance.
              </p>
              <img
                src="/screenshots/grid.png"
                alt="Screenshot of the Time Grid page showing a colourful day timeline with test data."
                className="w-full rounded-md border border-border shadow-sm"
              />
            </aside>

            <aside className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
              <h3 className="mb-2 font-semibold text-foreground">Summary view</h3>
              <p className="mb-3 text-muted-foreground">
                The Summary page collapses routine stretches and highlights moments with notes so you can skim quickly.
              </p>
              <img
                src="/screenshots/summary.png"
                alt="Screenshot of the Summary page listing grouped events and notes with test data."
                className="w-full rounded-md border border-border shadow-sm"
              />
            </aside>

            <aside className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
              <h3 className="mb-2 font-semibold text-foreground">Stats view</h3>
              <p className="mb-3 text-muted-foreground">
                The Stats view shows mood trends and how your time is distributed between different activities.
              </p>
              <img
                src="/screenshots/stats.png"
                alt="Screenshot of the Stats page with mood trend lines and time distribution charts based on test data."
                className="w-full rounded-md border border-border shadow-sm"
              />
            </aside>
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
                <BrainIcon className="h-4 w-4 text-primary" />
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
              <strong>Be consistent:</strong> Try to log events as they finish and you swap tasks. Build a routine that any time you switch tasks, you update the log of what you've been doing.
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
                onClick={hasData ? handleGotoGrid : handleStartEmpty}
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
              <Button
                onClick={handleStartWithTestData}
                disabled={isGenerating || hasData === null}
                className="flex items-center gap-2"
              >
                <DatabaseIcon className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Start with test data'}
              </Button>
              <Button
                onClick={() => {
                  window.location.href = "/news/index.html";
                }}
                className="flex items-center gap-2"
              >
                <NewsIcon className="h-4 w-4" />
                News Blog
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default About;
