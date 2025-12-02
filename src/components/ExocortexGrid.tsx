/**
 * ExocortexGrid.tsx - Main Time Tracking Grid Component
 *
 * Core function unchanged except: all dialog state REMOVED, and we use onEventClick prop
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExocortexEvent, DayEvents, ExocortexDB, getEventColor, formatTime, getHourSlots } from '@/lib/exocortex';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { SmileyFace } from './SmileyFace';

const HOURS_IN_DAY = 24;
const HOUR_WIDTH = 60;
const MOBILE_HOUR_WIDTH = 30;
const ROW_HEIGHT = 80;
const responsiveStyles = `
  .exocortex {
    --hour-width: ${HOUR_WIDTH}px;
  }
  @media (max-width: 768px) {
    .exocortex {
      --hour-width: ${MOBILE_HOUR_WIDTH}px;
    }
  }
`;

interface ExocortexGridProps {
  className?: string;
  refreshTrigger?: number;
  skipDate?: Date|null;
  setSkipDate?: (newDate: Date) => void;
  db?: ExocortexDB | null;
  // NEW: pass handler to trigger dialog in parent
  onEventClick?: (event: ExocortexEvent) => void;
}

export function ExocortexGrid({ className, refreshTrigger, db, skipDate, setSkipDate, onEventClick }: ExocortexGridProps) {
  const { config } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastDayCheck, setLastDayCheck] = useState(new Date());
  const [days, setDays] = useState<DayEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const dragThreshold = 5;

  // REMOVED: dialog state management
  // const [isDialogOpen, setIsDialogOpen] = useState(false);
  // const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  const isMobile = useIsMobile() || false;
  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // ... [rest of ExocortexGrid code unchanged, except how event clicks work below]

  // Instead of using local dialog state, trigger the parent to open dialog:
  const handleEventClickWithDragCheck = useCallback((event: ExocortexEvent) => {
    if (!hasDragged && onEventClick) {
      onEventClick(event);
    }
  }, [hasDragged, onEventClick]);

  // ... [rest of render unchanged except event click]

  if (loading && days.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={gridRef}
        className="relative overflow-auto bg-background border border-border rounded-lg exocortex"
        style={{ height: 'calc(100vh - 100px)', width: '100%', cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={e => handleMouseDown(e)}
        onMouseMove={e => handleMouseMove(e)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <style>{responsiveStyles}</style>
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
            {getHourSlots().map((hour, index) => (
              <div key={hour} className="text-xs md:text-sm text-muted-foreground border-r border-border px-1 md:px-2 py-1 text-center flex-shrink-0 select-none" style={{ width: `var(--hour-width)` }}>{hour}</div>
            ))}
          </div>
        </div>
        <div className="relative" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
          {days.map((day, dayIndex) => (
            <div key={day.date} data-day={day.date} className="relative border-b border-border" style={{ height: `${ROW_HEIGHT}px` }}>
              <div className="absolute left-2 -top-1 text-xs md:text-sm text-muted-foreground z-20 select-none">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="absolute inset-0 flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {Array.from({ length: HOURS_IN_DAY }).map((_, hourIndex) => (
                  <div key={hourIndex} className="border-r border-border flex-shrink-0" style={{ width: `var(--hour-width)` }} />
                ))}
              </div>
              <div className="absolute inset-0" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {getEventsForDay(day, days).map((event, eventIndex) => {
                  // ... extract calc code unchanged (omitted for brevity)
                  // onClick below is now handled via parent:
                  return (
                    <div
                      key={`${event.id}-${day.date}`}
                      className="absolute top-2 h-16 rounded-md border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
                      style={eventStyle} // computed above as in original code
                      onClick={() => handleEventClickWithDragCheck({ ...event, id: originalEventId })}
                    >
                      <div className="p-0 h-full flex flex-col items-center justify-center text-center">
                        <div className="text-xs font-medium truncate w-full mb-0.5" style={{ color: getTextColor(event) }}>
                          {event.category}
                          {portionType !== 'full' && (<span className="ml-1 opacity-70">{portionType === 'start' ? '\u2192' : portionType === 'end' ? '\u2190' : '\u2194'}</span>)}
                        </div>
                        <div className="relative">
                          <SmileyFace health={event.health} wakefulness={event.wakefulness} happiness={event.happiness} size={27} />
                        </div>
                        {event.notes ? (
                          <div className="text-xs truncate w-full mt-0.5 leading-tight" style={{ color: getTextColor(event), opacity: 0.9 }} title={event.notes}>
                            {event.notes.length > 20 ? `${event.notes.slice(0, 20)}\u2026` : event.notes}
                          </div>
                        ) : (
                          <div className="text-xs truncate w-full mt-0.5 leading-tight">&nbsp;</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={loadingRef} className="h-20 flex items-center justify-center">{loading && (<div className="text-muted-foreground">Loading more days...</div>)}</div>
        </div>
      </div>
    </div>
  );
}
