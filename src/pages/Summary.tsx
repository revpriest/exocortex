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

// ... (other helpers unchanged) ...

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

const Summary: React.FC = () => {
  // ... states ...
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  // When event is edited/saved/deleted, refresh view
  const handleDialogOpenChange = (open: boolean) => { if (!open) setEditingEvent(null); };
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
  // ... rest of component unchanged ...
