/**
 * ExocortexGrid.tsx - Main Time Tracking Grid Component
 *
 * This is the core component of the time tracking application.
 * It displays events in a visual grid where:
 * - X-axis represents hours of the day (24 hours)
 * - Y-axis represents different days (today at top, past days below)
 * - Colored blocks represent events with different categories
 * - Smiley faces show mood during each event
 *
 * Features handled by this component:
 * - Display events in a responsive grid layout
 * - Add, edit, and delete events
 * - Infinite scroll to load historical data
 * - Import/export functionality
 * - Test data generation
 * - Mobile-responsive design
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExocortexEvent, DayEvents, ExocortexDB, getEventColor, getHourSlots } from '@/lib/exocortex';
import { useAppContext } from '@/hooks/useAppContext';
import { SmileyFace } from './SmileyFace';
import { EventDialog } from '@/components/EventDialog';
import { DayOverviewDialog } from '@/components/DayOverviewDialog';


/**
 * Grid Layout Constants
 *
 * These values define the visual structure of our time grid:
 */

const HOURS_IN_DAY = 24; // Total hours in a day (24-hour format)
const HOUR_WIDTH = 60; // Width of each hour block on desktop (60 pixels)
const MOBILE_HOUR_WIDTH = 30; // Width of each hour block on mobile (30 pixels, smaller to fit screen)

/**
 * Responsive CSS Styles
 *
 * We use CSS custom properties (CSS variables) to make grid responsive.
 * This allows us to change the hour width based on screen size
 * without recalculating everything in JavaScript.
 */
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

const ROW_HEIGHT = 80; // Height of each day row in pixels - balanced for both mobile and desktop visibility

/**
 * Component Props Interface
 *
 * TypeScript interface that defines what props this component accepts.
 */
interface ExocortexGridProps {
  className?: string;
  refreshTrigger?: number;
  setRefreshTrigger?: (number)=>void;
  skipDate?: Date|null;
  db?: ExocortexDB | null;
}

/**
 * Main ExocortexGrid Component
 *
 * This is the main component function that renders our time tracking grid.
 * It manages all state related to events, database operations, and UI interactions.
 */
export function ExocortexGrid({ className, refreshTrigger, setRefreshTrigger, db, skipDate}: ExocortexGridProps) {
  const { config } = useAppContext();
  const [_error, setError] = useState<string | null>(null);
  const [_currentDate, setCurrentDate] = useState(new Date()); 
  const [lastDayCheck, setLastDayCheck] = useState(new Date());

  // Array containing events grouped by day
  const [days, setDays] = useState<DayEvents[]>([]);

  // Debug helper: log date sequences whenever days change
  useEffect(() => {
    if (days.length === 0) return;
    const seq = days.map(d => d.date).join(' -> ');
    console.log('[ExocortexGrid] days sequence:', seq);
  }, [days]);

  // Loading state for showing loading indicators as we fill that days array
  const [loading, setLoading] = useState(true);

  // Drag-to-Scroll State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const dragThreshold = 5; // 5 pixels minimum movement to consider it a drag
  

  //Some state for the edit event dialog
  const [_isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Reference to the main grid container (for scrolling and measurements)
  const gridRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll functionality
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reference to the loading trigger element at bottom of grid
  const loadingRef = useRef<HTMLDivElement>(null);



  //Initialize at start 
  useEffect(() => {
    const initAll = async () => {
      console.log("Grid Init with Db ",db);
      if (!db) return;

      // Init our days cache
      // Calculate how many days we need to fill the screen
      // Assuming each row is 80px tall and screen height is available
      const screenHeight = window.innerHeight - 100; // Account for header and button
      const rowsNeeded = Math.ceil(screenHeight / 80) + 2; // +2 for extra scroll buffer
      const daysToLoad = Math.max(7, rowsNeeded); // At least 7 days

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysToLoad + 1); // Go back enough days to fill screen

      // Get only days that actually have events in this range
      const daysWithEvents = await db.getEventsByDateRangeOnly(
        startDate.toISOString().split('T')[0],
        todayStr
      );

      // Build a continuous list of calendar days between startDate and today
      const dayMap = new Map<string, DayEvents>();
      daysWithEvents.forEach(d => dayMap.set(d.date, d));

      const allDays: DayEvents[] = [];
      const cursor = new Date(today);
      while (cursor >= startDate) {
        const dateStr = cursor.toISOString().split('T')[0];
        const existing = dayMap.get(dateStr);
        if (existing) {
          allDays.push(existing);
        } else {
          allDays.push({ date: dateStr, events: [] });
        }
        cursor.setDate(cursor.getDate() - 1);
      }

      // allDays is built newest-first (today downwards)
      setDays(allDays);

      // Hide loading indicator once data is loaded
      setLoading(false);

    };

    // Execute initialization and handle any errors
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [db]); 



  //Initalize when days change
  useEffect(() => {
    const initDaysChange = async () => {
      if (!loadingRef.current || !db || !gridRef.current) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loading) {
            const loadMoreDays = async () => {
              setLoading(true);
              // Use the earliest date we have loaded so far (last in the array)
              const oldestDay = days[days.length - 1];
              const oldestDate = oldestDay ? new Date(oldestDay.date + 'T00:00:00') : new Date();

              // Normalise oldestDate to midnight so ranges line up exactly
              oldestDate.setHours(0, 0, 0, 0);

              // Don't load data from more than 10 years ago
              const tenYearsAgo = new Date();
              tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

              if (oldestDate < tenYearsAgo) {
                setLoading(false);
                return;
              }

              // Calculate the range for new days (load 7 days for better coverage)
              const daysToLoad = 7;
              const fromDate = new Date(oldestDate);
              fromDate.setDate(fromDate.getDate() - daysToLoad + 1); // Go back N-1 days from oldest

              // Get ALL days in the range (both with and without events)
              const allDaysInRange = await db.getEventsByDateRangeOnly(
                fromDate.toISOString().split('T')[0],
                oldestDate.toISOString().split('T')[0]
              );

              // Build a complete list of days for [fromDate..oldestDate]
              const dayMap = new Map<string, DayEvents>();
              allDaysInRange.forEach(d => dayMap.set(d.date, d));

              const completeDays: DayEvents[] = [];
              const cursor = new Date(fromDate);
              while (cursor <= oldestDate) {
                const dateStr = cursor.toISOString().split('T')[0];
                const existing = dayMap.get(dateStr);
                if (existing) {
                  completeDays.push(existing);
                } else {
                  completeDays.push({ date: dateStr, events: [] });
                }
                cursor.setDate(cursor.getDate() + 1);
              }

              // Filter out days we already have and sort newest-first to
              // match the main grid ordering (today at top, older below)
              const existingDates = new Set(days.map(d => d.date));
              const newDays = completeDays
                .filter(day => !existingDates.has(day.date))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              if (newDays.length > 0) {
                setDays(prev => {
                  // Re-check against the latest prev inside setState to
                  // avoid races where `days` changed between building
                  // existingDates and this update.
                  const latestExisting = new Set(prev.map(d => d.date));
                  const deduped = newDays.filter(d => !latestExisting.has(d.date));
                  return deduped.length > 0 ? [...prev, ...deduped] : prev;
                });
              }

              setLoading(false);
            };

            loadMoreDays().catch((error) => {
              console.error('Error in loadMoreDays:', error);
              setLoading(false);
              setError('Failed to load more days. Please try again.');
            });
          }
        },
        {
          root: gridRef.current,
          threshold: 0.1,
        }
      );

      observerRef.current.observe(loadingRef.current);

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    };

    // Execute initialization and handle any errors
    initDaysChange().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [loading, db, days]); 


  // Refresh grid when refreshTrigger changes
  useEffect(() => {
    console.log("Triggered Refresh Of Grid");
    if (refreshTrigger && db) {
      const refreshData = async () => {
        setLoading(true);

        try {
          const today = new Date().toISOString().split('T')[0];
          const todayEvents = await db.getEventsByDate(today);

          if (todayEvents.length === 0) {
            // Database was empty, load initial data (same logic as first mount)
            const screenHeight = window.innerHeight - 100;
            const rowsNeeded = Math.ceil(screenHeight / 80) + 2;
            const daysToLoad = Math.max(7, rowsNeeded);

            const todayDate = new Date();
            const todayStr = todayDate.toISOString().split('T')[0];
            const startDate = new Date(todayDate);
            startDate.setDate(startDate.getDate() - daysToLoad + 1);

            const daysWithEvents = await db.getEventsByDateRangeOnly(
              startDate.toISOString().split('T')[0],
              todayStr
            );

            const dayMap = new Map<string, DayEvents>();
            daysWithEvents.forEach(d => dayMap.set(d.date, d));

            const allDays: DayEvents[] = [];
            const cursor = new Date(todayDate);
            while (cursor >= startDate) {
              const dateStr = cursor.toISOString().split('T')[0];
              const existing = dayMap.get(dateStr);
              if (existing) {
                allDays.push(existing);
              } else {
                allDays.push({ date: dateStr, events: [] });
              }
              cursor.setDate(cursor.getDate() - 1);
            }

            setDays(allDays);
          } else {
            // Database has data, just refresh current view
            const currentDayDates = days.map(d => d.date);
            const refreshFrom = new Date();
            refreshFrom.setDate(refreshFrom.getDate() - 30);

            const daysWithEvents = await db.getEventsByDateRangeOnly(
              refreshFrom.toISOString().split('T')[0],
              today
            );

            const updatedDays = daysWithEvents
              .filter(day => currentDayDates.includes(day.date))
              .sort((a, b) => {
                const aDate = new Date(a.date);
                const bDate = new Date(b.date);
                return bDate.getTime() - aDate.getTime();
              });

            setDays(updatedDays);
          }
        } catch (error) {
          console.error('Failed to refresh grid:', error);
          setError('Failed to refresh data. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      refreshData();
    }
  }, [refreshTrigger, db, days]);


  useEffect(() => {
    const checkSkipDate = async () => {
      if (!skipDate || !db) return;

      try {
        console.log('[ExocortexGrid] checkSkipDate called with', skipDate.toISOString().split('T')[0]);

        // Determine a small initial window after the top date so we don't
        // render the entire history. Similar behavior to Summary: a fixed
        // number of days around the jump point.
        const INITIAL_WINDOW_DAYS = 50; // can tweak; small for perf

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Clamp topDate so it can never be in the future
        const rawTopDate = new Date(skipDate);
        rawTopDate.setHours(0, 0, 0, 0);
        const topDate = rawTopDate > today ? new Date(today) : rawTopDate;

        // Build a window that goes INITIAL_WINDOW_DAYS-1 days into the past
        const to = new Date(topDate);
        const from = new Date(topDate);
        from.setDate(from.getDate() - (INITIAL_WINDOW_DAYS - 1));

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0] <= todayStr ? to.toISOString().split('T')[0] : todayStr;

        const rangeDays = await db.getEventsByDateRangeOnly(fromStr, toStr);

        // Build a complete day list for [from..to]
        const dayMap = new Map<string, DayEvents>();
        rangeDays.forEach(d => dayMap.set(d.date, d));

        const allDays: DayEvents[] = [];
        const cursor = new Date(from);
        while (cursor <= to && cursor <= today) {
          const dateStr = cursor.toISOString().split('T')[0];
          const existing = dayMap.get(dateStr);
          if (existing) {
            allDays.push(existing);
          } else {
            allDays.push({ date: dateStr, events: [] });
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        // Order newest-first: [topDate, topDate-1, ...]
        allDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setDays(allDays);

        // Reset scroll back to top so the selected day is visible
        if (gridRef.current) {
          gridRef.current.scrollTop = 0;
        }
      } catch (error) {
        console.error('Failed to skip to date:', error);
      }
    };

    checkSkipDate();
  }, [skipDate, db]);


  /**
   * Handle edit-event dialog
   */
  const handleDialogOpenChange = (open: boolean) => { if (!open) setEditingEvent(null); };
  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;
    await db.updateEvent(id, eventData);
    setEditingEvent(null);
    console.log("Updating event ",setRefreshTrigger);
    if(setRefreshTrigger!=null){
      setRefreshTrigger(f => f + 1);
    }
  };
  const handleDeleteEvent = async (id: string) => {
    if (!db) return;
    await db.deleteEvent(id);
    setEditingEvent(null);
    if(setRefreshTrigger!=null){
      setRefreshTrigger(f => f + 1);
    }
  };

  /**
   * Drag-to-Scroll Event Handlers
   *
   * These handlers implement the drag-to-scroll functionality for the grid.
   * This allows users to click and drag to navigate the large time grid.
   */
  // Handle mouse down - start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only exclude certain UI controls, but allow dragging over events and other elements
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }

    e.preventDefault();

    const grid = gridRef.current;
    if (!grid) return;

    // Clear any existing drag reset timeout
    if (dragResetTimeoutRef.current) {
      clearTimeout(dragResetTimeoutRef.current);
      dragResetTimeoutRef.current = null;
    }

    setIsDragging(true);
    setHasDragged(false); // Reset drag movement tracking
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      left: grid.scrollLeft,
      top: grid.scrollTop
    });

    // Add cursor style to indicate dragging
    grid.style.cursor = 'grabbing';
    grid.style.userSelect = 'none';
    grid.style.webkitUserSelect = 'none';
  }, []);

  // Handle mouse move - update scroll while dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const grid = gridRef.current;
    if (!grid) return;

    // Calculate the distance moved
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Check if we've moved beyond the drag threshold
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance >= dragThreshold && !hasDragged) {
      setHasDragged(true);
    }

    // Update scroll position
    grid.scrollLeft = scrollStart.left - deltaX;
    grid.scrollTop = scrollStart.top - deltaY;
  }, [isDragging, dragStart, scrollStart, hasDragged, dragThreshold]);

  // Timeout ref for delayed reset
  const dragResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse up - stop dragging
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    const grid = gridRef.current;
    if (grid) {
      // Reset cursor style
      grid.style.cursor = '';
      grid.style.userSelect = '';
      grid.style.webkitUserSelect = '';
    }

    setIsDragging(false);

    // Clear any existing timeout
    if (dragResetTimeoutRef.current) {
      clearTimeout(dragResetTimeoutRef.current);
    }

    // Delay resetting hasDragged to prevent click events from firing
    dragResetTimeoutRef.current = setTimeout(() => {
      setHasDragged(false);
      dragResetTimeoutRef.current = null;
    }, 100); // 100ms delay to ensure click events are blocked
  }, [isDragging]);

  // Handle mouse leave - stop dragging when mouse leaves the grid
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) return;

    const grid = gridRef.current;
    if (grid) {
      // Reset cursor style
      grid.style.cursor = '';
      grid.style.userSelect = '';
      grid.style.webkitUserSelect = '';
    }

    setIsDragging(false);

    // Clear any existing timeout
    if (dragResetTimeoutRef.current) {
      clearTimeout(dragResetTimeoutRef.current);
    }

    // Delay resetting hasDragged to prevent click events from firing
    dragResetTimeoutRef.current = setTimeout(() => {
      setHasDragged(false);
      dragResetTimeoutRef.current = null;
    }, 100); // 100ms delay to ensure click events are blocked
  }, [isDragging]);



  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragResetTimeoutRef.current) {
        clearTimeout(dragResetTimeoutRef.current);
      }
    };
  }, []);

  // Global mouse up handler - ensure dragging stops even if mouse is released outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseUp]);

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
      const eventEndTime = new Date(event.endTime);
      const eventDate = new Date(eventEndTime);
      eventDate.setHours(0, 0, 0, 0); // 00:00 (midnight) start of day

      return eventDate.getTime();
    } else {
      // For all other events, start immediately after the previous event ends
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
      backgroundColor: getEventColor(event, config.colorOverrides),
    };
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


  // Calculate text color based on background brightness
  const getTextColor = (event: ExocortexEvent) => {
    const color = getEventColor(event, config.colorOverrides);

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



  // Handle click on events - only trigger if it's a true click, not a drag
  const handleEventClickWithDragCheck = useCallback((event: ExocortexEvent) => {
    // Only trigger event click if we haven't just finished dragging
    if (!hasDragged) {
      // Define the click handler inline to avoid hoisting issues
      setEditingEvent(event);
      setIsDialogOpen(true);
    }
  }, [hasDragged]);



  // Check for day changes and update grid accordingly
  useEffect(() => {
    const checkDayChange = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Check if day has changed since last check
      if (now.getDate() !== lastDayCheck.getDate() || now.getMonth() !== lastDayCheck.getMonth() || now.getFullYear() !== lastDayCheck.getFullYear()) {

        // Check if today's date is already in our days array
        const hasToday = days.some(day => day.date === today);

        if (!hasToday && db) {
          // Add today's date to the top of the array
          setDays(prev => {
            const newDays = [{ date: today, events: [] }, ...prev];
            // Update the current date reference
            setCurrentDate(now);
            setLastDayCheck(now);
            return newDays;
          });
        } else {
          // Just update the date references
          setCurrentDate(now);
          setLastDayCheck(now);
        }
      }
    };

    // Check every minute for day changes
    const interval = setInterval(checkDayChange, 600000); // Check every ten minutes

    // Also check immediately on mount
    checkDayChange();

    return () => clearInterval(interval);
  }, [days, db, lastDayCheck]);

  if (loading && days.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Day overview dialog */}
      <DayOverviewDialog
        open={!!selectedDateKey}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDateKey(null);
          }
        }}
        dateKey={selectedDateKey}
        db={db ?? null}
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
      {/* Dialog for edit events */}
      <EventDialog
        open={!!editingEvent}
        onOpenChange={handleDialogOpenChange}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
      />
      {/* Grid container - mobile optimized */}
      <div
        ref={gridRef}
        className="relative overflow-auto bg-background border border-border rounded-lg exocortex"
        style={{
          height: 'calc(100vh - 100px)', // More space - button should be immediately visible
          width: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Inject responsive styles */}
        <style>{responsiveStyles}</style>
        {/* Hour headers - mobile optimized */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
            {hourSlots.map((hour, _index) => (
              <div
                key={hour}
                className="text-xs md:text-sm text-muted-foreground border-r border-border px-1 md:px-2 py-1 text-center flex-shrink-0 select-none"
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
          {days.map((day, _dayIndex) => (
            <div
              key={day.date}
              data-day={day.date}
              className="relative border-b border-border"
              style={{
                height: `${ROW_HEIGHT}px`,
              }}
            >
              {/* Date label - mobile optimized */}
              <button
                type="button"
                className="absolute left-2 -top-1 text-xs md:text-sm text-muted-foreground z-20 select-none hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-transparent"
                onClick={() => setSelectedDateKey(day.date)}
              >
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </button>

              {/* Grid lines */}
              <div className="absolute inset-0 flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {Array.from({ length: HOURS_IN_DAY }).map((_, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="border-r border-border flex-shrink-0"
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
                      className="absolute top-2 h-16 rounded-md border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
                      style={eventStyle}
                      onClick={() => handleEventClickWithDragCheck({ ...event, id: originalEventId })} // Use drag-aware click handler
                    >
                      <div className="p-0 h-full flex flex-col items-center justify-center text-center">
                        <div className="text-xs font-medium truncate w-full mb-0.5" style={{ color: getTextColor(event) }}>
                          {event.category}
                          {portionType !== 'full' && (
                            <span className="ml-1 opacity-70">
                              ({portionType === 'start' ? '→' : portionType === 'end' ? '←' : '↔'})
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <SmileyFace
                            health={event.health}
                            wakefulness={event.wakefulness}
                            happiness={event.happiness}
                            size={27}
                          />
                        </div>
                        {event.notes ? (
                          <div
                            className="text-xs truncate w-full mt-0.5 leading-tight"
                            style={{ color: getTextColor(event), opacity: 0.9 }}
                            title={event.notes}
                          >
                            {event.notes.length > 20 ? `${event.notes.slice(0, 20)}…` : event.notes}
                          </div>
                        ) : (
                          <div className="text-xs truncate w-full mt-0.5 leading-tight">
                            &nbsp;
                          </div>
                        )}
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
          </div>
        </div>
      </div>
    </div>
  );
}
