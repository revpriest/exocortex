import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExocortexDB, ExocortexEvent } from '@/lib/exocortex';

export interface DayStatsSummary {
  dateKey: string;
  avgHappiness: number | null;
  avgHealth: number | null;
  avgWakefulnessAwake: number | null;
  sleepHours: number;
  notes: string[];
}

export interface DayOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Date key (yyyy-MM-dd) for the selected day. */
  dateKey: string | null;
  /** Database instance for loading stats directly. */
  db: ExocortexDB | null;
}

const formatPercent = (value: number | null): string =>
  value == null ? '—' : `${(value * 100).toFixed(0)}%`;

const formatHours = (value: number): string => `${value.toFixed(1)} h`;

function computeDayStats(events: ExocortexEvent[], dateKey: string): DayStatsSummary {
  if (events.length === 0) {
    return {
      dateKey,
      avgHappiness: null,
      avgHealth: null,
      avgWakefulnessAwake: null,
      sleepHours: 0,
      notes: [],
    };
  }

  let happinessSum = 0;
  let healthSum = 0;
  let count = 0;

  let awakeWakefulnessSum = 0;
  let awakeCount = 0;

  let sleepHours = 0;
  const notes: string[] = [];

  const sorted = [...events].sort((a, b) => a.endTime - b.endTime);

  sorted.forEach((event, index) => {
    const durationMinutes = (() => {
      if (index === 0) {
        const end = event.endTime;
        const endDate = new Date(end);
        const dayStart = new Date(endDate);
        dayStart.setHours(0, 0, 0, 0);
        const diff = (endDate.getTime() - dayStart.getTime()) / (1000 * 60);
        return Math.max(60, diff);
      }
      const prevEnd = sorted[index - 1].endTime;
      return Math.max(15, (event.endTime - prevEnd) / (1000 * 60));
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

  return {
    dateKey,
    avgHappiness: count > 0 ? happinessSum / count : null,
    avgHealth: count > 0 ? healthSum / count : null,
    avgWakefulnessAwake: awakeCount > 0 ? awakeWakefulnessSum / awakeCount : null,
    sleepHours,
    notes,
  };
}

export function DayOverviewDialog({ open, onOpenChange, dateKey, db }: DayOverviewDialogProps) {
  const navigate = useNavigate();

  const [stats, setStats] = React.useState<DayStatsSummary | null>(null);

  const loadStatsFor = React.useCallback(
    async (key: string | null, database: ExocortexDB | null) => {
      if (!key || !database) {
        setStats(null);
        return;
      }
      const events = await database.getEventsByDate(key);
      setStats(computeDayStats(events, key));
    },
    [],
  );

  React.useEffect(() => {
    void loadStatsFor(dateKey, db);
  }, [dateKey, db, loadStatsFor]);

  const formattedSelectedDate = dateKey
    ? new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleOpenGrid = () => {
    if (!dateKey) return;
    navigate({ pathname: '/', search: `?date=${dateKey}` });
  };

  const handleOpenSummary = () => {
    if (!dateKey) return;
    navigate({ pathname: '/summary', search: `?date=${dateKey}` });
  };

  const handleOpenStats = () => {
    if (!dateKey) return;

    const day = new Date(dateKey + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
    const clamped = Math.max(0, Math.min(diffDays, 27));

    const start = new Date(day);
    start.setDate(start.getDate() - clamped + 1);

    const startParam = format(start, 'yyyy-MM-dd');
    const daysParam = (clamped + 1).toString();

    navigate({ pathname: '/stats', search: `?start=${startParam}&days=${daysParam}` });
  };

  const handlePrevDay = () => {
    if (!dateKey || !db) return;
    const d = new Date(dateKey + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const prevKey = d.toISOString().split('T')[0];
    void loadStatsFor(prevKey, db);
  };

  const handleNextDay = () => {
    if (!dateKey || !db) return;
    const d = new Date(dateKey + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const nextKey = d.toISOString().split('T')[0];
    void loadStatsFor(nextKey, db);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Mood details for {formattedSelectedDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Navigation between nearby days */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Browse nearby days</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevDay}
                disabled={!dateKey || !db}
              >
                ◀
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextDay}
                disabled={!dateKey || !db}
              >
                ▶
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Average happiness</div>
              <div className="font-semibold">{formatPercent(stats?.avgHappiness ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Average health</div>
              <div className="font-semibold">{formatPercent(stats?.avgHealth ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Average wakefulness (awake)</div>
              <div className="font-semibold">{formatPercent(stats?.avgWakefulnessAwake ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Sleep duration</div>
              <div className="font-semibold">{stats ? formatHours(stats.sleepHours) : '—'}</div>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-sm font-medium mb-1">Notes</div>
            {stats && stats.notes.length > 0 ? (
              <ScrollArea className="max-h-48 rounded-md border border-border bg-background/60 p-3 text-sm space-y-2">
                {stats.notes.map((note, idx) => (
                  <div key={idx} className="p-2 rounded bg-muted/60 text-muted-foreground">
                    {note}
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground">No notes recorded for this day.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border mt-4">
            <Button variant="outline" size="sm" onClick={handleOpenGrid}>
              Open in Grid view
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenSummary}>
              Open in Summary view
            </Button>
            <Button variant="default" size="sm" onClick={handleOpenStats}>
              Open in Stats view
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
