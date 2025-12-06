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


  //Initialize at start (only when no skipDate is requested)
  useEffect(() => {
    const initAll = async () => {
      console.log('[ExocortexGrid] Initialising with db', !!db, 'skipDate', skipDate?.toISOString?.());
      if (!db) return;
      // If a skipDate is already set, we let the skip effect build the
      // window instead of doing the default today-based window.
      if (skipDate) {
        console.log('[ExocortexGrid] Skipping initial today window because skipDate is set');
        setLoading(false);
        return;
      }

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
      console.log('[ExocortexGrid] Initial load date window', { startDate: startDate.toISOString().split('T')[0], todayStr });

      // Get only days that actually have events in this range
      const daysWithEvents = await db.getEventsByDateRangeOnly(
        startDate.toISOString().split('T')[0],
        todayStr
      );
      console.log('[ExocortexGrid] Initial load daysWithEvents', daysWithEvents.map(d => d.date));

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
      console.log('[ExocortexGrid] Initial allDays sequence', allDays.map(d => d.date));
      setDays(allDays);

      // Hide loading indicator once data is loaded
      setLoading(false);

    };

    // Execute initialization and handle any errors
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [db, skipDate]);



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


  // Refresh grid when refreshTrigger changes. Do not clobber a view
  // that was just created by skip-to-date; if skipDate is set, we
  // assume the user wants to stay on that window and skip refresh.
  useEffect(() => {
    console.log('[ExocortexGrid] Refresh trigger changed to', refreshTrigger);
    if (!db) return;
    if (skipDate) {
      console.log('[ExocortexGrid] Skipping refresh because skipDate is active');
      return;
    }
    if (!refreshTrigger) return;

    const refreshData = async () => {
      setLoading(true);

      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('[ExocortexGrid] Refresh: checking today events for', today);
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
          console.log('[ExocortexGrid] Refresh: reloading window', {
            start: startDate.toISOString().split('T')[0],
            end: todayStr,
            count: daysWithEvents.length,
          });

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
              // Keep newest dates first

              const aDate = new Date(a.date);
              const bDate = new Date(b.date);
              return bDate.getTime() - aDate.getTime();
            });

          setDays(updatedDays);
        }
      } catch (error) {
        console.error('[ExocortexGrid] Failed to refresh grid:', error);
        setError('Failed to refresh data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    refreshData();
  }, [refreshTrigger, db, days, skipDate]);


  // Skip-to-date navigation: if skipDate changes, rebuild days so that
  // the selected date is at the top of the grid. We run this after
  // the initial load, so we guard against running while `loading`.
  useEffect(() => {
    const checkSkipDate = async () => {
      if (!skipDate || !db) return;
      if (loading) {
        console.log('[ExocortexGrid] checkSkipDate called while loading; waiting for initial load to finish');
        return;
      }

      try {
        console.log('[ExocortexGrid] checkSkipDate triggered with', skipDate.toISOString());

        // Determine a small initial window after the top date so we don't
        // render the entire history. Similar behavior to Summary: a fixed
        // number of days around the jump point.
        const INITIAL_WINDOW_DAYS = 50; // can tweak; small for perf
        const DATE_LOOKBACK       = 0;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // We want the skipped-to date to be the new "top" of the grid,
        // and then load days after it as the user scrolls.
        const topDate = new Date(skipDate); // clone
        topDate.setHours(0, 0, 0, 0);
        topDate.setDate(topDate.getDate() - DATE_LOOKBACK)
        console.log('[ExocortexGrid] Calculated topDate for skip', topDate.toISOString().split('T')[0]);

        // We want to look *backwards* from the chosen date, so build a
        // window that goes N-1 days into the past.
        const to = new Date(topDate); // newest day in this window
        const from = new Date(topDate);
        from.setDate(from.getDate() - (INITIAL_WINDOW_DAYS - 1)); // older

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0] <= todayStr ? to.toISOString().split('T')[0] : todayStr;
        console.log('[ExocortexGrid] Skip date window', { fromStr, toStr, todayStr });

        const rangeDays = await db.getEventsByDateRangeOnly(fromStr, toStr);
        console.log('[ExocortexGrid] rangeDays for skip', rangeDays.map(d => d.date));

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

        // For skip-to-date view we want the chosen date at the top
        // and then earlier days underneath going backwards in time.
        // Since `from` is already `topDate` and we increment `cursor`
        // forwards, allDays is naturally in ascending order
        // Now we want days ordered as [topDate, topDate-1, topDate-2, ...]
        // i.e. newest at index 0, then going backwards in time.
        allDays.sort((a, b) => {
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return bDate - aDate; // newest first
        });
        console.log('[ExocortexGrid] allDays after sort (newest first)', allDays.map(d => d.date));

        // Filter to only dates up to and including the chosen topDate,
        // then we already have the desired order: [topDate, older...].
        const filtered = allDays.filter(d => new Date(d.date) <= topDate);
        console.log('[ExocortexGrid] filtered days for skipDate', {
          topDate: topDate.toISOString().split('T')[0],
          dates: filtered.map(d => d.date),
        });
        setDays(filtered);

        // Reset scroll back to top so the selected day is visible
        if (gridRef.current) {
          gridRef.current.scrollTop = ROW_HEIGHT*DATE_LOOKBACK;
          console.log('[ExocortexGrid] ScrollTop set after skip:', gridRef.current.scrollTop);
        }
      } catch (error) {
        console.error('[ExocortexGrid] Failed to skip to date:', error);
      }
    };

    checkSkipDate();
  }, [skipDate, db, loading]);


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
    setScrollStart({ left: grid.scrollLeft, top: grid.scrollTop });
  }, []);

  // ... rest of the file unchanged ...
