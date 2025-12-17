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
  const [interval, setInterval] = useLocalStorage<IntervalOption>(
    'cats.interval',
    'daily',
  );
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

  const [sortMode, setSortMode] = useLocalStorage<CategorySortMode>(
    'cats.sortMode',
    'common',
  );

  const [isComputingSeries, setIsComputingSeries] = useState(false);
  const [seriesProgress, setSeriesProgress] = useState<number | null>(null);

  const { config } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  useSeoMeta({
    title: 'Categories - ExocortexLog',
    description: 'Visualize how much time you spend in each category over time.',
  });

  // Keep derived Date in sync with persisted string
  useEffect(() => {
    if (startDateString) {
      const parsed = new Date(`${startDateString}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setStartDateState(startOfDay(parsed));
        return;
      }
    }
    // Fallback to today until init() sets a better date
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

      // Restore last-used category selection from DB if available
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

      // Determine initial anchor date
      const dateParam = searchParams.get('date');
      if (dateParam) {
        const parsed = new Date(`${dateParam}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          setStartDate(parsed);
          // Clear the param so re-renders don't keep re-applying it
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

  // Persist selectedCategories into DB whenever they change
  useEffect(() => {
    if (!db) return;
    void db.updateSettings({ catsSelectedCategories: selectedCategories });
  }, [db, selectedCategories]);

  // Sorted view of categories based on current sort mode
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
      {/* ...rest of JSX unchanged from previous commit... */}
    </PageLayout>
  );
};

export default Cats;
