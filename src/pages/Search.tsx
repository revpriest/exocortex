import React, { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExocortexDB, ExocortexEvent, DayEvents, formatTime, getEventColor } from '@/lib/exocortex';
import { SmileyFace } from '@/components/SmileyFace';
import { useAppContext } from '@/hooks/useAppContext';
import { DayOverviewDialog } from '@/components/DayOverviewDialog';
import { EventDialog } from '@/components/EventDialog';

function highlightMatch(text: string | undefined, term: string): React.ReactNode {
  if (!text) return null;
  if (!term) return text;
  const lower = text.toLowerCase();
  const q = term.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-400/40 text-foreground rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

interface SearchResultRowProps {
  event: ExocortexEvent;
  query: string;
  onShowDay: (dateKey: string) => void;
  onEdit: (event: ExocortexEvent) => void;
}

const SearchResultRow: React.FC<SearchResultRowProps> = ({ event, query, onShowDay, onEdit }) => {
  const { config } = useAppContext();
  const color = getEventColor(event, config.colorOverrides);
  const start = new Date(event.endTime - 36 * 60 * 1000); // approx 36 mins before as in Summary
  const end = new Date(event.endTime);

  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dateKey = new Date(event.endTime).toISOString().split('T')[0];

  const handleRowClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // Ignore clicks that originate from the Edit button
    const target = e.target as HTMLElement;
    if (target.closest('button[data-role="edit-event"]')) {
      return;
    }
    onShowDay(dateKey);
  };

  return (
    <Card className="flex items-center px-0 py-1 mb-2 transition-colors hover:bg-blue-900/40">
      <button
        type="button"
        onClick={() => onShowDay(dateKey)}
        className="h-11 w-2 rounded-l-lg"
        style={{ backgroundColor: color, minWidth: 8 }}
        aria-label={`Show day overview for ${dateLabel}`}
      />
      <div
        className="flex-1 flex flex-row items-center pl-4 pr-2 py-2 gap-3 overflow-hidden cursor-pointer"
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
      >
        <SmileyFace
          happiness={event.happiness}
          wakefulness={event.wakefulness}
          health={event.health}
          size={32}
          className="shrink-0"
        />
        <div className="grow overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
              <span>{dateLabel}</span>
              <span>
                {formatTime(start.getTime())}–{formatTime(end.getTime())}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-role="edit-event"
              className="text-xs px-2 py-1 h-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(event);
              }}
            >
              Edit
            </Button>
          </div>
          <div className="text-sm font-semibold mt-0.5 truncate">
            {highlightMatch(event.category, query) || event.category}
          </div>
          {event.notes && (
            <div className="text-xs mt-1 text-card-foreground/80 italic line-clamp-2">
              {highlightMatch(event.notes, query)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const SearchPage: React.FC = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [events, setEvents] = useState<ExocortexEvent[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  useSeoMeta({
    title: 'Search - ExocortexLog',
    description: 'Search your events by notes or category',
  });

  useEffect(() => {
    const initDb = async () => {
      const dbInstance = new ExocortexDB();
      await dbInstance.init();
      setDb(dbInstance);

      const to = new Date();
      to.setHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setFullYear(from.getFullYear() - 3);
      from.setHours(0, 0, 0, 0);
      const days: DayEvents[] = await dbInstance.getEventsByDateRangeOnly(
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0],
      );
      const allEvents = days.flatMap((d) => d.events).sort((a, b) => b.endTime - a.endTime);
      setEvents(allEvents);
    };
    initDb().catch((err) => console.error('Failed to initialise DB for search', err));
  }, []);

  const filtered = useMemo(() => {
    if (!submittedQuery.trim()) return [];
    const q = submittedQuery.toLowerCase();
    return events.filter((ev) => {
      const inNotes = ev.notes?.toLowerCase().includes(q);
      const inCat = ev.category?.toLowerCase().includes(q);
      return inNotes || inCat;
    });
  }, [events, submittedQuery]);

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) setEditingEvent(null);
  };

  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;
    await db.updateEvent(id, eventData);
    setEditingEvent(null);

    // Refresh local events cache so search results reflect changes
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 3);
    from.setHours(0, 0, 0, 0);
    const days: DayEvents[] = await db.getEventsByDateRangeOnly(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0],
    );
    const allEvents = days.flatMap((d) => d.events).sort((a, b) => b.endTime - a.endTime);
    setEvents(allEvents);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;
    await db.deleteEvent(id);
    setEditingEvent(null);

    // Refresh local events cache
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 3);
    from.setHours(0, 0, 0, 0);
    const days: DayEvents[] = await db.getEventsByDateRangeOnly(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0],
    );
    const allEvents = days.flatMap((d) => d.events).sort((a, b) => b.endTime - a.endTime);
    setEvents(allEvents);
  };

  return (
    <PageLayout
      db={db}
      title="Search"
      explain="Search for events by notes or category. Results are shown from the last few years."
      currentView="search"
    >
      <div className="max-w-3xl mx-auto mt-4 space-y-4">
        <div className="flex gap-2">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or category..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim()) {
                  setSubmittedQuery(query.trim());
                }
              }
            }}
          />
          <Button type="button" disabled={!query.trim()} onClick={() => setSubmittedQuery(query.trim())}>
            Search
          </Button>
        </div>
        {submittedQuery && (
          <div className="text-sm text-muted-foreground">
            Showing {filtered.length} result{submittedQuery && filtered.length !== 1 ? 's' : ''} for
            {' "'}
            <span className="font-medium">{submittedQuery}</span>
            {'"'}
          </div>
        )}
        <div className="mt-2">
          {submittedQuery && filtered.length === 0 && (
            <div className="text-muted-foreground text-center p-8">No events match your search.</div>
          )}
          {filtered.map((ev) => (
            <SearchResultRow
              key={ev.id}
              event={ev}
              query={submittedQuery}
              onShowDay={(dateKey) => setSelectedDateKey(dateKey)}
              onEdit={(event) => setEditingEvent(event)}
            />
          ))}
        </div>
      </div>
      <DayOverviewDialog
        open={!!selectedDateKey}
        onOpenChange={(open) => {
          if (!open) setSelectedDateKey(null);
        }}
        dateKey={selectedDateKey}
        db={db}
        onPrevDay={() => {
          if (!selectedDateKey) return;
          const d = new Date(selectedDateKey + 'T00:00:00');
          d.setDate(d.getDate() - 1);
          setSelectedDateKey(d.toISOString().split('T')[0]);
        }}
        onNextDay={() => {
          if (!selectedDateKey) return;
          const d = new Date(selectedDateKey + 'T00:00:00');
          d.setDate(d.getDate() + 1);
          setSelectedDateKey(d.toISOString().split('T')[0]);
        }}
      />
      <EventDialog
        open={!!editingEvent}
        onOpenChange={handleDialogOpenChange}
        onUpdate={handleUpdateEvent}
        onSubmit={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
      />
    </PageLayout>
  );
};

export default SearchPage;
