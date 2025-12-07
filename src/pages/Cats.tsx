/**
 * Cats.tsx - Category Time Trends Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB, ExocortexEvent } from '@/lib/exocortex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { ColorOverride } from '@/contexts/AppContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CalendarIcon, ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { addDays, addMonths, endOfDay, format, isValid, startOfDay } from 'date-fns';

const INTERVAL_OPTIONS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export type IntervalOption = (typeof INTERVAL_OPTIONS)[number];

interface CategoryPoint {
  bucketLabel: string;
  bucketStart: Date;
  bucketEnd: Date;
  [category: string]: string | number | Date;
}

function getCategoryColor(
  category: string,
  overrides: ColorOverride[] | undefined,
): string {
  // Reuse getEventColor hue logic: we only care about hue override
  const override = overrides?.find((o) => o.category.trim() === category.trim());
  const hue = override ? override.hue : Math.abs(hashString(category.trim())) % 360;
  return `hsl(${hue}, 80%, 55%)`;
}

// lightweight hash mirroring lib/hashString to avoid circular import
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function computeBuckets(
  start: Date,
  interval: IntervalOption,
  bucketCount = 60,
): { buckets: { start: Date; end: Date; label: string }[] } {
  const buckets: { start: Date; end: Date; label: string }[] = [];
  let cursor = startOfDay(start);

  const advance = (date: Date): Date => {
    switch (interval) {
      case 'daily':
        return addDays(date, 1);
      case 'weekly':
        return addDays(date, 7);
      case 'monthly':
        return addMonths(date, 1);
      case 'yearly':
        return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    }
  };

  for (let i = 0; i < bucketCount; i++) {
    const startAt = cursor;
    const endAt = endOfDay(advance(cursor));
    let label: string;
    switch (interval) {
      case 'daily':
        label = format(startAt, 'MMM d');
        break;
      case 'weekly':
        label = format(startAt, 'yyyy-MM-dd');
        break;
      case 'monthly':
        label = format(startAt, 'MMM yyyy');
        break;
      case 'yearly':
        label = format(startAt, 'yyyy');
        break;
    }
    buckets.push({ start: startAt, end: endAt, label });
    cursor = advance(cursor);
  }

  return { buckets };
}

function computeCategorySeries(
  buckets: { start: Date; end: Date; label: string }[],
  events: ExocortexEvent[],
  categories: string[],
): CategoryPoint[] {
  if (events.length === 0 || categories.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.endTime - b.endTime);

  // Infer durations between events; first event gets duration from window start or previous day midnight is handled at DB query level
  const points: CategoryPoint[] = buckets.map((b) => ({
    bucketLabel: b.label,
    bucketStart: b.start,
    bucketEnd: b.end,
  }));

  for (const bucket of buckets) {
    for (const cat of categories) {
      const point = points.find((p) => p.bucketLabel === bucket.label)!;
      if (point[cat] == null) point[cat] = 0;
    }
  }

  const bucketCount = buckets.length;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prevEnd = i === 0 ? current.endTime - 60 * 60 * 1000 : sorted[i - 1].endTime;

    let segStart = prevEnd;
    let segEnd = current.endTime;
    if (segEnd <= segStart) continue;

    // Clip each event segment into buckets
    for (let b = 0; b < bucketCount; b++) {
      const bucket = buckets[b];
      const overlapStart = Math.max(segStart, bucket.start.getTime());
      const overlapEnd = Math.min(segEnd, bucket.end.getTime());
      if (overlapEnd <= overlapStart) continue;

      const hours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
      const point = points[b];
      const catKey = current.category;
      point[catKey] = ((point[catKey] as number | undefined) ?? 0) + hours;
    }
  }

  return points;
}

const Cats = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [events, setEvents] = useState<ExocortexEvent[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [interval, setInterval] = useState<IntervalOption>('daily');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);

  const { config } = useAppContext();

  useSeoMeta({
    title: 'Categories - ExocortexLog',
    description: 'Visualize how much time you spend in each category over time.',
  });

  useEffect(() => {
    const init = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);

      const allEvents = await database.getAllEvents();
      setEvents(allEvents);

      const catMap = new Map<string, number>();
      for (const ev of allEvents) {
        const key = ev.category.trim();
        catMap.set(key, (catMap.get(key) ?? 0) + 1);
      }
      const sortedCats = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
      setAvailableCategories(sortedCats);
      setSelectedCategories(sortedCats.slice(0, 3));

      if (allEvents.length > 0) {
        const first = allEvents[0].endTime;
        setStartDate(startOfDay(new Date(first)));
      } else {
        setStartDate(startOfDay(new Date()));
      }
    };

    void init();
  }, []);

  const { buckets, series } = useMemo(() => {
    if (!startDate) return { buckets: [], series: [] as CategoryPoint[] };
    const { buckets } = computeBuckets(startDate, interval, 120);
    const filteredEvents = events.filter((e) => e.endTime >= buckets[0]?.start.getTime() && e.endTime <= buckets[buckets.length - 1]?.end.getTime());
    const series = computeCategorySeries(buckets, filteredEvents, selectedCategories);
    return { buckets, series };
  }, [events, interval, startDate, selectedCategories]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleShift = (direction: 1 | -1) => {
    if (!startDate) return;
    let next: Date;
    switch (interval) {
      case 'daily':
        next = addDays(startDate, direction * 7);
        break;
      case 'weekly':
        next = addDays(startDate, direction * 7 * 4);
        break;
      case 'monthly':
        next = addMonths(startDate, direction * 6);
        break;
      case 'yearly':
        next = new Date(startDate.getFullYear() + direction, startDate.getMonth(), startDate.getDate());
        break;
    }
    setStartDate(startOfDay(next));
  };

  return (
    <PageLayout
      db={db}
      title="Cats"
      explain="Category time trends"
      currentView="cats"
    >
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-900/60 via-sky-900/50 to-emerald-900/60 border-border shadow-lg shadow-purple-900/40">
          <CardHeader className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Layers className="h-6 w-6 text-purple-200" />
              <div>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  Category Highlights
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pick one or more categories to follow across time.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {availableCategories.map((cat) => {
                const selected = selectedCategories.includes(cat);
                const color = getCategoryColor(cat, config.colorOverrides);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all shadow-sm backdrop-blur-sm ${
                      selected
                        ? 'border-transparent text-black'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                    style={selected ? { background: color } : { background: 'rgba(15,23,42,0.6)' }}
                  >
                    {cat}
                  </button>
                );
              })}
              {availableCategories.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No categories yet – add some events first.
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-2 border-t border-border/60 mt-2">
            <div className="flex flex-wrap gap-4 items-end justify-between">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start at</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary/70 border-border text-secondary-foreground font-normal"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick date'}
                </Button>
                {showCalendar && (
                  <div className="mt-2 rounded-lg border border-border bg-popover shadow-xl p-2 z-40">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setShowCalendar(false);
                        if (!date || !isValid(date)) return;
                        setStartDate(startOfDay(date));
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Interval</Label>
                <select
                  className="bg-secondary/70 border border-border rounded-md px-3 py-1.5 text-xs text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value as IntervalOption)}
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleShift(-1)}
                  disabled={!startDate}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleShift(1)}
                  disabled={!startDate}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Time spent per category
              <span className="text-[11px] font-normal text-muted-foreground">
                (hours per {interval})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {series.length > 0 && selectedCategories.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 10, right: 16, bottom: 24, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="bucketLabel"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      label={{
                        value: 'Hours',
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'hsl(var(--muted-foreground))',
                        offset: 10,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(2)} h`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                    {selectedCategories.map((cat) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        name={cat}
                        stroke={getCategoryColor(cat, config.colorOverrides)}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm text-center">
                Choose one or more categories above to see how your time weaves between them.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Cats;
