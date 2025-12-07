/**
 * Cats.tsx - Category Time Trends Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB, ExocortexEvent, IntervalOption } from '@/lib/exocortex';
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
import { CalendarIcon, ChevronLeft, ChevronRight, Cat, Sparkles } from 'lucide-react';
import { format, isValid, startOfDay } from 'date-fns';
import { computeBuckets, computeCategorySeries } from '@/lib/exocortexBuckets';
import type { CategoryBucketPoint } from '@/lib/exocortex';
import { DayOverviewDialog } from '@/components/DayOverviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const INTERVAL_OPTIONS: IntervalOption[] = ['daily', 'weekly', 'monthly', 'yearly'];

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

const Cats = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [events, setEvents] = useState<ExocortexEvent[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [interval, setInterval] = useState<IntervalOption>('daily');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoverBucket, setHoverBucket] = useState<CategoryBucketPoint | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const { config } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

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
      // Default to nothing selected (user chooses)
      setSelectedCategories([]);

      // Determine initial anchor date
      const dateParam = searchParams.get('date');
      if (dateParam) {
        const parsed = new Date(`${dateParam}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          setStartDate(startOfDay(parsed));
          // Clear the param so re-renders don't keep re-applying it
          const params = new URLSearchParams(searchParams);
          params.delete('date');
          setSearchParams(params, { replace: true });
          return;
        }
      }

      if (allEvents.length > 0) {
        const first = allEvents[0].endTime;
        setStartDate(startOfDay(new Date(first)));
      } else {
        setStartDate(startOfDay(new Date()));
      }
    };

    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { buckets, series } = useMemo(() => {
    if (!startDate) return { buckets: [], series: [] as CategoryBucketPoint[] };
    const buckets = computeBuckets(startDate, interval, 120);
    if (buckets.length === 0) return { buckets, series: [] as CategoryBucketPoint[] };
    const firstStart = buckets[0].start.getTime();
    const lastEnd = buckets[buckets.length - 1].end.getTime();
    const filteredEvents = events.filter((e) => e.endTime >= firstStart && e.endTime <= lastEnd);
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
    const days = interval === 'daily' ? 7 : interval === 'weekly' ? 7 * 4 : interval === 'monthly' ? 30 * 6 : 365;
    const next = new Date(startDate.getTime() + direction * days * 24 * 60 * 60 * 1000);
    setStartDate(startOfDay(next));
  };

  const handleBucketClick = (bucket: CategoryBucketPoint) => {
    const dateKey = bucket.bucketStart.toISOString().split('T')[0];
    setSelectedDateKey(dateKey);
  };

  const handleShiftSelectedDay = (direction: 1 | -1) => {
    if (!selectedDateKey) return;
    const currentDate = new Date(selectedDateKey + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + direction);
    const newKey = currentDate.toISOString().split('T')[0];
    setSelectedDateKey(newKey);
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
              <Cat className="h-6 w-6 text-purple-200" />
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

              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6 ml-auto">
                {/* Management section */}
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Management
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Always open the dialog so the user can see what merge does;
                      // we'll validate the selection inside the dialog itself.
                      setMergeTarget(selectedCategories[0] ?? null);
                      setMergeOpen(true);
                    }}
                    className="text-xs font-medium"
                  >
                    Merge categories…
                  </Button>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground max-w-xs">
                    Choose 2 or more categories above, then merge them into a single one.
                  </p>
                </div>

                <div className="flex gap-2 sm:ml-auto justify-end">
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
                  <LineChart
                    data={series}
                    margin={{ top: 10, right: 16, bottom: 24, left: 0 }}
                    onClick={(state) => {
                      const activeLabel = state?.activeLabel as string | undefined;
                      if (!activeLabel) return;
                      const point = series.find((p) => p.bucketLabel === activeLabel);
                      if (point) {
                        handleBucketClick(point);
                      }
                    }}
                    onMouseMove={(state) => {
                      const activeLabel = state?.activeLabel as string | undefined;
                      if (!activeLabel) {
                        setHoverBucket(null);
                        return;
                      }
                      const point = series.find((p) => p.bucketLabel === activeLabel) || null;
                      setHoverBucket(point);
                    }}
                    onMouseLeave={() => setHoverBucket(null)}
                  >
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

            {/* Hover summary */}
            {hoverBucket && selectedCategories.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-3">
                <span className="font-semibold text-foreground">
                  {hoverBucket.bucketLabel} total:
                </span>
                {selectedCategories.map((cat) => {
                  const value = (hoverBucket[cat] as number | undefined) ?? 0;
                  return (
                    <span key={cat} className="flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: getCategoryColor(cat, config.colorOverrides) }}
                      />
                      {cat}: {value.toFixed(2)} h
                    </span>
                  );
                })}
              </div>
            )}
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

        {/* Merge categories dialog */}
        <AlertDialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge categories</AlertDialogTitle>
              <AlertDialogDescription>
                Merging categories is <span className="font-semibold text-foreground">permanent</span>.
                All diary entries whose category is currently
                {' '}
                <span className="font-semibold">
                  {selectedCategories.join(', ') || '—'}
                </span>
                {' '}
                will be changed so their category becomes the single value you pick below.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label htmlFor="merge-target" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Replace with
                </Label>
                <select
                  id="merge-target"
                  className="w-full bg-secondary/70 border border-border rounded-md px-3 py-1.5 text-sm text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
                  value={mergeTarget ?? ''}
                  onChange={(e) => setMergeTarget(e.target.value || null)}
                  disabled={isMerging}
                >
                  <option value="" disabled>
                    Choose destination category
                  </option>
                  {selectedCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Every event currently filed under any of the selected categories will be
                  rewritten to use the chosen destination category.
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!db || !mergeTarget || isMerging}
                onClick={async (event) => {
                  event.preventDefault();
                  if (!db || !mergeTarget) return;

                  // Require at least two categories to be selected to make the
                  // operation meaningful.
                  if (selectedCategories.length < 2) {
                    return;
                  }

                  try {
                    setIsMerging(true);
                    await db.mergeCategories(selectedCategories, mergeTarget);

                    // Refresh local state so charts & chips update immediately
                    const allEvents = await db.getAllEvents();
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

                    setSelectedCategories([mergeTarget]);
                    setMergeOpen(false);
                  } finally {
                    setIsMerging(false);
                  }
                }}
              >
                {isMerging ? 'Merging…' : 'Merge these categories'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
};

export default Cats;
