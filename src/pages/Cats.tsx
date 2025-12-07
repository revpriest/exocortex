/**
 * Cats.tsx - Category Time Trends Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB, ExocortexEvent, IntervalOption } from '@/lib/exocortex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<string>('');
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

              <div className="flex flex-col gap-2 ml-auto items-end text-right">
                <div className="flex gap-2">
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

                {/* Management section */
                <div className="mt-2 text-xs text-muted-foreground max-w-xs">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="uppercase tracking-wide text-[10px] opacity-80">Manage</span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="h-6 px-2 text-[11px] border-dashed"
                      disabled={selectedCategories.length < 2}
                      onClick={() => {
                        setMergeTarget(selectedCategories[0] ?? '');
                        setIsMergeOpen(true);
                      }}
                    >
                      Merge
                    </Button>
                  </div>
                  <p className="text-[11px] leading-snug">
                    Merge lets you combine two or more categories into one. This permanently
                    rewrites past events.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Merge dialog */}
        <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Merge categories</DialogTitle>
              <DialogDescription>
                Merging categories is <span className="font-semibold text-foreground">permanent</span>.
                Every event in your diary currently labelled with any of the selected
                categories will be changed to use a single replacement category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1">Categories to merge</p>
                {selectedCategories.length > 0 ? (
                  <ul className="list-disc list-inside text-muted-foreground text-sm">
                    {selectedCategories.map((cat) => (
                      <li key={cat}>{cat}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No categories selected. Close this dialog and choose two or more
                    categories first.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="merge-target" className="text-xs uppercase tracking-wide">
                  Replace them with
                </Label>
                <select
                  id="merge-target"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a target category
                  </option>
                  {selectedCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Every instance of the categories above will be replaced by this
                  category name.
                </p>
              </div>

              <div className="rounded-md bg-amber-900/40 border border-amber-700/70 px-3 py-2 text-[11px] text-amber-50 leading-snug">
                This cannot be undone. If you want a backup first, use the Export
                function from the main menu before merging.
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMergeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={selectedCategories.length < 2 || !mergeTarget}
                onClick={async () => {
                  if (!db) return;
                  if (selectedCategories.length < 2 || !mergeTarget) return;

                  // Perform merge: rewrite every matching event category
                  const allEvents = await db.getAllEvents();
                  const mergeSet = new Set(selectedCategories);

                  for (const ev of allEvents) {
                    if (mergeSet.has(ev.category.trim())) {
                      await db.updateEvent(ev.id, {
                        ...ev,
                        category: mergeTarget,
                      });
                    }
                  }

                  // Refresh local state
                  const updatedEvents = await db.getAllEvents();
                  setEvents(updatedEvents);

                  // Rebuild available categories list (it may have changed)
                  const catMap = new Map<string, number>();
                  for (const ev of updatedEvents) {
                    const key = ev.category.trim();
                    catMap.set(key, (catMap.get(key) ?? 0) + 1);
                  }
                  const sortedCats = Array.from(catMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([name]) => name);
                  setAvailableCategories(sortedCats);

                  // Update selection to just the merged target
                  setSelectedCategories([mergeTarget]);

                  setIsMergeOpen(false);
                }}
              >
                Merge these categories
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
      </div>
    </PageLayout>
  );
};

export default Cats;
