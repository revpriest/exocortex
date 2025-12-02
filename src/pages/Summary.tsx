/**
 * Summary.tsx - Summary Page
 *
 * Visual summary of recent events. Collapses consecutive non-notable (no notes) events into a summary row;
 * those with notes are shown individually. Expand group to see individuals. Provides skip-to-date via PageLayout.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExocortexDB, ExocortexEvent, getEventColor, formatTime, DayEvents } from '@/lib/exocortex';
import { SmileyFace } from '@/components/SmileyFace';
import { useAppContext } from '@/hooks/useAppContext';

// How many days of data to summarize?
const SUMMARY_DAYS = 30;

// Helper: collapse consecutive non-noted events into groups
function makeSummaryRows(events: ExocortexEvent[]) {
  const rows = [];
  let group: ExocortexEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev.notes) {
      group.push(ev);
    } else {
      if (group.length > 0) {
        rows.push({ type: 'collapsed', events: group });
        group = [];
      }
      rows.push({ type: 'single', event: ev });
    }
  }
  if (group.length > 0) {
    rows.push({ type: 'collapsed', events: group });
  }
  return rows;
}

function compactCats(events: ExocortexEvent[]) {
  // List all distinct categories, truncate to single line string
  const cats = [...new Set(events.map(e => e.category))];
  let label = cats.join(', ');
  if (label.length > 64) {
    label = label.slice(0, 61).replace(/,\s?$/, '') + '…';
  }
  return label;
}

// --- Collapsed row (no-note group) ---
function SummaryCollapsedRow({ events, expanded, onExpand, colorOverrides }: { events: ExocortexEvent[]; expanded: boolean; onExpand: () => void; colorOverrides: any[] }) {
  if (!events || events.length === 0) return null;
  const first = events[0];
  const last = events[events.length - 1];
  // Main category = first event, color matches grid
  const color = getEventColor(first, colorOverrides);
  return (
    <Card className="flex items-center px-0 py-1 mb-2">
      <div className="h-11 w-2 rounded-l-lg" style={{ backgroundColor: color, minWidth: 8 }} />
      <div className="flex-1 flex flex-row items-center pl-4 pr-2 py-2 gap-4 overflow-x-hidden whitespace-nowrap">
        <SmileyFace happiness={first.happiness} wakefulness={first.wakefulness} health={first.health} size={32} className="shrink-0" />
        <div className="grow overflow-x-hidden">
          <span className="text-muted-foreground text-xs mr-3">{formatTime(first.endTime - (events.length > 1 ? (first.endTime - events[0].endTime) : 0))}–{formatTime(last.endTime)}</span>
          <span className="text-sm font-medium">{compactCats(events)}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onExpand} tabIndex={0} className="text-blue-700">Expand ({events.length})</Button>
      </div>
    </Card>
  );
}

// --- Single event row (with note) ---
function SummaryEventRow({ event, colorOverrides }: { event: ExocortexEvent, colorOverrides: any[] }) {
  const color = getEventColor(event, colorOverrides);
  return (
    <Card className="flex items-center px-0 py-1 mb-2">
      <div className="h-11 w-2 rounded-l-lg" style={{ backgroundColor: color, minWidth: 8 }} />
      <div className="flex-1 flex flex-row items-center pl-4 pr-2 py-2 gap-3">
        <SmileyFace happiness={event.happiness} wakefulness={event.wakefulness} health={event.health} size={32} className="shrink-0" />
        <div className="grow">
          <span className="inline-block text-muted-foreground text-xs mr-3">{formatTime(event.endTime - 36*60*1000)}–{formatTime(event.endTime)}</span>
          <span className="text-sm font-semibold mr-3">{event.category}</span>
          <span className="block text-xs mt-1 text-card-foreground/80 italic truncate max-w-lg">{event.notes}</span>
        </div>
      </div>
    </Card>
  );
}

const Summary: React.FC = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: number]: boolean }>({});
  const [forceRefresh, setForceRefresh] = useState(0);
  const [skipDate, setSkipDate] = useState<Date | null>(null);
  const { config } = useAppContext();

  useSeoMeta({
    title: 'Summary - ExocortexLog',
    description: 'View summary of recent notable events',
  });

  // Load all recent days & flatten events
  useEffect(() => {
    if (!db) return;
    const load = async () => {
      let from = new Date();
      from.setHours(23,59,59,999);
      let to = new Date(from);
      from.setDate(from.getDate() - SUMMARY_DAYS + 1);
      
      // If skipping to date, move window
      if (skipDate) {
        const s = new Date(skipDate);
        s.setHours(0,0,0,0);
        from = new Date(s);
        to = new Date(s); to.setDate(to.getDate() + SUMMARY_DAYS - 1);
      }
      const days: DayEvents[] = await db.getEventsByDateRange(
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0]
      );
      // Flatten and sort descending by endTime
      const events = days.flatMap(d => d.events).sort((a, b) => b.endTime - a.endTime);
      setRows(makeSummaryRows(events));
    };
    load();
  }, [db, forceRefresh, skipDate]);

  // Init DB if needed
  useEffect(() => {
    if (db) return;
    const d = new ExocortexDB();
    d.init().then(() => setDb(d));
  }, [db]);

  // Expand/collapse handlers
  const handleExpand = useCallback((idx: number) => {
    setExpandedGroups(prev => ({ ...prev, [idx]: true }));
  }, []);
  const handleCollapse = useCallback((idx: number) => {
    setExpandedGroups(prev => ({ ...prev, [idx]: false }));
  }, []);

  // For skip-to-date support, pass setSkipDate to PageLayout
  return (
    <PageLayout
      db={db}
      title="Summary"
      explain="A summary of recent events. Rows with notes are always shown; consecutive no-note events are collapsed into a single row. Click expand to show all."
      currentView="summary"
      triggerRefresh={() => setForceRefresh(f => f+1)}
      setSkipDate={setSkipDate}
    >
      <div className="max-w-3xl mx-auto mt-8">
        {rows.length === 0 && <div className="text-muted-foreground text-center p-8">No events found for the selected period.</div>}
        {rows.map((row, i) => {
          if (row.type === 'single') {
            return <SummaryEventRow key={row.event.id} event={row.event} colorOverrides={config.colorOverrides} />;
          }
          if (row.type === 'collapsed') {
            if (expandedGroups[i]) {
              // Expanded, show each event as own row
              return <>
                {row.events.map(ev => (
                  <SummaryEventRow key={ev.id} event={ev} colorOverrides={config.colorOverrides} />
                ))}
                <div className="flex justify-end mb-4">
                  <Button variant="ghost" size="sm" tabIndex={0} onClick={() => handleCollapse(i)} className="text-blue-600">Collapse</Button>
                </div>
              </>;
            } else {
              // Collapsed summary row
              return <SummaryCollapsedRow key={`collapsed-${i}`} events={row.events} expanded={false} onExpand={() => handleExpand(i)} colorOverrides={config.colorOverrides} />;
            }
          }
          return null;
        })}
      </div>
    </PageLayout>
  );
};

export default Summary;
