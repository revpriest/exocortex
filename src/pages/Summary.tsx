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
import { ChevronRight } from 'lucide-react';
import { EventDialog } from '@/components/EventDialog';

// ... existing helpers ...

function SummaryEventRow({ event, colorOverrides, indent = false, onClick }: {
  event: ExocortexEvent, colorOverrides: any[], indent?: boolean, onClick?: () => void
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

// ... rest of helpers ...

const Summary: React.FC = () => {
  // ... states ...
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);
  // ...
  // When event is edited/saved/deleted, refresh view
div const handleDialogOpenChange = (open: boolean) => { if (!open) setEditingEvent(null); };
  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;
    await db.updateEvent(id, eventData);
    setEditingEvent(null);
    setForceRefresh(f => f + 1);
  };
  const handleDeleteEvent = async (id: string) => {
    if (!db) return;
    await db.deleteEvent(id);
    setEditingEvent(null);
    setForceRefresh(f => f + 1);
  };
  // ...
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
          <SummaryEventRow key={row.event.id} event={row.event} colorOverrides={config.colorOverrides} onClick={() => setEditingEvent(row.event)} />
        );
      } else if (row.type === 'collapsed') {
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
          row.events.forEach((ev: ExocortexEvent) => {
            result.push(
              <SummaryEventRow
                key={ev.id}
                event={ev}
                colorOverrides={config.colorOverrides}
                indent
                onClick={() => setEditingEvent(ev)}
              />
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
      triggerRefresh={() => setForceRefresh(f => f+1)}
      setSkipDate={setSkipDate}
    >
      <EventDialog
        open={!!editingEvent}
        onOpenChange={handleDialogOpenChange}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
      />
      <div className="max-w-3xl mx-auto mt-8">
        {rows.length === 0 && <div className="text-muted-foreground text-center p-8">No events found for the selected period.</div>}
        {renderRowsWithDaySeparators()}
      </div>
    </PageLayout>
  );
};

export default Summary;
