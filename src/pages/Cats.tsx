/**
 * Cats.tsx - Category Time Trends Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { ExocortexDB, ExocortexEvent, IntervalOption } from '@/lib/exocortex';
import { DataExporter } from '@/lib/dataExport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { format, startOfDay } from 'date-fns';
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
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarWithYearNav } from '@/components/CalendarWithYearNav';

const INTERVAL_OPTIONS: IntervalOption[] = ['daily', 'weekly', 'monthly', 'yearly'];
const ZOOM_OPTIONS = [7, 10, 14, 21, 28, 35, 42, 50, 100, 200, 300, 500] as const;

type ZoomOption = (typeof ZOOM_OPTIONS)[number];

type ChartMode = 'lines' | 'stacked';
type CategorySortMode = 'common' | 'alphabetical' | 'recent';

type IntervalUnitLabel = 'days' | 'weeks' | 'months' | 'years';

interface CategoryStats {
  count: number;
  lastUsed: number;
}

function getCategoryColor(
  category: string,
  overrides: ColorOverride[] | undefined,
): string {
  const override = overrides?.find((o) => o.category.trim() === category.trim());
  const hue = override ? override.hue : Math.abs(hashString(category.trim())) % 360;
  return `hsl(${hue}, 80%, 55%)`;
}

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
  canonical: string;
  variants: string[];
  estimatedEventCount: number;
}

const intervalUnitFor = (interval: IntervalOption): IntervalUnitLabel => {
  switch (interval) {
    case 'daily':
      return 'days';
    case 'weekly':
      return 'weeks';
    case 'monthly':
      return 'months';
    case 'yearly':
      return 'years';
  }
};

const Cats = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [events, setEvents] = useState<ExocortexEvent[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [interval, setInterval] = useLocalStorage<IntervalOption>('cats.interval', 'daily');
  const [zoom, setZoom] = useLocalStorage<ZoomOption>('cats.zoom', 28);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergePreviewCount, setMergePreviewCount] = useState<number | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamePreviewCount, setRenamePreviewCount] = useState<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [startDateString, setStartDateString] = useLocalStorage<string | null>(
    'cats.startDate',
    null,
  );
  const [startDate, setStartDateState] = useState<Date | undefined>(undefined);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [hoverBucket, setHoverBucket] = useState<CategoryBucketPoint | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [chartMode, setChartMode] = useLocalStorage<ChartMode>('cats.chartMode', 'lines');
  const [series, setSeries] = useState<CategoryBucketPoint[]>([]);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [similarGroups, setSimilarGroups] = useState<SimilarCategoryGroup[]>([]);
  const [isMergingSimilar, setIsMergingSimilar] = useState(false);

  const [sortMode, setSortMode] = useLocalStorage<CategorySortMode>('cats.sortMode', 'common');

  const [isComputingSeries, setIsComputingSeries] = useState(false);
  const [seriesProgress, setSeriesProgress] = useState<number | null>(null);

  const { config } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  useSeoMeta({
    title: 'Categories - ExocortexLog',
    description: 'Visualize how much time you spend in each category over time.',
  });

  useEffect(() => {
    if (startDateString) {
      const parsed = new Date(`${startDateString}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setStartDateState(startOfDay(parsed));
        return;
      }
    }
    setStartDateState(startOfDay(new Date()));
  }, [startDateString]);

  const setStartDate = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    setStartDateString(key);
    setStartDateState(startOfDay(date));
  };

  useEffect(() => {
    const init = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);

      const allEvents = await database.getAllEvents();
      setEvents(allEvents);

      const statsMap = new Map<string, CategoryStats>();
      for (const ev of allEvents) {
        const key = ev.category.trim();
        const existing = statsMap.get(key);
        if (existing) {
          statsMap.set(key, {
            count: existing.count + 1,
            lastUsed: Math.max(existing.lastUsed, ev.endTime),
          });
        } else {
          statsMap.set(key, {
            count: 1,
            lastUsed: ev.endTime,
          });
        }
      }

      const cats = Array.from(statsMap.keys());
      setAvailableCategories(cats);

      const statsObj: Record<string, CategoryStats> = {};
      for (const [name, st] of statsMap.entries()) {
        statsObj[name] = st;
      }
      setCategoryStats(statsObj);

      try {
        const settings = await database.getSettings();
        if (settings.catsSelectedCategories && settings.catsSelectedCategories.length > 0) {
          setSelectedCategories(settings.catsSelectedCategories);
        } else {
          setSelectedCategories([]);
        }
      } catch (err) {
        console.warn('[Cats] Failed to load settings, falling back to empty selection', err);
        setSelectedCategories([]);
      }

      const dateParam = searchParams.get('date');
      if (dateParam) {
        const parsed = new Date(`${dateParam}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          setStartDate(parsed);
          const params = new URLSearchParams(searchParams);
          params.delete('date');
          setSearchParams(params, { replace: true });
          return;
        }
      }

      if (!startDateString) {
        if (allEvents.length > 0) {
          const first = allEvents[0].endTime;
          setStartDate(new Date(first));
        } else {
          setStartDate(new Date());
        }
      }
    };

    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!db) return;
    void db.updateSettings({ catsSelectedCategories: selectedCategories });
  }, [db, selectedCategories]);

  const displayCategories = useMemo(() => {
    return [...availableCategories].sort((a, b) => {
      const aStats = categoryStats[a];
      const bStats = categoryStats[b];

      if (!aStats && !bStats) return a.localeCompare(b);
      if (!aStats) return 1;
      if (!bStats) return -1;

      switch (sortMode) {
        case 'alphabetical':
          return a.localeCompare(b);
        case 'recent':
          return bStats.lastUsed - aStats.lastUsed;
        case 'common':
        default: {
          if (bStats.count !== aStats.count) {
            return bStats.count - aStats.count;
          }
          return a.localeCompare(b);
        }
      }
    });
  }, [availableCategories, categoryStats, sortMode]);

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

          entry.canonical = canonical;
          const current = entry.variants.get(raw) ?? 0;
          entry.variants.set(raw, current + 1);
        }

        const groups: SimilarCategoryGroup[] = [];
        for (const { canonical, variants } of grouped.values()) {
          if (variants.size <= 1) continue;

          let total = 0;
          const variantList: string[] = [];
          for (const [name, count] of variants.entries()) {
            variantList.push(name);
            total += count;
          }

          groups.push({
            canonical,
            variants: variantList.sort((a, b) => a.localeCompare(b)),
            estimatedEventCount: total,
          });
        }

        if (!controller.signal.aborted) {
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

      const buckets = computeBuckets(startDate, interval, zoom);
      if (buckets.length === 0) {
        setSeries([]);
        return;
      }

      const firstStart = buckets[0].start.getTime();
      const lastEnd = buckets[buckets.length - 1].end.getTime();
      const filteredEvents = events.filter((e) => e.endTime >= firstStart && e.endTime <= lastEnd);
      const includeOther = chartMode === 'stacked';

      setIsComputingSeries(true);
      setSeriesProgress(0);

      const newSeries = await computeCategorySeries(db, buckets, filteredEvents, selectedCategories, {
        includeOther,
      });

      setSeries(newSeries);
      setIsComputingSeries(false);
      setSeriesProgress(null);
    };

    void run();
  }, [db, events, interval, startDate, selectedCategories, chartMode, zoom]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleShift = (direction: 1 | -1) => {
    if (!startDate) return;
    const days = interval === 'daily' ? 7 : interval === 'weekly' ? 7 * 4 : interval === 'monthly' ? 30 * 6 : 365;
    const next = new Date(startDate.getTime() + direction * days * 24 * 60 * 60 * 1000);
    setStartDate(next);
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

  const intervalUnit = intervalUnitFor(interval);

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
            <div className="flex items-center justify-between gap-3 flex-wrap">
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

              <div className="flex items-center gap-2 text-xs">
                <Label
                  htmlFor="category-sort"
                  className="text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  Sort
                </Label>
                <select
                  id="category-sort"
                  className="bg-secondary/70 border border-border rounded-md px-2 py-1 text-xs text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as CategorySortMode)}
                >
                  <option value="common">Common</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="recent">Recent</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {displayCategories.map((cat) => {
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
              {displayCategories.length === 0 && (
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
                  onClick={() => setShowCalendarDialog(true)}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick date'}
                </Button>
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
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zoom</Label>
                <select
                  className="bg-secondary/70 border border-border rounded-md px-3 py-1.5 text-xs text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value) as ZoomOption)}
                >
                  {ZOOM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} {intervalUnit}
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
            {isComputingSeries ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm text-center">
                <div className="h-8 w-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                <div>
                  <div>Compiling category history…</div>
                  <div className="text-xs text-muted-foreground/80 mt-1">
                    This can take a moment for large timelines.
                  </div>
                </div>
                {seriesProgress != null && (
                  <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${Math.max(0, Math.min(100, seriesProgress))}%` }}
                    />
                  </div>
                )}
              </div>
            ) : series.length > 0 && selectedCategories.length > 0 ? (
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

            {hoverBucket && selectedCategories.length > 0 && !isComputingSeries && (
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
        {/* ... dialogs unchanged from previous version ... */}

        {/* Start date picker dialog with year navigation */}
        <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
          <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Choose starting date</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex justify-center">
              <CalendarWithYearNav
                selectedDate={startDate ?? undefined}
                onChange={(date) => {
                  if (date && !isNaN(date.getTime())) {
                    setStartDate(date);
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default Cats;
