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
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';

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

        // Set default date range to last week
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);

        setStartDate(lastWeek);
        setEndDate(today);

        // Load events for the default range
        await loadEventsForRange(database, lastWeek, today);
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

    // Group events by date and calculate average mood values
    const eventsByDate = events.reduce((acc, event) => {
      const date = format(new Date(event.endTime), 'MMM dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {} as Record<string, ExocortexEvent[]>);

    // Calculate daily averages
    Object.entries(eventsByDate).forEach(([date, dayEvents]) => {
      const avgHappiness = dayEvents.reduce((sum, e) => sum + e.happiness, 0) / dayEvents.length;
      const avgWakefulness = dayEvents.reduce((sum, e) => sum + e.wakefulness, 0) / dayEvents.length;
      const avgHealth = dayEvents.reduce((sum, e) => sum + e.health, 0) / dayEvents.length;

      dataPoints.push({
        date,
        time: format(new Date(dayEvents[0].endTime), 'HH:mm'),
        happiness: Number(avgHappiness.toFixed(2)),
        wakefulness: Number(avgWakefulness.toFixed(2)),
        health: Number(avgHealth.toFixed(2)),
      });
    });

    return dataPoints.sort((a, b) => a.date.localeCompare(b.date));
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
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Statistics & Analytics
            </h1>
            <p className="text-gray-400">
              Visualize your time tracking patterns and mood trends
            </p>
          </div>

          {/* Date Range Selectors */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Start Date */}
            <div className="relative">
              <Label className="text-sm text-gray-300 mb-1 block">Start Date</Label>
              <Button
                variant="outline"
                className="w-full sm:w-40 bg-gray-700 border-gray-600 text-white"
                onClick={() => setShowStartCalendar(!showStartCalendar)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
              </Button>
              {showStartCalendar && (
                <div className="absolute top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
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
              <Label className="text-sm text-gray-300 mb-1 block">End Date</Label>
              <Button
                variant="outline"
                className="w-full sm:w-40 bg-gray-700 border-gray-600 text-white"
                onClick={() => setShowEndCalendar(!showEndCalendar)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
              </Button>
              {showEndCalendar && (
                <div className="absolute top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
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
        <Card className="border-red-600 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-red-400 text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Mood Trends Line Chart */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mood Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  domain={[0, 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend
                  wrapperStyle={{ color: '#F3F4F6' }}
                />
                <Line
                  type="monotone"
                  dataKey="happiness"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Happiness"
                  dot={{ fill: '#EF4444', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="wakefulness"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Wakefulness"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="health"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Health"
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No mood data available for the selected date range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Distribution Histogram */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">
            Time Distribution by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={categoryData}
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Hours', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number, name: string) => [
                    `${value} hours`,
                    name
                  ]}
                />
                <Bar
                  dataKey="hours"
                  name="Hours"
                  radius={[0, 4, 4, 0]}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No category data available for the selected date range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.happiness, 0) / moodData.length).toFixed(2)
                  : '0.00'
                }
              </div>
              <div className="text-sm text-gray-400 mt-1">Average Happiness</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.wakefulness, 0) / moodData.length).toFixed(2)
                  : '0.00'
                }
              </div>
              <div className="text-sm text-gray-400 mt-1">Average Wakefulness</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.health, 0) / moodData.length).toFixed(2)
                  : '0.00'
                }
              </div>
              <div className="text-sm text-gray-400 mt-1">Average Health</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}