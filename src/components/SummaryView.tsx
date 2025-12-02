// SummaryView.tsx - Event summary and collapsed events view

import React, { useEffect, useState } from 'react';
import { ExocortexEvent, ExocortexDB, getEventColor, formatTime } from '@/lib/exocortex';
import { Card, CardContent } from '@/components/ui/card';
import { SmileyFace } from '@/components/SmileyFace';
import { ExocortexHeader } from '@/components/ExocortexHeader';
import { Button } from '@/components/ui/button';

interface SummaryRow {
  collapsed: boolean; // true if representing a collapsed group
  categories: string[];
  events: ExocortexEvent[];
}

export function SummaryView({ className }: { className?: string }) {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [eventRows, setEventRows] = useState<SummaryRow[]>([]);
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup DB and fetch events on mount
  useEffect(() => {
    const init = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);
      await loadEventRows(database);
      setLoading(false);
    };
    init();
  }, []);

  // Group events for summary presentation
  async function loadEventRows(database: ExocortexDB) {
    // Fetch all events (for now, past 60 days)
    const now = new Date();
    const rangeStart = new Date();
    rangeStart.setDate(now.getDate() - 60);
    let allEvents: ExocortexEvent[] = [];
    let current = new Date(rangeStart);
    while (current <= now) {
      const evs = await database.getEventsByDate(current.toISOString().split('T')[0]);
      allEvents.push(...evs);
      current.setDate(current.getDate() + 1);
    }
    // Sort chronologically
    allEvents.sort((a, b) => a.endTime - b.endTime);
    // Now build summary rows.
    const rows: SummaryRow[] = [];
    let group: ExocortexEvent[] = [];
    for (const event of allEvents) {
      if (event.notes && event.notes.trim()) {
        // Previous group?
        if (group.length > 0) {
          rows.push({
            collapsed: true,
            categories: Array.from(new Set(group.map(e => e.category))),
            events: [...group],
          });
          group = [];
        }
        rows.push({
          collapsed: false,
          categories: [event.category],
          events: [event],
        });
      } else {
        group.push(event);
      }
    }
    if (group.length > 0) {
      rows.push({
        collapsed: true,
        categories: Array.from(new Set(group.map(e => e.category))),
        events: [...group],
      });
    }
    setEventRows(rows);
  }

  function handleToggleExpand(idx: number) {
    setExpandedIndexes(expanded =>
      expanded.includes(idx) ? expanded.filter(i => i !== idx) : [...expanded, idx]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading summary…</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <ExocortexHeader title="Summary" />
      <Card className="overflow-x-auto">
        <CardContent className="py-6">
          <div className="space-y-4">
            {eventRows.map((row, idx) => (
              <div key={idx} className="border-b pb-4 last:border-b-0 last:pb-0">
                {row.collapsed && !expandedIndexes.includes(idx) ? (
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleExpand(idx)} className="px-3">
                      Show {row.events.length} events
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Categories: {row.categories.join(', ')}
                    </span>
                  </div>
                ) : row.collapsed && expandedIndexes.includes(idx) ? (
                  <div>
                    <div className="flex items-center gap-4 mb-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleExpand(idx)} className="px-3">
                        Hide {row.events.length} events
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Categories: {row.categories.join(', ')}
                      </span>
                    </div>
                    <div className="pl-4 flex flex-col gap-2">
                      {row.events.map(ev => (
                        <SummaryNoteEvent key={ev.id} event={ev} />
                      ))}
                    </div>
                  </div>
                ) : (
                  // Not collapsed (regular row: has notes)
                  row.events.map(ev => <SummaryNoteEvent key={ev.id} event={ev} />)
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryNoteEvent({ event }: { event: ExocortexEvent }) {
  return (
    <div className="py-2 flex items-center gap-5 border border-border rounded-lg bg-card/40 shadow-sm px-4 mb-2">
      <div className="flex items-center gap-2 min-w-fit">
        <div className="w-8 h-8">
          <SmileyFace
            health={event.health}
            wakefulness={event.wakefulness}
            happiness={event.happiness}
            size={32}
          />
        </div>
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: getEventColor(event), color: '#fff' }}>
          {event.category}
        </span>
      </div>
      <div className="flex flex-col text-sm">
        <span className="font-semibold">{formatTime(event.endTime)}</span>
        {event.notes && <span className="text-xs text-muted-foreground">{event.notes}</span>}
      </div>
    </div>
  );
}
