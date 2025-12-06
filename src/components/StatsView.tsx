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
import { useNavigate } from 'react-router-dom';
import { ExocortexEvent, ExocortexDB, getEventColor } from '@/lib/exocortex';
import { Calendar } from '@/components/ui/calendar';
import { DayOverviewDialog, DayStatsSummary } from '@/components/DayOverviewDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { CalendarIcon, BarChart3, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { addDays, addMonths, endOfDay, format, isBefore, isValid, startOfDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Component Props Interface
 */
interface StatsViewProps {
  className?: string;
  initialStart?: Date;
  initialWindow?: WindowOption;
}

/**
 * Stats Data Interface for Charts
 *
 * Defines the structure of data used in our visualizations.
 * This helps maintain type safety throughout the component.
 */
interface MoodDataPoint {
  /** Full label used for axis: "MMM dd HH:mm" */
  label: string;
  /** Date component: "yyyy-MM-dd" for lookup */
  dateKey: string;
  /** Date label component: "MMM dd" */
  date: string;
  /** Time component: "HH:mm" */
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

export interface DayStats {
  dateKey: string;
  avgHappiness: number | null;
  avgHealth: number | null;
  avgWakefulnessAwake: number | null;
  sleepHours: number;
  notes: string[];
}

// Available window sizes (number of days)
const WINDOW_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 14, 28, 'month'] as const;

type WindowOption = (typeof WINDOW_OPTIONS)[number];

// Sampling resolution for mood graph in minutes.
// Smaller values give smoother lines at the cost of more points.
const SAMPLE_MINUTES = 60;

const DATE_KEY_FORMAT = 'yyyy-MM-dd';

function resolveWindowLabel(value: WindowOption): string {
  if (value === 'month') return 'Month';
  if (value === 1) return '1 day';
  return `${value} days`;
}

function calculateEndDate(start: Date, window: WindowOption): Date {
  const safeStart = startOfDay(start);

  if (window === 'month') {
    // Exactly one month after the chosen start date, minus 1 millisecond
    const nextMonthSameDay = addMonths(safeStart, 1);
    return new Date(nextMonthSameDay.getTime() - 1);
  }

  const approxEnd = addDays(safeStart, window - 1);
  return endOfDay(approxEnd);
}

function shiftStartDate(current: Date, window: WindowOption, direction: 1 | -1): Date {
  const base = startOfDay(current);

  if (window === 'month') {
    const shifted = addMonths(base, direction);
    return startOfDay(shifted);
  }

  const amount = window;
  const next = addDays(base, direction * amount);
  return startOfDay(next);
}

/**
 * Build a time-regular mood series where each sample represents a fixed
 * SAMPLE_MINUTES-sized bin, and the mood at that time is taken from the
 * event that ends at or after that time. In other words, event state
 * persists "backwards" until the previous event's end time.
 */
function buildMoodSeries(events: ExocortexEvent[], rangeStartDate?: Date, rangeEndDate?: Date): MoodDataPoint[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.endTime - b.endTime);

  // Build event intervals: each event owns the time from the previous
  // event's end (or a small default window for the first event) up
  // to its own endTime.
  const intervals = sorted.map((event, index) => {
    const end = event.endTime;

    // For the first event, assume a short default duration backward so
    // that it has a non-zero interval. For subsequent events, the
    // interval starts at the previous event's end.
    const prevEnd = index === 0
      ? end - SAMPLE_MINUTES * 60_000
      : sorted[index - 1].endTime;

    const start = Math.min(prevEnd, end);

    return {
      start,
      end,
      happiness: event.happiness,
      wakefulness: event.wakefulness,
      health: event.health,
    };
  });

  const firstEnd = sorted[0].endTime;
  const lastEnd = sorted[sorted.length - 1].endTime;

  const rangeStart = rangeStartDate
    ? startOfDay(rangeStartDate).getTime()
    : startOfDay(new Date(firstEnd)).getTime();
  let rangeEnd = rangeEndDate
    ? endOfDay(rangeEndDate).getTime()
    : endOfDay(new Date(lastEnd)).getTime();

  // Ensure the sampling range always extends at least to the last
  // known event, so the last mood value clearly persists forward
  // through the rest of the selected window.
  const lastEventEnd = endOfDay(new Date(lastEnd)).getTime();
  if (lastEventEnd > rangeEnd) {
    rangeEnd = lastEventEnd;
  }

  const stepMs = SAMPLE_MINUTES * 60_000;

  const samples: MoodDataPoint[] = [];

  let t = rangeStart;
  let intervalIndex = 0;

  while (t <= rangeEnd) {
    const binStart = t;
    const binEnd = t + stepMs;
    // Use the end of the bin as the sample time so that the last
    // event in a gap owns the entire stretch leading up to its end.
    const sampleTime = binEnd;

    // Advance intervalIndex until the interval that could own sampleTime.
    while (intervalIndex < intervals.length - 1 && intervals[intervalIndex].end < sampleTime) {
      intervalIndex++;
    }

    const current = intervals[intervalIndex];

    let happiness: number | null = null;
    let wakefulness: number | null = null;
    let health: number | null = null;

    // If this sample time lies between current.start and current.end,
    // use that interval's mood. This effectively means that the
    // event's mood persists backwards until the prior event.
    // Also, once we reach beyond the last interval, we keep using
    // the last known mood so that the graph extends through the
    // full selected window even if no new events occur.
    if (
      (sampleTime >= current.start && sampleTime <= current.end) ||
      (intervalIndex === intervals.length - 1 && sampleTime > current.end)
    ) {
      happiness = current.happiness;
      wakefulness = current.wakefulness;
      health = current.health;
    }

    // If we have data for this bin, push a sample.
    if (happiness !== null && wakefulness !== null && health !== null) {
      const binDate = new Date(binStart);
      const dateLabel = format(binDate, 'MMM dd');
      const timeLabel = format(binDate, 'HH:mm');
      const dateKey = format(binDate, DATE_KEY_FORMAT);

      samples.push({
        label: `${dateLabel} ${timeLabel}`,
        dateKey,
        date: dateLabel,
        time: timeLabel,
        happiness,
        wakefulness,
        health,
      });
    }

    t = binEnd;
  }

  return samples;
}

function buildDayStats(events: ExocortexEvent[]): Map<string, DayStats> {
  const byDate = new Map<string, ExocortexEvent[]>();

  events.forEach(event => {
    const dateKey = format(new Date(event.endTime), DATE_KEY_FORMAT);
    const list = byDate.get(dateKey) ?? [];
    list.push(event);
    byDate.set(dateKey, list);
  });

  const result = new Map<string, DayStats>();

  byDate.forEach((dayEvents, dateKey) => {
    if (dayEvents.length === 0) return;

    let happinessSum = 0;
    let healthSum = 0;
    let count = 0;

    let awakeWakefulnessSum = 0;
    let awakeCount = 0;

    let sleepHours = 0;

    const notes: string[] = [];

    // To approximate durations we need to look at neighbouring events
    const sorted = [...dayEvents].sort((a, b) => a.endTime - b.endTime);

    sorted.forEach((event, index) => {
      // Default to 1h. For non-first events, extend back to previous
      // event in this day; for the very first event of the day, extend
      // back to midnight so we pick up the full sleep chunk whose
      // endTime falls in the early morning.
      const durationMinutes = (() => {
        if (index === 0) {
          const end = event.endTime;
          const endDate = new Date(end);
          const dayStart = new Date(endDate);
          dayStart.setHours(0, 0, 0, 0);
          const diff = (endDate.getTime() - dayStart.getTime()) / (1000 * 60);
          // At least one hour so that tiny early events still show up
          return Math.max(SAMPLE_MINUTES, diff);
        }
        const prevEnd = sorted[index - 1].endTime;
        return Math.max(SAMPLE_MINUTES / 4, (event.endTime - prevEnd) / (1000 * 60));
      })();

      const weight = durationMinutes;

      happinessSum += event.happiness * weight;
      healthSum += event.health * weight;
      count += weight;

      if (event.category.toLowerCase() !== 'sleep') {
        awakeWakefulnessSum += event.wakefulness * weight;
        awakeCount += weight;
      }

      if (event.category.toLowerCase() === 'sleep') {
        sleepHours += durationMinutes / 60;
      }

      if (event.notes && event.notes.trim().length > 0) {
        notes.push(event.notes.trim());
      }
    });

    result.set(dateKey, {
      dateKey,
      avgHappiness: count > 0 ? happinessSum / count : null,
      avgHealth: count > 0 ? healthSum / count : null,
      avgWakefulnessAwake: awakeCount > 0 ? awakeWakefulnessSum / awakeCount : null,
      sleepHours,
      notes,
    });
  });

  return result;
}

/**
 * Main StatsView Component
 *
 * This component handles all statistics functionality including data fetching,
 * date filtering, and rendering of both the line chart and histogram.
 */
export function StatsView({ className, initialStart, initialWindow }: StatsViewProps) {
  /**
   * State Management
   *
   * These state variables control the component's behavior and data:
   */
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ExocortexEvent[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(initialStart);
  const [windowSize, setWindowSize] = useState<WindowOption>(initialWindow ?? 7);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);


  const navigate = useNavigate();

  // Derived end date from startDate + windowSize
  const endDate = useMemo(() => {
    if (!startDate || !isValid(startDate)) return undefined;
    return calculateEndDate(startDate, windowSize);
  }, [startDate, windowSize]);

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

        const today = startOfDay(new Date());
        const defaultStart = initialStart ? startOfDay(initialStart) : addDays(today, -6);
        const defaultWindow = initialWindow ?? 7;

        setStartDate(defaultStart);
        setWindowSize(defaultWindow);

        await loadEventsForRange(database, defaultStart, calculateEndDate(defaultStart, defaultWindow));
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError('Failed to load statistics data');
      } finally {
        setLoading(false);
      }
    };

    void initDb();
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
      const cursor = new Date(startOfDay(start));
      const last = startOfDay(end);

      while (!isBefore(last, cursor)) {
        const dateStr = cursor.toISOString().split('T')[0];
        const dayEvents = await database.getEventsByDate(dateStr);
        allEvents.push(...dayEvents);
        cursor.setDate(cursor.getDate() + 1);
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events for selected date range');
    }
  };

  /**
   * Handle Date / Window Changes
   */
  const refreshRange = async (nextStart: Date | undefined, nextWindow: WindowOption | undefined) => {
    if (!db) return;

    const effectiveStart = nextStart ?? startDate;
    const effectiveWindow = nextWindow ?? windowSize;

    if (!effectiveStart || !isValid(effectiveStart)) return;

    const boundedStart = startOfDay(effectiveStart);
    const boundedEnd = calculateEndDate(boundedStart, effectiveWindow);

    setStartDate(boundedStart);
    setWindowSize(effectiveWindow);

    await loadEventsForRange(db, boundedStart, boundedEnd);
  };

  const handleStartDateChange = async (date: Date | undefined) => {
    setShowStartCalendar(false);
    if (!date) return;
    await refreshRange(date, undefined);
  };

  const handleWindowChange = async (value: string) => {
    const parsed = value === 'month' ? 'month' : Number(value);
    if (!WINDOW_OPTIONS.includes(parsed as WindowOption)) return;
    await refreshRange(undefined, parsed as WindowOption);
  };

  const handleShift = async (direction: 1 | -1) => {
    if (!startDate) return;
    const nextStart = shiftStartDate(startDate, windowSize, direction);
    await refreshRange(nextStart, undefined);
  };

  /**
   * Process Data for Visualizations
   */
  const moodData = useMemo(() => {
    return buildMoodSeries(events, startDate, endDate);
  }, [events, startDate, endDate]);

  const dayStatsMap = useMemo(() => {
    return buildDayStats(events);
  }, [events]);

  const categoryData = useMemo(() => {
    const sortedEvents = [...events].sort((a, b) => a.endTime - b.endTime);

    const categoryMap = new Map<string, { totalMinutes: number; count: number }>();

    sortedEvents.forEach((event, index) => {
      let durationMinutes = SAMPLE_MINUTES;

      if (index > 0) {
        const previousEvent = sortedEvents[index - 1];
        durationMinutes = Math.max(
          SAMPLE_MINUTES / 4,
          (event.endTime - previousEvent.endTime) / (1000 * 60),
        );
      }

      const current = categoryMap.get(event.category) || { totalMinutes: 0, count: 0 };
      categoryMap.set(event.category, {
        totalMinutes: current.totalMinutes + durationMinutes,
        count: current.count + 1,
      });
    });

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
          health: 0.9,
        }),
        count,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    return data;
  }, [events]);

  const handleDateClick = (dateKey: string) => {
    const stats = dayStatsMap.get(dateKey) ?? null;
    setSelectedDateKey(dateKey);
  };

  const handleShiftSelectedDay = (direction: 1 | -1) => {
    if (!selectedDateKey) return;
    const currentDate = new Date(selectedDateKey + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + direction);
    const newKey = format(currentDate, DATE_KEY_FORMAT);
    setSelectedDateKey(newKey);
  };



  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className ?? ''}`}>
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* Header with Date Range Selection */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Statistics &amp; Analytics
              </h1>
              <p className="text-muted-foreground">
                Visualize your time tracking patterns and mood trends
              </p>
            </div>
          </div>

          {/* Date Window Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
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

            {/* Window Size */}
            <div>
              <Label className="text-sm text-foreground mb-1 block">Length</Label>
              <select
                className="w-full sm:w-40 bg-secondary border border-border text-secondary-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={windowSize}
                onChange={e => {
                  void handleWindowChange(e.target.value);
                }}
              >
                {WINDOW_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {resolveWindowLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  void handleShift(-1);
                }}
                disabled={!startDate}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  void handleShift(1);
                }}
                disabled={!startDate}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {startDate && endDate && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing data from <span className="font-medium">{format(startDate, 'MMM dd, yyyy')}</span> to{' '}
            <span className="font-medium">{format(endDate, 'MMM dd, yyyy')}</span>
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/20">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div className="text-destructive text-sm">{error}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  void handleShift(-1);
                }}
                disabled={!startDate}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  void handleShift(1);
                }}
                disabled={!startDate}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mood Trends Line Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle className="text-foreground">Mood Trends Over Time</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                void handleShift(-1);
              }}
              disabled={!startDate}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                void handleShift(1);
              }}
              disabled={!startDate}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {moodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={moodData}
                onClick={(state) => {
                  const activeLabel = state?.activeLabel as string | undefined;
                  if (!activeLabel) return;
                  const point = moodData.find((m) => m.label === activeLabel);
                  if (point) {
                    handleDateClick(point.dateKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 11,
                  }}
                  angle={-90}
                  textAnchor="end"
                  height={80}
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
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    `${(value * 100).toFixed(0)}%`,
                    name,
                  ]}
                  labelFormatter={(label: string) => label}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
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
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-foreground">Time Distribution by Category</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                void handleShift(-1);
              }}
              disabled={!startDate}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                void handleShift(1);
              }}
              disabled={!startDate}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{
                    value: 'Hours',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)} hours`,
                    name === 'hours' ? 'Time spent' : name,
                  ]}
                />
                <Bar dataKey="hours" name="Time spent (hours)">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${entry.category}-${index}`} fill={entry.color} />
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
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-0">
            <CardTitle className="text-sm font-medium">Average Happiness</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(-1);
                }}
                disabled={!startDate}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(1);
                }}
                disabled={!startDate}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.happiness, 0) / moodData.length).toFixed(2)
                  : '0.00'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-0">
            <CardTitle className="text-sm font-medium">Wakefulness (Sleep)</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(-1);
                }}
                disabled={!startDate}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(1);
                }}
                disabled={!startDate}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {(() => {
                  const sleepEvents = events.filter(e => e.category.toLowerCase() === 'sleep');
                  if (sleepEvents.length === 0) return '0.00';
                  const avgSleep =
                    sleepEvents.reduce((sum, e) => sum + e.wakefulness, 0) / sleepEvents.length;
                  return avgSleep.toFixed(2);
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-0">
            <CardTitle className="text-sm font-medium">Wakefulness (Awake)</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(-1);
                }}
                disabled={!startDate}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(1);
                }}
                disabled={!startDate}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {(() => {
                  const awakeEvents = events.filter(e => e.category.toLowerCase() !== 'sleep');
                  if (awakeEvents.length === 0) return '0.00';
                  const avgAwake =
                    awakeEvents.reduce((sum, e) => sum + e.wakefulness, 0) / awakeEvents.length;
                  return avgAwake.toFixed(2);
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-0">
            <CardTitle className="text-sm font-medium">Average Health</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(-1);
                }}
                disabled={!startDate}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  void handleShift(1);
                }}
                disabled={!startDate}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {moodData.length > 0
                  ? (moodData.reduce((sum, d) => sum + d.health, 0) / moodData.length).toFixed(2)
                  : '0.00'}
              </div>
            </div>
          </CardContent>
        </Card>

      <DayOverviewDialog
        open={!!selectedDateKey}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDateKey(null);
          }
        }}
        dateKey={selectedDateKey}
        db={db}
        onPrevDay={() => handleShiftSelectedDay(-1)}
        onNextDay={() => handleShiftSelectedDay(1)}
      />
    </div>
  );
}
