import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExocortexEvent, DayEvents, ExocortexDB, getEventColor, formatTime, getHourSlots } from '@/lib/exocortex';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EventDialog } from './EventDialog';

interface ExocortexGridProps {
  className?: string;
}

const HOURS_IN_DAY = 24;
const HOUR_WIDTH = 60; // pixels per hour
const ROW_HEIGHT = 80; // pixels per day row

export function ExocortexGrid({ className }: ExocortexGridProps) {
  const [days, setDays] = useState<DayEvents[]>([]);
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);

      // Load initial days (today and past few days)
      await loadDays(database, new Date(), 7);
      setLoading(false);
    };

    initDb();
  }, []);

  // Load days for the grid
  const loadDays = useCallback(async (database: ExocortexDB, fromDate: Date, count: number) => {
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() - count + 1);

    const newDays = await database.getEventsByDateRange(
      endDate.toISOString().split('T')[0],
      fromDate.toISOString().split('T')[0]
    );

    setDays(prev => [...prev, ...newDays.reverse()]);
  }, []);

  // Setup infinite scroll
  useEffect(() => {
    if (!loadingRef.current || !db) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          const oldestDay = days[days.length - 1];
          if (oldestDay) {
            const loadMoreDays = async () => {
              setLoading(true);
              const fromDate = new Date(oldestDay.date);
              fromDate.setDate(fromDate.getDate() - 1);
              await loadDays(db, fromDate, 7);
              setLoading(false);
            };
            loadMoreDays();
          }
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadingRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, days, db, loadDays]);

  // Calculate event position and width
  const calculateEventStyle = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number) => {
    const eventDate = new Date(event.endTime);
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);

    let startTime: number;
    if (index === 0) {
      // First event starts at midnight
      startTime = startOfDay.getTime();
    } else {
      // Start time is the end time of the previous event
      startTime = dayEvents[index - 1].endTime;
    }

    const duration = event.endTime - startTime;
    const startHour = (startTime - startOfDay.getTime()) / (1000 * 60 * 60);
    const durationHours = duration / (1000 * 60 * 60);

    return {
      left: `${startHour * HOUR_WIDTH}px`,
      width: `${durationHours * HOUR_WIDTH}px`,
      backgroundColor: getEventColor(event),
    };
  };

  const hourSlots = getHourSlots();

  const handleAddEvent = async (eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.addEvent(eventData);

      // Refresh today's events
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = await db.getEventsByDate(today);

      setDays(prev => {
        const newDays = [...prev];
        const todayIndex = newDays.findIndex(day => day.date === today);
        if (todayIndex !== -1) {
          newDays[todayIndex] = { date: today, events: todayEvents };
        } else {
          newDays.unshift({ date: today, events: todayEvents });
        }
        return newDays;
      });

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.updateEvent(id, eventData);

      // Find and update the event in the corresponding day
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const dayEvents = await db.getEventsByDate(eventDate);

      setDays(prev => {
        const newDays = [...prev];
        const dayIndex = newDays.findIndex(day => day.date === eventDate);
        if (dayIndex !== -1) {
          newDays[dayIndex] = { date: eventDate, events: dayEvents };
        }
        return newDays;
      });

      setIsDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;

    try {
      await db.deleteEvent(id);

      // Remove the event from the corresponding day
      setDays(prev => {
        const newDays = prev.map(day => ({
          ...day,
          events: day.events.filter(event => event.id !== id)
        })).filter(day => day.events.length > 0 || day.date === new Date().toISOString().split('T')[0]);

        return newDays;
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleEventClick = (event: ExocortexEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  if (loading && days.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Grid container */}
      <div
        ref={gridRef}
        className="relative overflow-auto bg-gray-900 border border-gray-700 rounded-lg"
        style={{
          maxHeight: '80vh',
          minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px`
        }}
      >
        {/* Hour headers */}
        <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700">
          <div className="flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
            {hourSlots.map((hour, index) => (
              <div
                key={hour}
                className="text-xs text-gray-400 border-r border-gray-700 px-2 py-1 text-center flex-shrink-0"
                style={{ width: `${HOUR_WIDTH}px` }}
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* Day rows */}
        <div className="relative" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
          {days.map((day, dayIndex) => (
            <div
              key={day.date}
              className="relative border-b border-gray-800"
              style={{
                height: `${ROW_HEIGHT}px`,
                minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px`
              }}
            >
              {/* Date label */}
              <div className="absolute left-2 top-2 text-sm text-gray-400 z-20">
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>

              {/* Grid lines */}
              <div className="absolute inset-0 flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {Array.from({ length: HOURS_IN_DAY }).map((_, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="border-r border-gray-800 flex-shrink-0"
                    style={{ width: `${HOUR_WIDTH}px` }}
                  />
                ))}
              </div>

              {/* Events */}
              <div className="absolute inset-0" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {day.events.map((event, eventIndex) => (
                  <div
                    key={event.id}
                    className="absolute top-2 h-16 rounded-md border border-gray-600 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    style={calculateEventStyle(event, day.events, eventIndex)}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="p-2 h-full flex flex-col justify-between">
                      <div className="text-xs font-medium text-white truncate">
                        {event.category}
                      </div>
                      <div className="text-xs text-gray-200">
                        {formatTime(event.endTime)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Loading trigger for infinite scroll */}
          <div ref={loadingRef} className="h-20 flex items-center justify-center">
            {loading && (
              <div className="text-muted-foreground">Loading more days...</div>
            )}
          </div>
        </div>
      </div>

      {/* Floating add button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Event dialog */}
      <EventDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
      />
    </div>
  );
}