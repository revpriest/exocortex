/**
 * Cats.tsx - Category Time Trends Page
 */

import React, { useEffect, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB, ExocortexEvent, IntervalOption } from '@/lib/exocortex';
import { DataExporter } from '@/lib/dataExport';
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
  AreaChart,
  Area,
} from 'recharts';
import { CalendarIcon, ChevronLeft, ChevronRight, Cat } from 'lucide-react';
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

type ChartMode = 'lines' | 'stacked';

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

function isSleepCategory(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === 'sleep';
}

const OTHER_KEY = '__other__';

interface SimilarCategoryGroup {
  /** The canonical, headline-cased category that similar entries will be merged into. */
  canonical: string;
  /** All raw category values (as they currently appear in the DB) that map to this canonical name. */
  variants: string[];
  /** Approximate number of events that would be touched by merging this group. */
  estimatedEventCount: number;
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
  const [mergePreviewCount, setMergePreviewCount] = useState<number | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamePreviewCount, setRenamePreviewCount] = useState<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoverBucket, setHoverBucket] = useState<CategoryBucketPoint | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('lines');
  const [series, setSeries] = useState<CategoryBucketPoint[]>([]);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [similarGroups, setSimilarGroups] = useState<SimilarCategoryGroup[]>([]);
  const [isMergingSimilar, setIsMergingSimilar] = useState(false);

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

  // Live preview count for merge: whenever the dialog is open and categories
  // change, estimate how many events will be touched.
  useEffect(() => {
    if (!db || !mergeOpen || selectedCategories.length === 0) {
      setMergePreviewCount(null);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        const all = await db.getAllEvents();
        const targets = new Set(selectedCategories.map((c) => c.trim()));
        const count = all.filter((ev) => targets.has(ev.category.trim())).length;
        if (!controller.signal.aborted) {
          setMergePreviewCount(count);
        }
      } catch {
        if (!controller.signal.aborted) {
          setMergePreviewCount(null);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [db, mergeOpen, selectedCategories]);

  // Live preview count for rename: whenever the dialog is open and a single
  // category is selected, estimate how many events will be renamed.
  useEffect(() => {
    if (!db || !renameOpen || selectedCategories.length !== 1) {
      setRenamePreviewCount(null);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        const all = await db.getAllEvents();
        const target = selectedCategories[0]?.trim() ?? '';
        const count = all.filter((ev) => ev.category.trim() === target).length;
        if (!controller.signal.aborted) {
          setRenamePreviewCount(count);
        }
      } catch {
        if (!controller.signal.aborted) {
          setRenamePreviewCount(null);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [db, renameOpen, selectedCategories]);

  // When the "merge similar" dialog is opened, build a preview of all
  // groups of categories that only differ by case or surrounding whitespace.
  useEffect(() => {
    if (!db || !similarOpen) {
      setSimilarGroups([]);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        const all = await db.getAllEvents();
        if (controller.signal.aborted) return;

        const grouped = new Map<string, { canonical: string; variants: Map<string, number> }>();

        for (const ev of all) {
          const raw = ev.category ?? '';
          const trimmed = raw.trim();
          if (!trimmed) continue;

          const key = raw.toLocaleLowerCase();
          const canonical = `${trimmed.charAt(0).toLocaleUpperCase()}${trimmed
            .toLocaleLowerCase()}`;

          let entry = grouped.get(key);
          if (!entry) {
            entry = { canonical, variants: new Map<string, number>() };
            grouped.set(key, entry);
          }

          entry.canonical = canonical; // last write wins but all forms produce same canonical
          const current = entry.variants.get(raw) ?? 0;
          entry.variants.set(raw, current + 1);
        }

        const groups: SimilarCategoryGroup[] = [];
        for (const { canonical, variants } of grouped.values()) {
          if (variants.size <= 1) continue; // Nothing to merge, only one spelling

          let total = 0;
          const variantList: string[] = [];
          for (const [name, count] of variants.entries()) {
            variantList.push(name);
            total += count;
          }

          // Treat any normalised key that has multiple raw spellings as a
          // merge candidate — this is exactly the case of stray whitespace
          // and weird capitalisation like "Slack" vs "slack ".
          groups.push({
            canonical,
            variants: variantList.sort((a, b) => a.localeCompare(b)),
            estimatedEventCount: total,
          });
        }

        if (!controller.signal.aborted) {
          // Sort groups alphabetically by canonical name for stable UI
          groups.sort((a, b) => a.canonical.localeCompare(b.canonical));
          setSimilarGroups(groups);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSimilarGroups([]);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [db, similarOpen]);

  useEffect(() => {
    const run = async () => {
      if (!db || !startDate) {
        setSeries([]);
        return;
      }

      const buckets = computeBuckets(startDate, interval, 120);
      if (buckets.length === 0) {
        setSeries([]);
        return;
      }

      const firstStart = buckets[0].start.getTime();
      const lastEnd = buckets[buckets.length - 1].end.getTime();
      const filteredEvents = events.filter((e) => e.endTime >= firstStart && e.endTime <= lastEnd);
      const includeOther = chartMode === 'stacked';

      const newSeries = await computeCategorySeries(db, buckets, filteredEvents, selectedCategories, {
        includeOther,
      });

      setSeries(newSeries);
    };

    void run();
  }, [db, events, interval, startDate, selectedCategories, chartMode]);

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
    const dateKey = (bucket.bucketStart as Date).toISOString().split('T')[0];
    setSelectedDateKey(dateKey);
  };

  const handleShiftSelectedDay = (direction: 1 | -1) => {
    if (!selectedDateKey) return;
    const currentDate = new Date(selectedDateKey + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + direction);
    const newKey = currentDate.toISOString().split('T')[0];
    setSelectedDateKey(newKey);
  };

  const showStackedLegendOther = chartMode === 'stacked' && selectedCategories.length > 0;

  const handleMergeSimilarConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!db || isMergingSimilar || similarGroups.length === 0) return;

    try {
      setIsMergingSimilar(true);
      await db.mergeSimilarCategories();

      const all = await db.getAllEvents();
      setEvents(all);

      const catCounts = new Map<string, number>();
      for (const ev of all) {
        const key = ev.category.trim();
        catCounts.set(key, (catCounts.get(key) ?? 0) + 1);
      }
      const sorted = Array.from(catCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
      setAvailableCategories(sorted);

      setSimilarOpen(false);
    } finally {
      setIsMergingSimilar(false);
    }
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

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
                <div className="inline-flex rounded-md border border-border bg-secondary/70 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartMode('lines')}
                    className={`px-3 py-1 rounded-sm transition-colors ${
                      chartMode === 'lines'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-secondary-foreground hover:bg-secondary/60'
                    }`}
                    aria-pressed={chartMode === 'lines'}
                  >
                    Separate lines
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('stacked')}
                    className={`px-3 py-1 rounded-sm transition-colors ${
                      chartMode === 'stacked'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-secondary-foreground hover:bg-secondary/60'
                    }`}
                    aria-pressed={chartMode === 'stacked'}
                  >
                    Stacked totals
                  </button>
                </div>
              </div>

              <div className="flex gap-2 ml-auto justify-end">
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
                  {chartMode === 'lines' ? (
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
                          name === OTHER_KEY ? 'Other' : name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value) => (value === OTHER_KEY ? 'Other' : (value as string))}
                      />
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
                  ) : (
                    <AreaChart
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
                          name === OTHER_KEY ? 'Other' : name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value) => (value === OTHER_KEY ? 'Other' : (value as string))}
                      />
                      {selectedCategories.map((cat) => (
                        <Area
                          key={cat}
                          type="monotone"
                          dataKey={cat}
                          name={cat}
                          stackId="time"
                          stroke={getCategoryColor(cat, config.colorOverrides)}
                          fill={getCategoryColor(cat, config.colorOverrides)}
                          fillOpacity={0.5}
                        />
                      ))}
                      {showStackedLegendOther && (
                        <Area
                          type="monotone"
                          dataKey={OTHER_KEY}
                          name={OTHER_KEY}
                          stackId="time"
                          stroke="hsl(var(--border))"
                          fill="hsl(var(--border))"
                          fillOpacity={0.3}
                        />
                      )}
                    </AreaChart>
                  )}
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
                {chartMode === 'stacked' && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-border" />
                    Other: {(((hoverBucket as Record<string, number>)[OTHER_KEY] ?? 0)).toFixed(2)} h
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Management / category tools card */}
        <Card className="bg-card/80 border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Management
              <span className="text-[11px] font-normal text-muted-foreground">
                Tools for tidying up your categories
              </span>
            </CardTitle>
            <div className="mt-2 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-foreground">Export database first</div>
                  <p className="text-[11px] text-muted-foreground max-w-xl mt-1">
                    We strongly recommend exporting a backup of your data before editing
                    categories, mistakes happen. These actions are serious with no undo. Backups matter.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!db}
                  onClick={async () => {
                    if (!db) return;
                    try {
                      await DataExporter.exportDatabase(db);
                    } catch (error) {
                      console.error('Quick export failed from Cats page:', error);
                    }
                  }}
                  className="whitespace-nowrap"
                >
                  Export backup now
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="pt-3 border-t border-border/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-foreground">Merge categories</div>
                  <p className="text-[11px] text-muted-foreground max-w-xl mt-1">
                    Combine two or more existing categories into a single one. Every event tagged
                    with any of the selected categories will be updated to use the destination
                    category you choose.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedCategories.length < 2}
                  onClick={() => {
                    setMergeTarget(selectedCategories[0] ?? null);
                    setMergePreviewCount(null);
                    setMergeOpen(true);
                  }}
                >
                  Open merge dialog
                </Button>
              </div>
              {selectedCategories.length < 2 && (
                <p className="mt-2 text-[11px] text-amber-300/80">
                  Select at least two categories above to perform a merge.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-foreground">Rename category</div>
                  <p className="text-[11px] text-muted-foreground max-w-xl mt-1">
                    Give a single category a new name. Every event currently using that category
                    will be updated to use the new name.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedCategories.length !== 1}
                  onClick={() => {
                    setRenameValue(selectedCategories[0] ?? '');
                    setRenamePreviewCount(null);
                    setRenameOpen(true);
                  }}
                >
                  Rename selected category
                </Button>
              </div>
              {selectedCategories.length !== 1 && (
                <p className="mt-2 text-[11px] text-amber-300/80">
                  Select exactly one category above to enable renaming.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-foreground">Merge similar cats</div>
                  <p className="text-[11px] text-muted-foreground max-w-xl mt-1">
                    Combine all categories whose names only differ by capitalisation or
                    whitespace. The merged category name will use headline case, with leading
                    and trailing spaces stripped.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!db}
                  onClick={() => setSimilarOpen(true)}
                >
                  Merge Similar Cats
                </Button>
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

        {/* Merge categories dialog */}
        <AlertDialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge categories</AlertDialogTitle>
              <AlertDialogDescription>
                Merging categories is <span className="font-semibold text-foreground">permanent</span>.
                All diary entries whose category is currently{' '}
                <span className="font-semibold">
                  {selectedCategories.join(', ') || '—'}
                </span>{' '}
                will be changed so their category becomes the single value you pick below.
              </AlertDialogDescription>
              {selectedCategories.some((c) => isSleepCategory(c)) && mergeTarget &&
                !isSleepCategory(mergeTarget) && (
                  <p className="mt-2 text-[11px] text-amber-300/90">
                    Warning: "Sleep" is a special category used for sleep/non-sleep
                    calculations. Merging it into a different name will break those
                    statistics. You can still do this if you really want to.
                  </p>
                )}
            </AlertDialogHeader>

            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label
                  htmlFor="merge-target"
                  className="text-xs uppercase tracking-wide text-muted-foreground"
                >
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
                {mergePreviewCount != null && (
                  <p className="text-[11px] text-muted-foreground">
                    This will update{' '}
                    <span className="font-semibold text-foreground">{mergePreviewCount}</span>{' '}
                    events.
                  </p>
                )}
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
                    const all = await db.getAllEvents();
                    setEvents(all);

                    const catCounts = new Map<string, number>();
                    for (const ev of all) {
                      const key = ev.category.trim();
                      catCounts.set(key, (catCounts.get(key) ?? 0) + 1);
                    }
                    const sorted = Array.from(catCounts.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([name]) => name);
                    setAvailableCategories(sorted);

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

        {/* Rename category dialog */}
        <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rename category</AlertDialogTitle>
              <AlertDialogDescription>
                Renaming a category is{' '}
                <span className="font-semibold text-foreground">permanent</span>. Every diary
                entry currently using the selected category will be updated to use the new name
                you type below.
              </AlertDialogDescription>
              {isSleepCategory(selectedCategories[0]) && !isSleepCategory(renameValue) && (
                <p className="mt-2 text-[11px] text-amber-300/90">
                  Warning: "Sleep" is a special category used for sleep/non-sleep calculations.
                  Renaming it will break those statistics. You can still do this if you really
                  want to.
                </p>
              )}
            </AlertDialogHeader>

            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label
                  htmlFor="rename-category"
                  className="text-xs uppercase tracking-wide text-muted-foreground"
                >
                  New name
                </Label>
                <input
                  id="rename-category"
                  type="text"
                  className="w-full bg-secondary/70 border border-border rounded-md px-3 py-1.5 text-sm text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  disabled={isRenaming}
                  placeholder={selectedCategories[0] ?? ''}
                />
                <p className="text-[11px] text-muted-foreground">
                  This will change the category name on every event that currently uses
                  "{selectedCategories[0] ?? '—'}".
                </p>
                {renamePreviewCount != null && (
                  <p className="text-[11px] text-muted-foreground">
                    This will update{' '}
                    <span className="font-semibold text-foreground">{renamePreviewCount}</span>{' '}
                    events.
                  </p>
                )}
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRenaming}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={
                  !db ||
                  isRenaming ||
                  selectedCategories.length !== 1 ||
                  !renameValue.trim() ||
                  renameValue.trim() === (selectedCategories[0]?.trim() ?? '')
                }
                onClick={async (event) => {
                  event.preventDefault();
                  if (!db || selectedCategories.length !== 1) return;

                  const original = selectedCategories[0];
                  const nextName = renameValue.trim();
                  if (!nextName || nextName === original.trim()) return;

                  try {
                    setIsRenaming(true);

                    await db.renameCategory(original, nextName);

                    // Refresh events and categories
                    const all = await db.getAllEvents();
                    setEvents(all);

                    const catCounts = new Map<string, number>();
                    for (const ev of all) {
                      const key = ev.category.trim();
                      catCounts.set(key, (catCounts.get(key) ?? 0) + 1);
                    }
                    const sorted = Array.from(catCounts.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([name]) => name);
                    setAvailableCategories(sorted);

                    setSelectedCategories([nextName]);
                    setRenameOpen(false);
                  } finally {
                    setIsRenaming(false);
                  }
                }}
              >
                {isRenaming ? 'Renaming…' : 'Rename this category'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Merge similar cats dialog */}
        <AlertDialog open={similarOpen} onOpenChange={setSimilarOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge similar cats</AlertDialogTitle>
              <AlertDialogDescription>
                This will combine categories that only differ by capitalisation or
                whitespace. Each group below will be merged into the headline-cased version
                of its name. This operation is{' '}
                <span className="font-semibold text-foreground">permanent</span> and cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-3 max-h-64 overflow-y-auto space-y-3 pr-1 text-sm">
              {similarGroups.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No categories were found that only differ by capitalisation or whitespace.
                </p>
              ) : (
                similarGroups.map((group) => (
                  <div
                    key={group.canonical}
                    className="rounded-md border border-border/70 bg-secondary/40 px-3 py-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {group.canonical}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Will merge:{' '}
                          <span className="font-medium text-foreground">
                            {group.variants.join(', ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                        ~{group.estimatedEventCount} events
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isMergingSimilar}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!db || isMergingSimilar || similarGroups.length === 0}
                onClick={handleMergeSimilarConfirm}
              >
                {isMergingSimilar ? 'Merging…' : 'Merge Similar Cats'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
};

export default Cats;
