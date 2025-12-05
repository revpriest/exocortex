/**
 * Summary.tsx - Summary Page
 *
 * Visual summary of recent events. Collapses consecutive non-notable (no notes) events into a summary row;
 * those with notes are shown individually. Expand group to see individuals. Provides skip-to-date via PageLayout.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card } from '@/components/ui/card';
import { ExocortexDB, ExocortexEvent, getEventColor, formatTime, DayEvents } from '@/lib/exocortex';
import { SmileyFace } from '@/components/SmileyFace';
import { useAppContext } from '@/hooks/useAppContext';
import { ChevronRight } from 'lucide-react';
import { EventDialog } from '@/components/EventDialog';
import { ColorOverride } from '@/contexts/AppContext';

// --- helpers: makeSummaryRows, compactCats, DaySeparatorRow, SummaryGroupHeader, SummaryEventRow ...

function makeSummaryRows(events: ExocortexEvent[]) {
  const rows: { type: string; events?: ExocortexEvent[]; event?: ExocortexEvent }[] = [];
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
  const cats = [...new Set(events.map((e) => e.category))];
  let label = cats.join(', ');
  if (label.length > 64) {
    label = label.slice(0, 61).replace(/,\s?$/, '') + '…';
  }
  return label;
}

function DaySeparatorRow({ dateString }: { dateString: string }) {
  const dt = new Date(dateString);
  const nice = dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="flex items-center mt-6 mb-2">
      <div className="flex-grow border-t border-border mr-3" />
      <span className="px-3 py-0.5 text-xs font-semibold bg-muted text-muted-foreground rounded shadow-sm">
        {nice}
      </span>
      <div className="flex-grow border-t border-border ml-3" />
    </div>
  );
}

function SummaryGroupHeader({
  events,
  expanded,
  onToggle,
  colorOverrides,
}: {
  events: ExocortexEvent[];
  expanded: boolean;
  onToggle: () => void;
  colorOverrides: ColorOverride[] | undefined;
}) {
  if (!events || events.length === 0) return null;
  const first = events[0];
  const last = events[events.length - 1];
  const color = getEventColor(first, colorOverrides);
  return (
    <Card className="flex items-center px-0 py-1 mb-2">
      <button
        onClick={onToggle}
        className="flex items-center px-2 h-11 group focus:outline-none cursor-pointer"
        aria-label={expanded ? 'Collapse group' : 'Expand group'}
      >
        {expanded ? (
          <ChevronRight
            className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors"
            style={{ transform: 'rotate(45deg)' }}
          />
        ) : (
          <ChevronRight className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors" />
        )}
      </button>
      <div className="h-11 w-2 rounded-l-lg" style={{ backgroundColor: color, minWidth: 8 }} />
      <div className="flex-1 flex flex-row items-center pl-4 pr-2 py-2 gap-4 overflow-x-hidden whitespace-nowrap">
        <SmileyFace
          happiness={first.happiness}
          wakefulness={first.wakefulness}
          health={first.health}
          size={32}
          className="shrink-0"
        />
        <div className="grow overflow-x-hidden">
          <span className="text-muted-foreground text-xs mr-3">
            {formatTime(first.endTime - (events.length > 1 ? first.endTime - events[0].endTime : 0))}–
            {formatTime(last.endTime)}
          </span>
          <span className="text-sm font-medium">{compactCats(events)}</span>
        </div>
        <span className="text-blue-700 text-xs font-semibold select-none">
          {expanded ? `Collapse` : `Expand (${events.length})`}
        </span>
      </div>
    </Card>
  );
}

function SummaryEventRow({
  event,
  colorOverrides,
  indent = false,
  onClick,
}: {
  event: ExocortexEvent;
  colorOverrides?: any[];
  indent?: boolean;
  onClick?: () => void;
}) {
  const color = getEventColor(event, colorOverrides);
  return (
    <Card
      className={`flex items-center px-0 py-1 mb-2 ${indent ? 'ml-10 md:ml-14' : ''} cursor-pointer hover:bg-blue-900/40 transition-colors`}
      role="button"
      tabIndex={0}
      aria-label="Edit event"
      onClick={onClick}
    >
      <div style={{ width: 40 }} />
      <div className="h-11 w-2 rounded-l-lg" style={{ backgroundColor: color, minWidth: 8 }} />
      <div className="flex-1 flex flex-row items-center pl-4 pr-2 py-2 gap-3">
        <SmileyFace
          happiness={event.happiness}
          wakefulness={event.wakefulness}
          health={event.health}
          size={32}
          className="shrink-0"
        />
        <div className="grow">
          <span className="inline-block text-muted-foreground text-xs mr-3">
            {formatTime(event.endTime - 36 * 60 * 1000)}–{formatTime(event.endTime)}
          </span>
          <span className="text-sm font-semibold mr-3">{event.category}</span>
          <span className="block text-xs mt-1 text-card-foreground/80 italic truncate max-w-lg">{event.notes}</span>
        </div>
      </div>
    </Card>
  );
}

// Maximum number of days shown in the Summary view (approx. 2 years)
const SUMMARY_DAYS = 730;

const Summary: React.FC = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: number]: boolean }>({});
  const [forceRefresh, setForceRefresh] = useState(0);
  const [skipDate, setSkipDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);
  const { config } = useAppContext();
  const [searchParams] = useSearchParams();

  useSeoMeta({
    title: 'Summary - ExocortexLog',
    description: 'View summary of recent notable events',
  });

  // Initialise skipDate from ?date=YYYY-MM-DD when first loading
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam) return;

    const parsed = new Date(`${dateParam}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      setSkipDate(parsed);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!db) return;
    const load = async () => {
      let from: Date, to: Date;
      if (skipDate) {
        to = new Date(skipDate);
        to.setHours(23, 59, 59, 999);
        from = new Date(skipDate);
        from.setDate(from.getDate() - (SUMMARY_DAYS - 1));
        from.setHours(0, 0, 0, 0);
      } else {
        to = new Date();
        to.setHours(23, 59, 59, 999);
        from = new Date(to);
        from.setDate(from.getDate() - (SUMMARY_DAYS - 1));
        from.setHours(0, 0, 0, 0);
      }
      const days: DayEvents[] = await db.getEventsByDateRangeOnly(
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0],
      );
      const events = days.flatMap((d) => d.events).sort((a, b) => b.endTime - a.endTime);
      setRows(makeSummaryRows(events));
    };
    load();
  }, [db, forceRefresh, skipDate]);

  useEffect(() => {
    if (db) return;
    const d = new ExocortexDB();
    d.init().then(() => setDb(d));
  }, [db]);

  const handleToggle = useCallback((idx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) setEditingEvent(null);
  };
  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;
    await db.updateEvent(id, eventData);
    setEditingEvent(null);
    setForceRefresh((f) => f + 1);
  };
  const handleDeleteEvent = async (id: string) => {
    if (!db) return;
    await db.deleteEvent(id);
    setEditingEvent(null);
    setForceRefresh((f) => f + 1);
  };

  const renderRowsWithDaySeparators = () => {
    const result: React.ReactNode[] = [];
    let lastDate: string | undefined;
    rows.forEach((row, i) => {
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
      if (row.type === 'single') {
        result.push(
          <SummaryEventRow
            key={row.event.id}
            event={row.event}
            colorOverrides={config.colorOverrides}
            onClick={() => setEditingEvent(row.event)}
          />,
        );
      } else if (row.type === 'collapsed') {
        result.push(
          <SummaryGroupHeader
            key={`groupheader-${i}`}
            events={row.events}
            expanded={!!expandedGroups[i]}
            onToggle={() => handleToggle(i)}
            colorOverrides={config.colorOverrides}
          />,
        );
        if (expandedGroups[i]) {
          row.events.forEach((ev: ExocortexEvent) => {
            result.push(
              <SummaryEventRow
                key={ev.id}
                event={ev}
                colorOverrides={config.colorOverrides}
                indent
                onClick={() => setEditingEvent(ev)}
              />,
            );
          });
        }
      }
    });
    return result;
  };

  return (
    <PageLayout
      db={db}
      title="Summary"
      explain="A summary of recent events. Rows with notes are always shown; consecutive no-note events are collapsed into a single row. Click expand to show all."
      currentView="summary"
      triggerRefresh={() => setForceRefresh((f) => f + 1)}
      setSkipDate={setSkipDate}
    >
      {/* Dialog for edit events */}
      <EventDialog
        open={!!editingEvent}
        onOpenChange={handleDialogOpenChange}
        onUpdate={handleUpdateEvent}
        onSubmit={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
      />
      <div className="max-w-3xl mx-auto mt-8">
        {rows.length === 0 && (
          <div className="text-muted-foreground text-center p-8">
            No events found for the selected period.
          </div>
        )}
        {renderRowsWithDaySeparators()}
      </div>
    </PageLayout>
  );
};

export default Summary;
