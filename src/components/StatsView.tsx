/**
 * StatsView.tsx - Statistics and Analytics Component
 *
 * This component provides comprehensive analytics for the time tracking data.
 * It features:
 *
 * - Date range selection with smart defaults
 * - Multi-line graph showing mood trends (happiness, wakefulness, health)
 * - Category histogram showing time distribution across activities
 * - Responsive design with beautiful visualizations
 * - Color-coordinated with the main grid interface
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ExocortexEvent, ExocortexDB, getEventColor } from '@/lib/exocortex';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { CalendarIcon, BarChart3, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * Component Props Interface
 */
interface StatsViewProps {
  className?: string;
}

/**
 * Stats Data Interface for Charts
 *
 * Defines the structure of data used in our visualizations.
 * This helps maintain type safety throughout the component.
 */
interface MoodDataPoint {
  date: string;
  time: string;
  happiness: number;
  wakefulness: number;
  health: number;
}

interface CategoryDataPoint {
  category: string;
  hours: number;
  color: string;
  count: number;
}

/**
 * Main StatsView Component
 *
 * This component handles all statistics functionality including data fetching,
 * date filtering, and rendering of both the line chart and histogram.
 */
export function StatsView({ className }: StatsViewProps) {
  /**
   * State Management
   *
   * These state variables control the component's behavior and data:
   */
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ExocortexEvent[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Database Initialization
   *
   * Effect runs once on component mount to initialize the database
   * and set up the default date range (last week).
   */
  useEffect(() => {
    const initDb = async () => {
      try {
        const database = new ExocortexDB();
        await database.init();
        setDb(database);

        // Set default date range to last two days
        const today = new Date();
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(today.getDate() - 2);

        setStartDate(twoDaysAgo);
        setEndDate(today);

        // Load events for the default range
        console.log('Loading range:', twoDaysAgo.toISOString(), 'to', today.toISOString());
        await loadEventsForRange(database, twoDaysAgo, today);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError('Failed to load statistics data');
      } finally {
        setLoading(false);
      }
    };

    initDb();
  }, []);

  /**
   * Load Events for Date Range
   *
   * This helper function fetches all events within the specified date range.
   * It queries the database day by day to ensure we get all relevant events.
   */
  const loadEventsForRange = async (database: ExocortexDB, start: Date, end: Date) => {
    try {
      const allEvents: ExocortexEvent[] = [];
      const current = new Date(start);

      // Iterate through each day in the range
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayEvents = await database.getEventsByDate(dateStr);
        allEvents.push(...dayEvents);
        current.setDate(current.getDate() + 1);
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events for selected date range');
    }
  };

  /**
   * Handle Date Range Changes
   *
   * These functions handle user interactions with the date pickers.
   * They load new data when the date range changes.
   */
  const handleStartDateChange = async (date: Date | undefined) => {
    if (!date || !endDate || !db) return;

    setStartDate(date);
    setShowStartCalendar(false);
    await loadEventsForRange(db, date, endDate);
  };

  const handleEndDateChange = async (date: Date | undefined) => {
    if (!date || !startDate || !db) return;

    setEndDate(date);
    setShowEndCalendar(false);
    await loadEventsForRange(db, startDate, date);
  };

  /**
   * Process Data for Visualizations
   *
   * These useMemo hooks transform the raw event data into formats
   * suitable for our charts. They automatically recalculate when events change.
   */
  const moodData = useMemo(() => {
    const dataPoints: MoodDataPoint[] = [];

    // Create hourly sampling across the date range for better visualization
    if (events.length === 0) return dataPoints;

    // Sort events by end time
    const sortedEvents = [...events].sort((a, b) => a.endTime - b.endTime);

    // Get the date range
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const startDate = startOfDay(new Date(firstEvent.endTime));
    const endDate = endOfDay(new Date(lastEvent.endTime));

    // Create 1-hour intervals for maximum detail
    const current = new Date(startDate);
    while (current <= endDate) {
      const nextInterval = new Date(current);
      nextInterval.setHours(nextInterval.getHours() + 1);

      // Find events active during this 3-hour period
      const activeEvents = sortedEvents.filter(event => {
        const eventEnd = new Date(event.endTime);
        // Estimate start time (simplified - assumes 1 hour duration)
        const eventStart = new Date(eventEnd.getTime() - (60 * 60 * 1000));

        // Check if event overlaps with current interval
        return (
          (eventStart >= current && eventStart < nextInterval) ||
          (eventEnd >= current && eventEnd < nextInterval) ||
          (eventStart < current && eventEnd > current)
        );
      });

      if (activeEvents.length > 0) {
        // Calculate weighted average based on event duration
        let totalWeight = 0;
        let weightedHappiness = 0;
        let weightedWakefulness = 0;
        let weightedHealth = 0;

        activeEvents.forEach(event => {
          // Estimate duration (simplified calculation)
          let duration = 60; // Default 1 hour
          const eventIndex = sortedEvents.findIndex(e => e.id === event.id);
          if (eventIndex > 0) {
            const prevEvent = sortedEvents[eventIndex - 1];
            duration = Math.max(15, (event.endTime - prevEvent.endTime) / (1000 * 60));
          }

          const weight = duration;
          totalWeight += weight;
          weightedHappiness += event.happiness * weight;
          weightedWakefulness += event.wakefulness * weight;
          weightedHealth += event.health * weight;
        });

        // Create weighted averages
        const avgHappiness = weightedHappiness / totalWeight;
        const avgWakefulness = weightedWakefulness / totalWeight;
        const avgHealth = weightedHealth / totalWeight;

        dataPoints.push({
          date: format(current, 'MMM dd'),
          time: format(current, 'HH:mm'),
          happiness: Number(avgHappiness.toFixed(2)),
          wakefulness: Number(avgWakefulness.toFixed(2)),
          health: Number(avgHealth.toFixed(2)),
        });
      }

      // Move to next interval
      current.setTime(nextInterval.getTime());
    }

    return dataPoints;
  }, [events]);

  const categoryData = useMemo(() => {
    // Sort events by end time to calculate durations properly
    const sortedEvents = [...events].sort((a, b) => a.endTime - b.endTime);

    // Calculate total hours per category
    const categoryMap = new Map<string, { totalMinutes: number; count: number }>();

    sortedEvents.forEach((event, index) => {
      // Calculate duration - estimate based on time from previous event or default to 1 hour
      let durationMinutes = 60; // Default 1 hour

      if (index > 0) {
        const previousEvent = sortedEvents[index - 1];
        durationMinutes = Math.max(15, (event.endTime - previousEvent.endTime) / (1000 * 60)); // At least 15 minutes
      }

      const current = categoryMap.get(event.category) || { totalMinutes: 0, count: 0 };
      categoryMap.set(event.category, {
        totalMinutes: current.totalMinutes + durationMinutes,
        count: current.count + 1
      });
    });

    // Convert to chart format and get top categories
    const data: CategoryDataPoint[] = Array.from(categoryMap.entries())
      .map(([category, { totalMinutes, count }]) => ({
        category,
        hours: Number((totalMinutes / 60).toFixed(1)),
        color: getEventColor({
          id: '',
          endTime: Date.now(),
          category,
          happiness: 0.7,
          wakefulness: 0.8,
          health: 0.9
        }),
        count
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // Top 10 categories

    // Debug to see category order and check for "Exercise"
    return data;
  }, [events]);



  /**
   * Loading State
   *
   * Show a loading indicator while data is being fetched.
   */
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Date Range Selection */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Statistics & Analytics
            </h1>
            <p className="text-muted-foreground">
              Visualize your time tracking patterns and mood trends
            </p>
          </div>

          {/* Date Range Selectors */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Start Date */}
            <div className="relative">
              <Label className="text-sm text-foreground mb-1 block">Start Date</Label>
              <Button
                variant="outline"
                className="w-full sm:w-40 bg-secondary border-border text-secondary-foreground"
                onClick={() => setShowStartCalendar(!showStartCalendar)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
              </Button>
              {showStartCalendar && (
                <div className="absolute top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                    initialFocus
                    className="rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* End Date */}
            <div className="relative">
              <Label className="text-sm text-foreground mb-1 block">End Date</Label>
              <Button
                variant="outline"
                className="w-full sm:w-40"
                onClick={() => setShowEndCalendar(!showEndCalendar)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
              </Button>
              {showEndCalendar && (
                <div className="absolute top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    initialFocus
                    className="rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/20">
          <CardContent className="pt-6">
            <div className="text-destructive text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Mood Trends Line Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mood Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    `${(value * 100).toFixed(0)}%`,
                    name
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `${payload[0].payload.date} ${label}`;
                    }
                    return label;
                  }}
                />
                <Legend
                  wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="happiness"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Happiness"
                  dot={{ fill: '#EF4444', r: 1 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="wakefulness"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Wakefulness"
                  dot={{ fill: '#3B82F6', r: 1 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="health"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Health"
                  dot={{ fill: '#10B981', r: 1 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No mood data available for the selected date range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Distribution Histogram */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Time Distribution by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={categoryData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="category"
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    textAnchor: 'middle',
                    fontSize: 13,
                  }}
                />
                <YAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    `${value} hours`,
                    name
                  ]}
                />
                <Bar
                  dataKey="hours"
                  name="Hours"
                  radius={[4, 4, 0, 0]}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No category data available for the selected date range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.happiness, 0) / moodData.length).toFixed(2)
                  : '0.00'
                }
              </div>
              <div className="text-sm text-muted-foreground mt-1">Average Happiness</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {(() => {
                  const sleepEvents = events.filter(e => e.category.toLowerCase() === 'sleep');
                  if (sleepEvents.length === 0) return '0.00';
                  const avgSleep = sleepEvents.reduce((sum, e) => sum + e.wakefulness, 0) / sleepEvents.length;
                  return avgSleep.toFixed(2);
                })()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Wakefulness (Sleep)</div>
              <div className="text-xs text-muted-foreground/70 mt-1">During sleep periods</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {(() => {
                  const awakeEvents = events.filter(e => e.category.toLowerCase() !== 'sleep');
                  if (awakeEvents.length === 0) return '0.00';
                  const avgAwake = awakeEvents.reduce((sum, e) => sum + e.wakefulness, 0) / awakeEvents.length;
                  return avgAwake.toFixed(2);
                })()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Wakefulness (Awake)</div>
              <div className="text-xs text-muted-foreground/70 mt-1">During awake periods</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.health, 0) / moodData.length).toFixed(2)
                  : '0.00'
                }
              </div>
              <div className="text-sm text-muted-foreground mt-1">Average Health</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
