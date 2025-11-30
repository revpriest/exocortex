/**
 * About.tsx - About Page
 *
 * This page provides information about ExocortexLog as a life logger and memory aid,
 * along with instructions on how to use the app.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3, BarChart3, Settings, Clock, Database, Heart, Brain, BookOpen, Play, Database as DatabaseIcon } from 'lucide-react';
import { ExocortexDB } from '@/lib/exocortex';

const About = () => {
  const navigate = useNavigate();
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Set SEO metadata
  useSeoMeta({
    title: 'About - ExocortexLog',
    description: 'Learn about ExocortexLog, a visual time tracking app for life logging and memory aid.',
  });

  // Check if there's existing data
  useEffect(() => {
    const checkForData = async () => {
      try {
        const database = new ExocortexDB();
        await database.init();

        // Check today and past few days for events
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = await database.getEventsByDate(today);

        if (todayEvents.length > 0) {
          setHasData(true);
          return;
        }

        // Check past 7 days
        for (let i = 1; i <= 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const events = await database.getEventsByDate(dateStr);

          if (events.length > 0) {
            setHasData(true);
            return;
          }
        }

        setHasData(false);
      } catch (error) {
        console.error('Failed to check database:', error);
        setHasData(false);
      }
    };

    checkForData();
  }, []);

  const handleGridClick = () => {
    navigate('/');
  };

  const handleStatsClick = () => {
    navigate('/?view=stats');
  };

  const handleConfClick = () => {
    navigate('/?view=conf');
  };

  const handleStartWithTestData = async () => {
    setIsGenerating(true);
    try {
      const database = new ExocortexDB();
      await database.init();

      // Clear existing data first
      await database.clearAllEvents();

      // Categories for test data
      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];

      // Generate events for the past 7 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago

      const events: Omit<any, 'id'>[] = [];

      // Generate events for each day
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayEvents: Omit<any, 'id'>[] = [];

        // Create sleep event that starts around 22:00 and lasts 7-8 hours
        const sleepStartHour = 20 + Math.floor(Math.random() * 3); // 20:00, 21:00, or 22:00
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random(); // 7-8 hours

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        // Sleep event with typical sleep values
        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          notes: Math.random() > 0.7 ? [
            'Had some interesting dreams',
            'Woke up feeling refreshed',
            'Slept through the night',
            'A bit restless but okay',
            'Deep sleep cycle felt good'
          ][Math.floor(Math.random() * 5)] : undefined,
          happiness: 0.8,
          wakefulness: Math.random() * 0.02,
          health: 0.9,
        };

        dayEvents.push(sleepEvent);

        // Fill the rest of the day with other activities
        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0); // Start at 7:00 AM

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();
          if (timeUntilSleep < 30 * 60 * 1000) break; // Less than 30 minutes before sleep

          // Random duration between 30 minutes and 3 hours
          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];
          const happiness = Math.random() * 0.4 + 0.5;
          const wakefulness = Math.random() * 0.4 + 0.5;
          const health = Math.random() * 0.3 + 0.6;

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            notes: Math.random() > 0.6 ? [
              'Productive session',
              'Good progress made',
              'Felt energized',
              'Nice break',
              'Interesting activity'
            ][Math.floor(Math.random() * 5)] : undefined,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);
          currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
        }

        // Add all events for this day
        events.push(...dayEvents);
      }

      // Add all events to database
      for (const event of events) {
        await database.addEvent(event);
      }

      // Navigate to grid after generating data
      navigate('/');
    } catch (error) {
      console.error('Failed to generate test data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEmpty = () => {
    navigate('/');
  };

  const handleGotoGrid = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-4 pb-16 md:pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              ExocortexLog
            </h1>

            {/* View Toggle Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGridClick}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStatsClick}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfClick}
              >
                <Settings className="h-4 w-4 mr-2" />
                Conf
              </Button>
            </div>
          </div>
        </div>

        {/* About Content */}
        <div className="space-y-8">
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
        </div>
      </div>
    </div>
  );
};

export default About;