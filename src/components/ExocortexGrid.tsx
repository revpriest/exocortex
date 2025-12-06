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

  // Track whether the initial window has been loaded from "today"
  const [hasInitialisedFromToday, setHasInitialisedFromToday] = useState(false);

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



  //Initialize at start from "today" only if we do not have a skipDate
  useEffect(() => {
    const initAll = async () => {
      console.log('Grid Init with Db', db, 'skipDate =', skipDate?.toISOString().split('T')[0]);
      if (!db) return;
      if (skipDate) {
        // When a skipDate is provided, let the skipDate effect build the window.
        setLoading(false);
        return;
      }

      // Init our days cache
      const screenHeight = window.innerHeight - 100; // Account for header and button
      const rowsNeeded = Math.ceil(screenHeight / 80) + 2; // +2 for extra scroll buffer
      const daysToLoad = Math.max(7, rowsNeeded); // At least 7 days

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysToLoad + 1); // Go back enough days to fill screen

      const daysWithEvents = await db.getEventsByDateRangeOnly(
        startDate.toISOString().split('T')[0],
        todayStr
      );

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

      setDays(allDays);
      setHasInitialisedFromToday(true);
      setLoading(false);
    };

    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [db, skipDate]);



  //Initalize infinite scroll observer when days change
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

              const allDaysInRange = await db.getEventsByDateRangeOnly(
                fromDate.toISOString().split('T')[0],
                oldestDate.toISOString().split('T')[0]
              );

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

              const existingDates = new Set(days.map(d => d.date));
              const newDays = completeDays
                .filter(day => !existingDates.has(day.date))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              if (newDays.length > 0) {
                setDays(prev => {
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

    initDaysChange().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [loading, db, days]);


  // Refresh grid when refreshTrigger changes (does not touch skipDate)
  useEffect(() => {
    console.log('Triggered Refresh Of Grid');
    if (refreshTrigger && db) {
      const refreshData = async () => {
        setLoading(true);

        try {
          const today = new Date().toISOString().split('T')[0];
          const todayEvents = await db.getEventsByDate(today);

          if (todayEvents.length === 0) {
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


  // Apply skipDate window whenever a skipDate is provided
  useEffect(() => {
    const checkSkipDate = async () => {
      if (!skipDate || !db) return;

      try {
        const key = skipDate.toISOString().split('T')[0];
        console.log('[ExocortexGrid] checkSkipDate called with', key);

        const INITIAL_WINDOW_DAYS = 50;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const rawTopDate = new Date(skipDate);
        rawTopDate.setHours(0, 0, 0, 0);
        const topDate = rawTopDate > today ? new Date(today) : rawTopDate;

        const to = new Date(topDate);
        const from = new Date(topDate);
        from.setDate(from.getDate() - (INITIAL_WINDOW_DAYS - 1));

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0] <= todayStr ? to.toISOString().split('T')[0] : todayStr;

        const rangeDays = await db.getEventsByDateRangeOnly(fromStr, toStr);

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

        allDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setDays(allDays);

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

  // [rest of the file unchanged ...]
