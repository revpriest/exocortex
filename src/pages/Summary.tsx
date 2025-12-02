/**
 * Summary.tsx - Summary Page
 *
 * Visual summary of recent events. Collapses consecutive non-notable (no notes) events into a summary row;
 * those with notes are shown individually. Expand group to see individuals. Provides skip-to-date via PageLayout.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExocortexDB, ExocortexEvent, getEventColor, formatTime, DayEvents } from '@/lib/exocortex';
import { SmileyFace } from '@/components/SmileyFace';
import { useAppContext } from '@/hooks/useAppContext';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

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

// --- Day marker row ---
function DaySeparatorRow({ dateString }: { dateString: string }) {
  const dt = new Date(dateString);
  // Render as 'Monday, 30 January 2025'
  const nice = dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="flex items-center mt-6 mb-2">
      <div className="flex-grow border-t border-border mr-3"></div>
      <span className="px-3 py-0.5 text-xs font-semibold bg-muted text-muted-foreground rounded shadow-sm">{nice}</span>
      <div className="flex-grow border-t border-border ml-3"></div>
    </div>
  );
}

// --- Collapsed group header row (renders in both collapsed & expanded states) ---
function SummaryGroupHeader({ events, expanded, onToggle, colorOverrides }: {
  events: ExocortexEvent[];
  expanded: boolean;
  onToggle: () => void;
  colorOverrides: any[];
}) {
  if (!events || events.length === 0) return null;
  const first = events[0];
  const last = events[events.length - 1];
  const color = getEventColor(first, colorOverrides);
  return (
    <Card className="flex items-center px-0 py-1 mb-2">
      <button onClick={onToggle} className="flex items-center px-2 h-11 group focus:outline-none" aria-label={expanded ? 'Collapse group' : 'Expand group'}>
        {expanded
          ? <ChevronDown className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors" />
          : <ChevronRight className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors" />}
      </button>
      <div className="h-11 w-2 rounded-l-lg" style={{ backgroundColor: color, minWidth: 8 }} />
      <div className="flex-1 flex flex-row items-center pl-4 pr-2 py-2 gap-4 overflow-x-hidden whitespace-nowrap">
        <SmileyFace happiness={first.happiness} wakefulness={first.wakefulness} health={first.health} size={32} className="shrink-0" />
        <div className="grow overflow-x-hidden">
          <span className="text-muted-foreground text-xs mr-3">{formatTime(first.endTime - (events.length > 1 ? (first.endTime - events[0].endTime) : 0))}–{formatTime(last.endTime)}</span>
          <span className="text-sm font-medium">{compactCats(events)}</span>
        </div>
        <span className="text-blue-700 text-xs font-semibold select-none">{expanded ? `Collapse` : `Expand (${events.length})`}</span>
      </div>
    </Card>
  );
}

// --- Single event row (with note) ---
function SummaryEventRow({ event, colorOverrides }: { event: ExocortexEvent, colorOverrides: any[] }) {
  const color = getEventColor(event, colorOverrides);
  return (
    <Card className="flex items-center px-0 py-1 mb-2">
      <div style={{ width: 40 }} />
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
  const handleToggle = useCallback((idx: number) => {
    setExpandedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  // Insert day separators inline with content rows (rows[])
  const renderRowsWithDaySeparators = () => {
    const result: React.ReactNode[] = [];
    let lastDate: string | undefined;
    rows.forEach((row, i) => {
      // Find the earliest event in this row to determine day
      let thisEvent: ExocortexEvent | undefined;
      if (row.type === 'single') thisEvent = row.event;
      if (row.type === 'collapsed' && row.events.length > 0) thisEvent = row.events[0];
      if (thisEvent) {
        const thisDay = new Date(thisEvent.endTime).toISOString().split('T')[0];
        if (thisDay !== lastDate) {
          result.push(<DaySeparatorRow key={`daysep-${thisDay}`} dateString={thisDay} />);
          lastDate = thisDay;
        }
      }
      // Render row
      if (row.type === 'single') {
        result.push(
          <SummaryEventRow key={row.event.id} event={row.event} colorOverrides={config.colorOverrides} />
        );
      } else if (row.type === 'collapsed') {
        // Always show the header with chevron (toggled), in both collapsed & expanded
        result.push(
          <SummaryGroupHeader
            key={`groupheader-${i}`}
            events={row.events}
            expanded={!!expandedGroups[i]}
            onToggle={() => handleToggle(i)}
            colorOverrides={config.colorOverrides}
          />
        );
        if (expandedGroups[i]) {
          // Show the individual events below the header
          row.events.forEach((ev: ExocortexEvent) => {
            result.push(<SummaryEventRow key={ev.id} event={ev} colorOverrides={config.colorOverrides} />);
          });
        }
      }
    });
    return result;
  };

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
        {renderRowsWithDaySeparators()}
      </div>
    </PageLayout>
  );
};

export default Summary;
