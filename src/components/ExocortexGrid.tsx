import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExocortexEvent, DayEvents, ExocortexDB, getEventColor, formatTime, getHourSlots } from '@/lib/exocortex';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, Database, Trash2, AlertCircle } from 'lucide-react';
import { EventDialog } from './EventDialog';
import { DataExporter } from '@/lib/dataExport';
import { SmileyFace } from './SmileyFace';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ExocortexGridProps {
  className?: string;
}

const HOURS_IN_DAY = 24;
const HOUR_WIDTH = 60; // pixels per hour on desktop
const MOBILE_HOUR_WIDTH = 30; // pixels per hour on mobile - smaller to fit screen

// CSS custom properties for responsive hour width
const responsiveStyles = `
  .exocortex-grid {
    --hour-width: ${HOUR_WIDTH}px;
  }

  @media (max-width: 768px) {
    .exocortex-grid {
      --hour-width: ${MOBILE_HOUR_WIDTH}px;
    }
  }
`;
const ROW_HEIGHT = 80; // pixels per day row - balanced for mobile and desktop

export function ExocortexGrid({ className }: ExocortexGridProps) {
  const [days, setDays] = useState<DayEvents[]>([]);
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);
  const [defaultValues, setDefaultValues] = useState({
    happiness: 0.7,
    wakefulness: 0.8,
    health: 0.9,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hasReachedHistoricalLimit, setHasReachedHistoricalLimit] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

    initDb().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, []);

  // Load days for the grid
  const loadDays = useCallback(async (database: ExocortexDB, fromDate: Date, count: number) => {
    // Calculate the correct date range: fromDate is the newest date, we want to load count days before it
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() - count + 1); // This becomes the oldest date in the range

    const newDays = await database.getEventsByDateRange(
      endDate.toISOString().split('T')[0], // Oldest date (start of range)
      fromDate.toISOString().split('T')[0]   // Newest date (end of range)
    );

    // Only add new days if we actually got data
    if (newDays.length > 0) {
      setDays(prev => [...prev, ...newDays.reverse()]);
      return true; // Indicate successful load
    }
    return false; // Indicate no more data available
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
              // Don't load if we've reached the historical limit
              if (hasReachedHistoricalLimit) return;

              setLoading(true);
              const oldestDay = days[days.length - 1];
              const oldestDate = new Date(oldestDay.date);

              // Don't load data from more than 10 years ago
              const tenYearsAgo = new Date();
              tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

              if (oldestDate < tenYearsAgo) {
                setHasReachedHistoricalLimit(true);
                setLoading(false);
                return;
              }

              const fromDate = new Date(oldestDay.date);
              fromDate.setDate(fromDate.getDate() - 7); // Load 7 days before the oldest day
              const success = await loadDays(db, fromDate, 7);

              if (!success) {
                // No more data available, we can stop observing or show a message
                setHasReachedHistoricalLimit(true);
                console.log('No more historical data available');
              }

              setLoading(false);
            };

            loadMoreDays().catch((error) => {
              console.error('Error in loadMoreDays:', error);
              setLoading(false);
              setError('Failed to load more days. Please try again.');
            });
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

  // Helper function to calculate the actual start time of an event
  const getEventStartTime = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number): number => {
    if (index === 0) {
      // For the first event of the day, we need to handle special cases

      // For sleep events ending in early morning (before 7 AM), they started the previous evening
      if (event.category === 'Sleep' && new Date(event.endTime).getHours() < 7) {
        // Sleep events from test data start between 20:00-22:00 and last 7-8 hours
        // Calculate start time based on end time
        const sleepEndTime = new Date(event.endTime);
        const sleepStartTime = new Date(sleepEndTime);
        sleepStartTime.setDate(sleepStartTime.getDate() - 1); // Previous day

        // Calculate exact start time: 7-8 hours before end time
        const sleepDuration = 7.5 * 60 * 60 * 1000; // 7.5 hours average
        return sleepEndTime.getTime() - sleepDuration;
      }

      // For other events in early morning, they might be continuations from previous day
      if (new Date(event.endTime).getHours() < 7 && event.category !== 'Sleep') {
        // Estimate they started in the evening of previous day
        const estimatedStartTime = new Date(event.endTime);
        estimatedStartTime.setDate(estimatedStartTime.getDate() - 1);
        estimatedStartTime.setHours(21, 0, 0, 0); // 9:00 PM previous day
        return estimatedStartTime.getTime();
      }

      // EDGE CASE FIX: Check if there's a previous day with events that this should connect to
      const currentDayDate = new Date(event.endTime).toISOString().split('T')[0];
      const previousDay = new Date(currentDayDate);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayDate = previousDay.toISOString().split('T')[0];

      // Find the previous day in our days array
      const previousDayData = days.find(day => day.date === previousDayDate);

      if (previousDayData && previousDayData.events.length > 0) {
        // Get the last event from the previous day
        const lastEventOfPreviousDay = previousDayData.events[previousDayData.events.length - 1];
        const lastEventEndTime = lastEventOfPreviousDay.endTime;

        // If the last event of previous day ended before midnight, start this event right after it
        const midnightOfCurrentDay = new Date(currentDayDate);
        midnightOfCurrentDay.setHours(0, 0, 0, 0);

        if (lastEventEndTime < midnightOfCurrentDay.getTime()) {
          // Start right after the previous day's last event ended
          return lastEventEndTime;
        }
      }

      // Default: For regular events, assume they start at midnight (00:00) if they're the first event
      // This makes more sense since the day starts at midnight, not 7:00 AM
      const eventEndTime = new Date(event.endTime);
      const eventDate = new Date(eventEndTime);
      eventDate.setHours(0, 0, 0, 0); // 00:00 (midnight) start of day

      return eventDate.getTime();
    } else {
      // For all other events, start immediately after the previous event ends
      // This ensures no gaps between events
      return dayEvents[index - 1].endTime;
    }
  };

  // Calculate event position and width for a specific day portion with explicit start time
  const calculateEventPortionWithStartTime = (
    event: ExocortexEvent,
    dayDate: string,
    startTime: number,
    endTime: number,
    portion: 'start' | 'middle' | 'end' | 'full'
  ) => {
    const eventEndTime = new Date(endTime);
    const eventStartTime = new Date(startTime);
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    let portionStartTime: Date;
    let portionEndTime: Date;

    switch (portion) {
      case 'start':
        // First day portion: from actual start time to midnight
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(dayEnd);
        break;
      case 'end':
        // Last day portion: from midnight to actual end time
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
      case 'middle':
        // Middle day portion: full day
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(dayEnd);
        break;
      case 'full':
      default:
        // Single day event: from actual start to actual end (clamped to day boundaries)
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
    }

    // Ensure we have positive duration
    if (portionEndTime.getTime() <= portionStartTime.getTime()) {
      // Fallback: make it at least 1 hour long
      portionEndTime = new Date(portionStartTime.getTime() + 60 * 60 * 1000);
    }

    const startHour = (portionStartTime.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
    const durationHours = (portionEndTime.getTime() - portionStartTime.getTime()) / (1000 * 60 * 60);

    return {
      left: `calc(${startHour} * var(--hour-width))`,
      width: `calc(${durationHours} * var(--hour-width))`,
      backgroundColor: getEventColor(event),
    };
  };

  // Calculate event position and width for a specific day portion
  const calculateEventPortionStyle = (
    event: ExocortexEvent,
    dayDate: string,
    dayEvents: ExocortexEvent[],
    eventIndex: number,
    portion: 'start' | 'middle' | 'end' | 'full'
  ) => {
    const eventEndTime = new Date(event.endTime);
    const eventStartTime = new Date(getEventStartTime(event, dayEvents, eventIndex));
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    let portionStartTime: Date;
    let portionEndTime: Date;

    switch (portion) {
      case 'start':
        // First day portion: from actual start time to midnight
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(dayEnd);
        break;
      case 'end':
        // Last day portion: from midnight to actual end time
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
      case 'middle':
        // Middle day portion: full day
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(dayEnd);
        break;
      case 'full':
      default:
        // Single day event: from actual start to actual end (clamped to day boundaries)
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
    }

    // Ensure we have positive duration
    if (portionEndTime.getTime() <= portionStartTime.getTime()) {
      // Fallback: make it at least 1 hour long
      portionEndTime = new Date(portionStartTime.getTime() + 60 * 60 * 1000);
    }

    const startHour = (portionStartTime.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
    const durationHours = (portionEndTime.getTime() - portionStartTime.getTime()) / (1000 * 60 * 60);

    return {
      left: `calc(${startHour} * var(--hour-width))`,
      width: `calc(${durationHours} * var(--hour-width))`,
      backgroundColor: getEventColor(event),
    };
  };

  // Check if an event spans multiple days
  const doesEventSpanMultipleDays = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number): boolean => {
    const eventEndTime = new Date(event.endTime);
    const eventStartTime = new Date(getEventStartTime(event, dayEvents, index));

    const startDay = eventStartTime.toISOString().split('T')[0];
    const endDay = eventEndTime.toISOString().split('T')[0];

    return startDay !== endDay;
  };

  // Get the portion type for an event on a specific day
  const getEventPortionType = (event: ExocortexEvent, dayDate: string, dayEvents: ExocortexEvent[], index: number): 'start' | 'middle' | 'end' | 'full' => {
    const eventEndTime = new Date(event.endTime);
    const eventStartTime = new Date(getEventStartTime(event, dayEvents, index));

    const startDay = eventStartTime.toISOString().split('T')[0];
    const endDay = eventEndTime.toISOString().split('T')[0];

    if (startDay === endDay) {
      return 'full';
    }

    if (dayDate === startDay) {
      return 'start';
    }

    if (dayDate === endDay) {
      return 'end';
    }

    return 'middle';
  };

  // Get all events that should be displayed on a specific day
  const getEventsForDay = (targetDay: DayEvents, allDays: DayEvents[]): ExocortexEvent[] => {
    const eventsForDay: ExocortexEvent[] = [];

    // First, find spanning events from other days that overlap with this day
    allDays.forEach(day => {
      if (day.date === targetDay.date) return; // Skip the same day

      day.events.forEach(event => {
        const eventEndTime = new Date(event.endTime);
        const eventStartTime = new Date(getEventStartTime(event, day.events, day.events.indexOf(event)));

        const startDay = eventStartTime.toISOString().split('T')[0];
        const endDay = eventEndTime.toISOString().split('T')[0];
        const targetDayDate = targetDay.date;

        // Check if this event spans across the target day
        // The event should start on or before the target day and end on or after the target day
        if (startDay !== endDay && startDay <= targetDayDate && endDay >= targetDayDate) {
          // Add the spanning portion
          eventsForDay.push({
            ...event,
            id: `${event.id}-span-${targetDayDate}`
          });
        }
      });
    });

    // Then add the regular events for this day
    targetDay.events.forEach(event => {
      eventsForDay.push(event);
    });

    // Sort events by end time to maintain proper sequence
    eventsForDay.sort((a, b) => a.endTime - b.endTime);

    return eventsForDay;
  };

  // Legacy function for backward compatibility (used for single-day events)
  const calculateEventStyle = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number) => {
    return calculateEventPortionStyle(event, new Date(event.endTime).toISOString().split('T')[0], dayEvents, index, 'full');
  };

  // Calculate text color based on background brightness
  const getTextColor = (event: ExocortexEvent) => {
    const color = getEventColor(event);

    // Parse HSL color - format is "hsl(h, s%, l%)"
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) {
      // Fallback to white if we can't parse the color
      return '#ffffff';
    }

    const lightness = parseInt(hslMatch[3]);

    // Return black for bright backgrounds (lightness > 50%), white for dark backgrounds
    return lightness > 50 ? '#000000' : '#ffffff';
  };

  const hourSlots = getHourSlots();

  const handleAddEvent = async (eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.addEvent(eventData);

      // Get the event date and previous date
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const previousDate = new Date(eventDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Refresh both the event's day and the previous day (for spanning events)
      const [eventDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

      setDays(prev => {
        const newDays = [...prev];

        // Update the event's day
        const eventDayIndex = newDays.findIndex(day => day.date === eventDate);
        if (eventDayIndex !== -1) {
          newDays[eventDayIndex] = { date: eventDate, events: eventDayEvents };
        } else {
          newDays.unshift({ date: eventDate, events: eventDayEvents });
        }

        // Update the previous day (if it exists in our display)
        const previousDayIndex = newDays.findIndex(day => day.date === previousDateStr);
        if (previousDayIndex !== -1) {
          newDays[previousDayIndex] = { date: previousDateStr, events: previousDayEvents };
        }

        return newDays;
      });

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const getLatestEventDefaults = async () => {
    if (!db) return { happiness: 0.7, wakefulness: 0.8, health: 0.9 };

    try {
      const latestEvent = await db.getLatestEvent();
      if (latestEvent) {
        return {
          happiness: latestEvent.happiness,
          wakefulness: latestEvent.wakefulness,
          health: latestEvent.health,
        };
      }
    } catch (error) {
      console.error('Failed to get latest event:', error);
    }

    return { happiness: 0.7, wakefulness: 0.8, health: 0.9 };
  };

  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.updateEvent(id, eventData);

      // Get the event date and previous date
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const previousDate = new Date(eventDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Refresh both the event's day and the previous day (for spanning events)
      const [eventDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

      setDays(prev => {
        const newDays = [...prev];

        // Update the event's day
        const eventDayIndex = newDays.findIndex(day => day.date === eventDate);
        if (eventDayIndex !== -1) {
          newDays[eventDayIndex] = { date: eventDate, events: eventDayEvents };
        }

        // Update the previous day (if it exists in our display)
        const previousDayIndex = newDays.findIndex(day => day.date === previousDateStr);
        if (previousDayIndex !== -1) {
          newDays[previousDayIndex] = { date: previousDateStr, events: previousDayEvents };
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

  const handleOpenAddDialog = async () => {
    if (!db) {
      setIsDialogOpen(true);
      return;
    }

    // Get defaults from latest event
    const defaults = await getLatestEventDefaults();
    setDefaultValues(defaults);
    setIsDialogOpen(true);
  };

  const handleExport = async () => {
    if (!db) return;

    try {
      await DataExporter.exportDatabase(db);
      setError('Export completed! Check your downloads folder for the JSON file.');

      // Clear success message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export database. Please try again.');
    }
  };

  const handleImportDatabase = async () => {
    if (!db) return;

    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validate file before importing
        const isValid = await DataExporter.validateExportFile(file);
        if (!isValid) {
          setError('Invalid export file. Please select a valid exocortex export file.');
          return;
        }

        await DataExporter.importDatabase(db, file);

        // Refresh the entire grid to show all imported events
        // Load recent days (similar to initial load)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Load past 7 days

        const daysWithEvents = await db.getEventsByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Also get today's events (should be included in range, but ensure it's there)
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = await db.getEventsByDate(today);

        // Combine and sort: today first, then past days in reverse chronological order
        const allDays = [
          { date: today, events: todayEvents }, // Today first (most recent)
          ...daysWithEvents.filter(day => day.date !== today).reverse() // Past days (excluding duplicate today)
        ];

        setDays(allDays);

        setError(`Successfully imported events from ${file.name}`);

        // Clear success message after 3 seconds
        setTimeout(() => setError(null), 3000);
      } catch (error) {
        console.error('Import failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to import database. Please try again.');
      }
    };

    input.click();
  };

  const handleGenerateTestData = async () => {
    if (!db) return;

    try {
      // Clear existing data first
      await db.clearAllEvents();

      // Categories for test data (excluding Sleep - we'll handle that specially)
      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];

      // Generate events for the past 30 days (excluding today)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago

      const events: Omit<ExocortexEvent, 'id'>[] = [];

      // Generate events for each day
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayEvents: Omit<ExocortexEvent, 'id'>[] = [];

        // Create sleep event that starts around 22:00 and lasts 7-8 hours
        const sleepStartHour = 20 + Math.floor(Math.random() * 3); // 20:00, 21:00, or 22:00
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random(); // 7-8 hours

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        // CRITICAL FIX: Ensure sleep events don't cross into today
        // If this is yesterday's sleep event, make sure it ends before today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        if (sleepEnd >= today) {
          // Adjust sleep duration to end before today
          const maxDuration = today.getTime() - sleepStart.getTime();
          const adjustedDurationHours = Math.max(6, (maxDuration / (60 * 60 * 1000)) - 0.5); // At least 6 hours
          sleepEnd = new Date(sleepStart.getTime() + adjustedDurationHours * 60 * 60 * 1000);
        }

        // Sleep event with typical sleep values
        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          happiness: 0.8, // Generally happy during sleep
          wakefulness: 0.1, // Very low wakefulness during sleep
          health: 0.9, // Good for health
        };

        dayEvents.push(sleepEvent);

        // Fill the rest of the day with other activities
        // We'll work around the sleep period

        // Morning activities (before sleep starts)
        const morningEnd = sleepStart.getTime();
        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0); // Start at 7:00 AM

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();

          // Don't create events too close to sleep time
          if (timeUntilSleep < 30 * 60 * 1000) break; // Less than 30 minutes before sleep

          // Random duration between 30 minutes and 3 hours, but don't exceed time until sleep
          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];

          // Morning mood values (generally good)
          const happiness = Math.random() * 0.4 + 0.5; // 0.5-0.9
          const wakefulness = Math.random() * 0.4 + 0.5; // 0.5-0.9
          const health = Math.random() * 0.3 + 0.6; // 0.6-0.9

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);

          // Move to next event time with some gap
          currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
        }

        // Evening activities (after sleep ends, on the next day) - ONLY if the next day is not today
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Only add evening activities if the next day is not today
        if (nextDay < today) {
          const eveningStart = new Date(Math.max(sleepEnd.getTime(), new Date(nextDay).setHours(7, 0, 0, 0)));
          const endOfDay = new Date(nextDay);
          endOfDay.setHours(23, 59, 59, 999);

          currentTime = new Date(eveningStart);

          while (currentTime < endOfDay) {
            const timeUntilEnd = endOfDay.getTime() - currentTime.getTime();

            // Don't create events too close to next sleep time
            const nextSleepStart = new Date(nextDay);
            nextSleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
            const timeUntilNextSleep = nextSleepStart.getTime() - currentTime.getTime();

            if (timeUntilNextSleep < 60 * 60 * 1000) break; // Less than 1 hour before next sleep

            // Random duration between 30 minutes and 3 hours
            const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilEnd, timeUntilNextSleep - 30 * 60 * 1000);
            if (maxDuration <= 0) break;

            const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
            const actualDuration = Math.min(durationMs, maxDuration);

            const category = categories[Math.floor(Math.random() * categories.length)];

            // Evening mood values (can be more variable)
            const happiness = Math.random() * 0.6 + 0.3; // 0.3-0.9
            const wakefulness = Math.random() * 0.5 + 0.3; // 0.3-0.8 (getting tired)
            const health = Math.random() * 0.4 + 0.5; // 0.5-0.9

            const eventEndTime = new Date(currentTime.getTime() + actualDuration);

            const event = {
              endTime: eventEndTime.getTime(),
              category,
              happiness,
              wakefulness,
              health,
            };

            dayEvents.push(event);

            // Move to next event time with some gap
            currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
          }
        }

        // Add all events for this day
        events.push(...dayEvents);
      }

      // Add all events to database
      for (const event of events) {
        await db.addEvent(event);
      }

      // Refresh the grid to show test data - reload past 30 days
      const testEndDate = new Date();
      testEndDate.setDate(testEndDate.getDate() - 1); // Yesterday
      const testStartDate = new Date();
      testStartDate.setDate(testStartDate.getDate() - 30); // 30 days ago

      const daysWithEvents = await db.getEventsByDateRange(
        testStartDate.toISOString().split('T')[0],
        testEndDate.toISOString().split('T')[0]
      );

      // Also get today's events (should be empty)
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = await db.getEventsByDate(today);

      // If today has events, log them for debugging (this should not happen)
      if (todayEvents.length > 0) {
        console.log('WARNING: Today has events when it should be empty:', todayEvents);
        // Clear any events that accidentally got created for today
        for (const event of todayEvents) {
          await db.deleteEvent(event.id);
        }
        // Refresh today's events after clearing
        const refreshedTodayEvents = await db.getEventsByDate(today);
        todayEvents.length = 0;
        todayEvents.push(...refreshedTodayEvents);
      }

      // Check if yesterday is missing and load it if needed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const hasYesterday = daysWithEvents.some(day => day.date === yesterdayStr);

      if (!hasYesterday) {
        const yesterdayEvents = await db.getEventsByDate(yesterdayStr);
        if (yesterdayEvents.length > 0) {
          daysWithEvents.push({ date: yesterdayStr, events: yesterdayEvents });
        }
      }

      // Sort daysWithEvents by date (newest first) before adding today
      daysWithEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Final structure: today first, then past days in reverse chronological order
      const allDays = [
        { date: today, events: todayEvents }, // Today first (most recent)
        ...daysWithEvents // Then past days (already sorted with yesterday first)
      ];

      setDays(allDays);

      setError(`Successfully generated ${events.length} test events for the past 30 days with realistic sleep patterns`);

      // Clear success message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Failed to generate test data:', error);
      setError('Failed to generate test data. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    if (!db) return;

    try {
      // Clear all events from database
      await db.clearAllEvents();

      // Clear the grid display
      const today = new Date().toISOString().split('T')[0];
      setDays([{ date: today, events: [] }]);
      setHasReachedHistoricalLimit(false);

      setError('All data has been cleared successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      setError('Failed to clear data. Please try again.');
    }
  };

  const confirmClearAllData = () => {
    handleClearAllData();
    setShowClearConfirm(false);
  };

  const cancelClearAllData = () => {
    setShowClearConfirm(false);
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
      {/* Header with import/export - mobile optimized */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-xl font-semibold text-white">
            Exocortex
          </h1>

          {/* Import/Export buttons - mobile responsive */}
          <div className="flex flex-wrap gap-2 justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-gray-700 border-gray-600 text-white"
              disabled={!db}
              title="Export data to JSON file"
            >
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportDatabase}
              className="bg-gray-700 border-gray-600 text-white"
              disabled={!db}
              title="Import data from JSON file"
            >
              <Upload className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTestData}
              className="bg-blue-700 border-blue-600 text-white"
              disabled={!db}
              title="Generate random test data for the past 30 days"
            >
              <Database className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Test</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="bg-red-700 border-red-600 text-white"
              disabled={!db}
              title="Clear all events from the database"
            >
              <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Clear</span>
            </Button>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className={`mt-3 px-3 py-2 rounded-md text-sm ${
            error.includes('Successfully')
              ? 'bg-green-900/20 border border-green-600 text-green-400'
              : 'bg-red-900/20 border border-red-600 text-red-400'
          }`}>
            {error}
          </div>
        )}
      </div>

      {/* Grid container - mobile optimized */}
      <div
        ref={gridRef}
        className="relative overflow-auto bg-gray-900 border border-gray-700 rounded-lg exocortex-grid"
        style={{
          height: 'calc(100vh - 100px)', // More space - button should be immediately visible
          width: '100%',
        }}
      >
        {/* Inject responsive styles */}
        <style>{responsiveStyles}</style>
        {/* Hour headers - mobile optimized */}
        <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700">
          <div className="flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
            {hourSlots.map((hour, index) => (
              <div
                key={hour}
                className="text-xs md:text-sm text-gray-400 border-r border-gray-700 px-1 md:px-2 py-1 text-center flex-shrink-0 select-none"
                style={{
                  width: `var(--hour-width)`,
                }}
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
              }}
            >
              {/* Date label - mobile optimized */}
              <div className="absolute left-2 top-2 text-xs md:text-sm text-gray-400 z-20 select-none">
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>

              {/* Grid lines */}
              <div className="absolute inset-0 flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {Array.from({ length: HOURS_IN_DAY }).map((_, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="border-r border-gray-800 flex-shrink-0"
                    style={{
                      width: `var(--hour-width)`,
                    }}
                  />
                ))}
              </div>

              {/* Events - mobile optimized */}
              <div className="absolute inset-0" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {getEventsForDay(day, days).map((event, eventIndex) => {
                  // For span events, we need to find the original event in its day's events array
                  const originalEventId = event.id.replace(/-span-.*$/, '');
                  const originalDay = days.find(d => d.events.some(e => e.id === originalEventId));
                  const originalEvents = originalDay?.events || [];
                  const originalEventIndex = originalEvents.findIndex(e => e.id === originalEventId);

                  // Get all events for this day for proper timing calculation
                  const dayEvents = getEventsForDay(day, days);

                  // Calculate the actual start time for this event
                  let eventStartTime: number;
                  if (eventIndex === 0) {
                    // First event of the day - use the calculated start time
                    eventStartTime = getEventStartTime(
                      { ...event, id: originalEventId },
                      originalEvents,
                      originalEventIndex
                    );
                  } else {
                    // Subsequent events - start immediately after the previous event ends
                    eventStartTime = dayEvents[eventIndex - 1].endTime;
                  }

                  const portionType = getEventPortionType(
                    { ...event, id: originalEventId }, // Use original ID for portion calculation
                    day.date,
                    originalEvents,
                    originalEventIndex
                  );

                  // Only render the event portion if it's relevant for this day
                  if (portionType === 'middle') {
                    // Skip middle portions for now to avoid visual clutter
                    // We could show them with a different style if needed
                    return null;
                  }

                  // Calculate the style with the proper start time
                  const eventStyle = calculateEventPortionWithStartTime(
                    { ...event, id: originalEventId },
                    day.date,
                    eventStartTime,
                    event.endTime,
                    portionType
                  );

                  return (
                    <div
                      key={`${event.id}-${day.date}`}
                      className="absolute top-2 h-16 rounded-md border border-gray-600 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
                      style={eventStyle}
                      onClick={() => handleEventClick({ ...event, id: originalEventId })} // Use original event for click handler
                    >
                      <div className="p-2 h-full flex flex-col items-center justify-center text-center">
                        <div className="text-xs font-medium truncate w-full mb-1" style={{ color: getTextColor(event) }}>
                          {event.category}
                          {portionType !== 'full' && (
                            <span className="ml-1 opacity-70">
                              ({portionType === 'start' ? '→' : portionType === 'end' ? '←' : '↔'})
                            </span>
                          )}
                        </div>
                        <SmileyFace
                          health={event.health}
                          wakefulness={event.wakefulness}
                          happiness={event.happiness}
                          size={20}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Loading trigger for infinite scroll */}
          <div ref={loadingRef} className="h-20 flex items-center justify-center">
            {loading && (
              <div className="text-muted-foreground">Loading more days...</div>
            )}
            {hasReachedHistoricalLimit && !loading && (
              <div className="text-muted-foreground text-sm">
                Reached historical limit (10 years)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating add button - mobile optimized */}
      <button
        onClick={handleOpenAddDialog}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50 touch-manipulation"
        style={{
          // Ensure button stays within safe areas on mobile
          paddingBottom: 'env(safe-area-inset-bottom, 1rem)',
          paddingRight: 'env(safe-area-inset-right, 1rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Event dialog */}
      <EventDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
        defaultValues={defaultValues}
      />

      {/* Clear Database Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Entire Database</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-300">
              This will delete the entire database. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelClearAllData}
              className="bg-gray-700 border-gray-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearAllData}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}