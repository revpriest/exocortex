import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  stats: DayStatsSummary | null;
}

const formatPercent = (value: number | null): string =>
  value == null ? '—' : `${(value * 100).toFixed(0)}%`;

const formatHours = (value: number): string => `${value.toFixed(1)} h`;

export function DayOverviewDialog({ open, onOpenChange, stats }: DayOverviewDialogProps) {
  const navigate = useNavigate();

  const formattedSelectedDate = stats?.dateKey
    ? new Date(stats.dateKey + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleOpenGrid = () => {
    if (!stats?.dateKey) return;
    navigate({ pathname: '/', search: `?date=${stats.dateKey}` });
  };

  const handleOpenSummary = () => {
    if (!stats?.dateKey) return;
    navigate({ pathname: '/summary', search: `?date=${stats.dateKey}` });
  };

  const handleOpenStats = () => {
    if (!stats?.dateKey) return;

    const day = new Date(stats.dateKey + 'T00:00:00');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Mood details for {formattedSelectedDate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
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
